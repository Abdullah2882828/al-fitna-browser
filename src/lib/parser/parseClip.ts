import { ClipPayloadV1, ClipBlockV1 } from '../clipCodec';
import { inferFilename } from './filenames';
import { parseAsciiTree } from './tree';
import { sanitizePath, removeCommonRoot } from './sanitizePath';

export interface ParsedProjectFile {
  path: string;
  content: string;
  confidence: 'high' | 'medium' | 'low';
  warnings: string[];
  lang?: string;
}

export interface ParsedProjectResult {
  projectName: string;
  files: ParsedProjectFile[];
  sourceUrl?: string;
  sourceTitle?: string;
  sourceHost?: string;
  treeFound: boolean;
  warnings: string[];
}

/**
 * Checks for syntax anomalies like unbalanced brackets or premature truncation
 */
function checkCodeQuality(content: string): string[] {
  const warnings: string[] = [];

  if (!content || !content.trim()) {
    warnings.push('الملف فارغ لا يحتوي على أي أسطر كود.');
    return warnings;
  }

  // Count braces
  const openBraces = (content.match(/{/g) || []).length;
  const closeBraces = (content.match(/}/g) || []).length;
  if (openBraces > closeBraces + 2) {
    warnings.push('احتمال وجود كود مبتور أو أقواس معقوفة مفتوحة غير مغلقة {}.');
  }

  const openParens = (content.match(/\(/g) || []).length;
  const closeParens = (content.match(/\)/g) || []).length;
  if (openParens > closeParens + 2) {
    warnings.push('احتمال وجود أقواس دائرية مفتوحة غير مغلقة ().');
  }

  return warnings;
}

/**
 * Checks for referenced imports that are missing from the project files
 */
