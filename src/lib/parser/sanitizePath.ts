/**
 * sanitizePath.ts
 * Cleans and secures file paths:
 * - Normalizes slashes to /
 * - Removes leading ./ and /
 * - Prevents directory traversal (..)
 * - Strips Windows drive letters (C:\) and UNC paths
 * - Removes control characters
 * - Caps length at 200 characters
 */

export function sanitizePath(inputPath: string, fallbackDefault = 'file.txt'): string {
  if (!inputPath || typeof inputPath !== 'string') {
    return fallbackDefault;
  }

  let p = inputPath.trim();

  // Strip quotes or backticks if wrapped
  p = p.replace(/^[`'"]+|[`'"]+$/g, '');

  // Replace backslashes with forward slashes
  p = p.replace(/\\+/g, '/');

  // Strip Windows drive letters (e.g. C:, D:)
  p = p.replace(/^[a-zA-Z]:/g, '');

  // Remove control characters (0x00 - 0x1F, 0x7F)
  p = p.replace(/[\x00-\x1F\x7F]/g, '');

  // Split into segments and filter
  const segments = p.split('/').filter(Boolean);
  const safeSegments: string[] = [];

  for (const seg of segments) {
    const trimmedSeg = seg.trim();
    if (!trimmedSeg || trimmedSeg === '.' || trimmedSeg === '..') {
      continue; // Skip traversal and current dir references
    }
    // Remove characters illegal in file systems (: * ? " < > |)
    const cleanedSeg = trimmedSeg.replace(/[:*?"<>|]/g, '_');
    if (cleanedSeg) {
      safeSegments.push(cleanedSeg);
    }
  }

  if (safeSegments.length === 0) {
    return fallbackDefault;
  }

  let finalPath = safeSegments.join('/');

  // Cap path at 200 characters
  if (finalPath.length > 200) {
    const extMatch = finalPath.match(/(\.[a-zA-Z0-9]+)$/);
    const ext = extMatch ? extMatch[1] : '';
    finalPath = finalPath.slice(0, 200 - ext.length) + ext;
  }

  return finalPath;
}

/**
 * Strips common root folder if all files reside in a single top-level directory
 * e.g. my-app/src/index.js & my-app/package.json -> src/index.js & package.json
 */
export function removeCommonRoot(paths: string[]): { paths: string[]; rootRemoved: string | null } {
  if (paths.length <= 1) {
    return { paths, rootRemoved: null };
  }

  const splitPaths = paths.map(p => p.split('/'));
  const firstRoots = splitPaths.map(parts => parts.length > 1 ? parts[0] : null);

  // If any file has no folder, we cannot strip
  if (firstRoots.some(r => r === null)) {
    return { paths, rootRemoved: null };
  }

  const commonRoot = firstRoots[0];
  const allMatch = firstRoots.every(r => r === commonRoot);

  if (allMatch && commonRoot) {
    const newPaths = paths.map(p => p.substring(commonRoot.length + 1));
    return { paths: newPaths, rootRemoved: commonRoot };
  }

  return { paths, rootRemoved: null };
}
