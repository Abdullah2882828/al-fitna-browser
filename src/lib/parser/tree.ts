import { sanitizePath } from './sanitizePath';

export interface TreeScanResult {
  hasTree: boolean;
  filePaths: string[];
}

/**
 * Detects if a text block contains an ASCII project tree diagram
 * Lines with symbols like ├──, └──, │, ──
 */
export function parseAsciiTree(text: string): TreeScanResult {
  if (!text) return { hasTree: false, filePaths: [] };

  const lines = text.split('\n');
  const treeSymbols = ['├──', '└──', '│', '─'];
  let symbolCount = 0;

  for (const line of lines) {
    if (treeSymbols.some(s => line.includes(s))) {
      symbolCount++;
    }
  }

  // Must have at least 2 tree lines
  if (symbolCount < 2) {
    return { hasTree: false, filePaths: [] };
  }

  const paths: string[] = [];
  const currentStack: { depth: number; name: string }[] = [];

  for (const rawLine of lines) {
    const line = rawLine.replace(/\r/g, '');
    if (!line.trim()) continue;

    // Calculate depth based on leading spaces and tree branch characters
    const branchMatch = line.match(/^([\s│|]*)?(?:├──|└──|──|\+--)\s*(.+)$/);
    if (branchMatch) {
      const prefix = branchMatch[1] || '';
      const nodeName = branchMatch[2].trim().replace(/[/#]+$/, ''); // clean comments or trailing slash
      const depth = Math.floor(prefix.length / 4) + 1;

      // Adjust stack
      while (currentStack.length > 0 && currentStack[currentStack.length - 1].depth >= depth) {
        currentStack.pop();
      }

      if (nodeName.includes('.')) {
        // It's a file
        const fullDir = currentStack.map(s => s.name).join('/');
        const fullPath = fullDir ? `${fullDir}/${nodeName}` : nodeName;
        paths.push(sanitizePath(fullPath));
      } else {
        // It's a directory
        currentStack.push({ depth, name: nodeName });
      }
    } else {
      // Possible simple root folder or path line
      const simpleMatch = line.match(/^([a-zA-Z0-9_\-./]+)\/$/);
      if (simpleMatch) {
        currentStack.length = 0;
        currentStack.push({ depth: 0, name: simpleMatch[1] });
      }
    }
  }

  return {
    hasTree: paths.length > 0,
    filePaths: paths
  };
}