function checkMissingImports(files: ParsedProjectFile[]) {
  const knownPaths = new Set(files.map(f => f.path.toLowerCase()));

  for (const file of files) {
    const importRegex = /(?:import\s+.*?from\s+['"]|require\s*\(\s*['"])([.][^'"]+)['"]/g;
    let match;
    while ((match = importRegex.exec(file.content)) !== null) {
      const relImport = match[1];
      // Normalize imported target
      const targetBase = relImport.replace(/^\.\//, '').toLowerCase();
      const hasMatch = Array.from(knownPaths).some(p => p.includes(targetBase));
      if (!hasMatch) {
        file.warnings.push(`يشير إلى استيراد ملف "${relImport}" غير موجود في قائمة الملفات المستوردة.`);
      }
    }
  }
}

/**
 * Parse structured ClipPayloadV1 into clean project files
 */
export function parseClipPayload(payload: ClipPayloadV1): ParsedProjectResult {
  const generalWarnings: string[] = [];
  const rawFiles: ParsedProjectFile[] = [];

  // 1. Check if any block is an ASCII directory tree
  let treePaths: string[] = [];
  let treeFound = false;

  for (const block of payload.blocks) {
    const treeScan = parseAsciiTree(block.code);
    if (treeScan.hasTree) {
      treeFound = true;
      treePaths = treeScan.filePaths;
      break;
    }
  }

  // 2. Process blocks
  const matchedTreeIndices = new Set<number>();

  payload.blocks.forEach((block, idx) => {
    // If this block is purely the tree diagram itself, don't save as code file unless user wants
    const treeCheck = parseAsciiTree(block.code);
    if (treeCheck.hasTree && treeCheck.filePaths.length > 2) {
      return; // Skip tree diagram block from code files
    }

    const inferred = inferFilename(block.i, block.hdr, block.hint, block.code, block.lang);
    let finalPath = inferred.path;
    let confidence = inferred.confidence;
    const fileWarnings = inferred.warning ? [inferred.warning] : [];

    // If low confidence and we have a tree, attempt tree matching
    if (confidence === 'low' && treePaths.length > 0) {
      const blockExt = inferred.path.split('.').pop()?.toLowerCase();
      // Find unused tree path with same extension
      for (let tIdx = 0; tIdx < treePaths.length; tIdx++) {
        if (!matchedTreeIndices.has(tIdx)) {
          const tPath = treePaths[tIdx];
          const tExt = tPath.split('.').pop()?.toLowerCase();
          if (tExt && tExt === blockExt) {
            finalPath = tPath;
            confidence = 'medium';
            matchedTreeIndices.add(tIdx);
            fileWarnings.push(`تمت مطابقة اسم الملف من المخطط الشجري: ${tPath}`);
            break;
          }
        }
      }
    }

    // Quality check
    fileWarnings.push(...checkCodeQuality(block.code));

    rawFiles.push({
      path: finalPath,
      content: block.code,
      confidence,
      warnings: fileWarnings,
      lang: block.lang
    });
  });

  // 3. Handle name collisions (default to latest version with warning)
  const dedupedMap = new Map<string, ParsedProjectFile>();
  for (const f of rawFiles) {
    if (dedupedMap.has(f.path)) {
      const existing = dedupedMap.get(f.path)!;
      existing.warnings.push('تم استبدال هذا الملف بنسخة أحدث تكررت في الرد.');
      dedupedMap.set(f.path, {
        ...f,
        warnings: [...f.warnings, 'تكرر اسم هذا الملف في المحادثة، تم اعتماد النسخة الأحدث.']
      });
    } else {
      dedupedMap.set(f.path, f);
    }
  }

  let finalFiles = Array.from(dedupedMap.values());

  // 4. Strip common root folder if all files are wrapped in one
  const pathsList = finalFiles.map(f => f.path);
  const { paths: unrootedPaths, rootRemoved } = removeCommonRoot(pathsList);
  if (rootRemoved) {
    finalFiles = finalFiles.map((f, i) => ({
      ...f,
      path: unrootedPaths[i]
    }));
    generalWarnings.push(`تمت إزالة مجلد الجذر المغلّف المشترك: ${rootRemoved}/`);
  }

  // 5. Cross-file check: missing imports
  checkMissingImports(finalFiles);

  // Derive project name from title or source host
  let defaultName = 'مشروع الفطنة';
  if (payload.src?.title && payload.src.title.trim()) {
    const cleanTitle = payload.src.title
      .replace(/ - (ChatGPT|DeepSeek|Claude|Gemini).*$/i, '')
      .replace(/[^\p{L}\p{N}_\-\s]/gu, '')
      .trim();
    if (cleanTitle) {
      defaultName = cleanTitle.slice(0, 40);
    }
  }

  return {
    projectName: defaultName,
    files: finalFiles,
    sourceUrl: payload.src?.url,
    sourceTitle: payload.src?.title,
    sourceHost: payload.src?.host,
    treeFound,
    warnings: generalWarnings
  };
}

/**
 * Fallback parser for raw markdown or plain text pasted directly
 */
export function parseRawText(rawText: string): ParsedProjectResult {
  const blocks: ClipBlockV1[] = [];
  const lines = rawText.split('\n');

  // Match Markdown code fences (``` or ~~~) or separators === FILE: path ===
  let inBlock = false;
  let fenceTag = '';
  let blockLang = '';
  let blockHdr = '';
  let currentBuffer: string[] = [];
  let prevHintBuffer: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check === FILE: path ===
    const fileSepMatch = line.match(/^={3,}\s*(?:FILE|File|ملف)\s*[:=]?\s*([a-zA-Z0-9_\-./]+)\s*={3,}/);
    if (fileSepMatch) {
      if (inBlock && currentBuffer.length > 0) {
        blocks.push({
          i: blocks.length + 1,
          lang: blockLang,
          hdr: blockHdr,
          hint: prevHintBuffer.join(' ').slice(-200),
          code: currentBuffer.join('\n')
        });
        currentBuffer = [];
      }
      inBlock = true;
      blockHdr = fileSepMatch[1];
      blockLang = '';
      prevHintBuffer = [];
      continue;
    }

    // Check ```lang:path or ```lang
    const fenceMatch = line.match(/^(`{3,}|~{3,})(.*)$/);
    if (fenceMatch) {
      if (!inBlock) {
        inBlock = true;
        fenceTag = fenceMatch[1];
        const info = fenceMatch[2].trim();
        if (info.includes(':')) {
          const [l, p] = info.split(':');
          blockLang = l.trim();
          blockHdr = p.trim();
        } else {
          blockLang = info;
          blockHdr = '';
        }
        currentBuffer = [];
      } else if (line.startsWith(fenceTag)) {
        inBlock = false;
        blocks.push({
          i: blocks.length + 1,
          lang: blockLang,
          hdr: blockHdr,
          hint: prevHintBuffer.join(' ').slice(-200),
          code: currentBuffer.join('\n')
        });
        currentBuffer = [];
        prevHintBuffer = [];
      }
    } else {
      if (inBlock) {
        currentBuffer.push(line);
      } else {
        prevHintBuffer.push(line);
        if (prevHintBuffer.length > 6) prevHintBuffer.shift();
      }
    }
  }

  // If no code blocks found at all, treat whole text as a single file
  if (blocks.length === 0 && rawText.trim()) {
    blocks.push({
      i: 1,
      lang: 'text',
      hdr: 'main.txt',
      hint: '',
      code: rawText
    });
  }

  const dummyPayload: ClipPayloadV1 = {
    app: 'fitna-clipper',
    v: 1,
    t: Date.now(),
    src: {
      url: '',
      title: 'استيراد نصي مباشر',
      host: 'local-paste'
    },
    sel: null,
    blocks
  };

  return parseClipPayload(dummyPayload);
}
