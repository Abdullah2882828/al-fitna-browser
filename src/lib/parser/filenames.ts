import { sanitizePath } from './sanitizePath';

export interface FilenameInferenceResult {
  path: string;
  confidence: 'high' | 'medium' | 'low';
  source: 'header' | 'first-line' | 'hint' | 'tree' | 'language-default';
  warning?: string;
}

const COMMON_LANG_EXTENSIONS: Record<string, string> = {
  javascript: 'js',
  js: 'js',
  jsx: 'jsx',
  typescript: 'ts',
  ts: 'ts',
  tsx: 'tsx',
  python: 'py',
  py: 'py',
  html: 'html',
  css: 'css',
  scss: 'scss',
  json: 'json',
  markdown: 'md',
  md: 'md',
  shell: 'sh',
  bash: 'sh',
  sh: 'sh',
  sql: 'sql',
  rust: 'rs',
  rs: 'rs',
  go: 'go',
  golang: 'go',
  kotlin: 'kt',
  kt: 'kt',
  java: 'java',
  c: 'c',
  cpp: 'cpp',
  'c++': 'cpp',
  php: 'php',
  ruby: 'rb',
  rb: 'rb',
  yaml: 'yaml',
  yml: 'yml',
  xml: 'xml',
  dockerfile: 'Dockerfile',
  env: '.env'
};

const FILE_EXT_REGEX = /\b([a-zA-Z0-9_\-./]+\.[a-zA-Z0-9]{1,10})\b/;

/**
 * 1. Test header text
 */
function extractFromHeader(hdr: string): string | null {
  if (!hdr) return null;
  const cleaned = hdr.trim();
  if (cleaned.includes('/') || FILE_EXT_REGEX.test(cleaned)) {
    const match = cleaned.match(FILE_EXT_REGEX);
    if (match) return match[1];
    if (cleaned.length < 100 && !cleaned.includes(' ')) {
      return cleaned;
    }
  }
  return null;
}

/**
 * 2. Test first line comments in code
 */
function extractFromFirstLine(code: string): string | null {
  if (!code) return null;
  const firstLine = code.trim().split('\n')[0].trim();

  // // filename: app.js or // file: app.js or // @filename: app.js
  const jsMatch = firstLine.match(/^\/\/\s*(?:@?filename|file|path)\s*[:=]?\s*([a-zA-Z0-9_\-./]+)/i);
  if (jsMatch) return jsMatch[1];

  // /* File: app.js */
  const cBlockMatch = firstLine.match(/^\/\*\s*(?:@?filename|file|path)\s*[:=]?\s*([a-zA-Z0-9_\-./]+)\s*\*\//i);
  if (cBlockMatch) return cBlockMatch[1];

  // # file: server.py or # filename: server.py
  const pyMatch = firstLine.match(/^#\s*(?:filename|file|path)\s*[:=]?\s*([a-zA-Z0-9_\-./]+)/i);
  if (pyMatch) return pyMatch[1];

  // <!-- path: index.html --> or <!-- file: index.html -->
  const htmlMatch = firstLine.match(/^<!--\s*(?:filename|file|path)\s*[:=]?\s*([a-zA-Z0-9_\-./]+)\s*-->/i);
  if (htmlMatch) return htmlMatch[1];

  return null;
}

/**
 * 3. Test hint preceding text
 */
function extractFromHint(hint: string): string | null {
  if (!hint) return null;

  // Patterns like: ### `src/a.js` or `src/a.js`
  const backtickMatch = hint.match(/`([a-zA-Z0-9_\-./]+\.[a-zA-Z0-9]+)`/);
  if (backtickMatch) return backtickMatch[1];

  // **File: x** or **ملف: x** or **filename: x**
  const boldMatch = hint.match(/\*\*(?:file|filename|ملف|مسار)\s*[:=]?\s*([a-zA-Z0-9_\-./]+)\*\*/i);
  if (boldMatch) return boldMatch[1];

  // 📄 x or 📁 x
  const emojiMatch = hint.match(/[📄📁📝]\s*`?([a-zA-Z0-9_\-./]+\.[a-zA-Z0-9]+)`?/);
  if (emojiMatch) return emojiMatch[1];

  // «ملف: x» or "ملف: x"
  const arabicQuoteMatch = hint.match(/[«"'](?:ملف|مسار)\s*[:=]?\s*([a-zA-Z0-9_\-./]+)[»"']/);
  if (arabicQuoteMatch) return arabicQuoteMatch[1];

  // "Create a file named x" or "Save as x" or "في ملف x"
  const phraseMatch = hint.match(/(?:create|named|file|save as|ملف)\s*[:=]?\s*`?([a-zA-Z0-9_\-./]+\.[a-zA-Z0-9]+)`?/i);
  if (phraseMatch) return phraseMatch[1];

  return null;
}

/**
 * Infer filename and confidence for a code block
 */
export function inferFilename(
  index: number,
  hdr: string,
  hint: string,
  code: string,
  lang: string
): FilenameInferenceResult {
  // 1. Header inspection
  const fromHdr = extractFromHeader(hdr);
  if (fromHdr) {
    return {
      path: sanitizePath(fromHdr),
      confidence: 'high',
      source: 'header'
    };
  }

  // 2. First-line comment inspection
  const fromFirstLine = extractFromFirstLine(code);
  if (fromFirstLine) {
    return {
      path: sanitizePath(fromFirstLine),
      confidence: 'high',
      source: 'first-line'
    };
  }

  // 3. Hint inspection
  const fromHint = extractFromHint(hint);
  if (fromHint) {
    return {
      path: sanitizePath(fromHint),
      confidence: 'medium',
      source: 'hint'
    };
  }

  // 5. Default fallback based on language or generic
  const normalizedLang = (lang || '').toLowerCase().trim();
  const ext = COMMON_LANG_EXTENSIONS[normalizedLang] || (normalizedLang ? normalizedLang : 'txt');
  const fallbackName = `script_${index}.${ext}`;

  return {
    path: fallbackName,
    confidence: 'low',
    source: 'language-default',
    warning: 'لم يتم العثور على اسم للملف في الكود أو الرأس؛ تم توليد اسم تلقائي بناءً على لغة البرمجة.'
  };
}
