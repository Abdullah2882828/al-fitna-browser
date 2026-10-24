import JSZip from 'jszip';
import { sanitizePath, removeCommonRoot } from './parser/sanitizePath';

export interface ZipFileInput {
  path: string;
  content: string;
}

export interface ExtractedFile {
  path: string;
  content: string;
  size: number;
}

/**
 * Packs files into a ZIP archive and triggers browser download
 */
export async function downloadProjectAsZip(projectName: string, files: ZipFileInput[]): Promise<void> {
  const zip = new JSZip();

  for (const f of files) {
    zip.file(f.path, f.content);
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeName = (projectName || 'project').replace(/[/\\?%*:|"<>]/g, '_');
  a.download = `${safeName}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}

/**
 * Extracts a ZIP file file-by-file, ignoring junk like __MACOSX and .git
 */
export async function extractZipFile(zipBlob: Blob): Promise<{ files: ExtractedFile[]; ignoredCount: number }> {
  const zip = await JSZip.loadAsync(zipBlob);
  const files: ExtractedFile[] = [];
  let ignoredCount = 0;

  const entries: JSZip.JSZipObject[] = [];
  zip.forEach((_, entry) => {
    entries.push(entry);
  });

  for (const entry of entries) {
    if (entry.dir) continue;

    const path = entry.name;

    // Filter out OS junk
    if (
      path.startsWith('__MACOSX') ||
      path.includes('/.DS_Store') ||
      path === '.DS_Store' ||
      path.includes('/.git/') ||
      path.startsWith('.git/')
    ) {
      ignoredCount++;
      continue;
    }

    try {
      const content = await entry.async('string');
      files.push({
        path: sanitizePath(path),
        content,
        size: content.length
      });
    } catch {
      ignoredCount++;
    }
  }

  // Strip wrapping root directory if all files are inside a single folder
  const pathsList = files.map(f => f.path);
  const { paths: cleanPaths } = removeCommonRoot(pathsList);
  files.forEach((f, idx) => {
    f.path = cleanPaths[idx];
  });

  return { files, ignoredCount };
}
