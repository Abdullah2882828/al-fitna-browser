import rawClipperCode from '../../bookmarklet/clipper.src.js?raw';

/**
 * Minify JavaScript code safely for bookmarklet usage
 * Removes single-line comments on their own line, block comments, and collapses excess spaces.
 */
export function minifyScript(src: string): string {
  // 1. Remove block comments /* ... */
  let code = src.replace(/\/\*[\s\S]*?\*\//g, '');

  // 2. Remove full-line comments starting with //
  const lines = code.split('\n');
  const filteredLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('//')) {
      continue;
    }
    // Also clean trailing inline comment if preceded by space and not inside a quote
    // For safety with URLs like http://, only remove if preceded by space and // without quotes
    filteredLines.push(line);
  }

  code = filteredLines.join('\n');

  // 3. Normalize whitespace while keeping tokens distinct
  code = code
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*([;{}()=+,<>!&|?:])\s*/g, '$1')
    .trim();

  return code;
}

/**
 * Build executable bookmarklet URL string: "javascript:..."
 * @param fitnaUrl The target URL to inject where the bookmarklet will navigate
 */
export function buildBookmarklet(fitnaUrl?: string): { code: string; bookmarkletUrl: string; byteSize: number } {
  const currentOrigin = typeof window !== 'undefined'
    ? (window.location.origin + window.location.pathname)
    : 'https://fitna.app/';

  const targetUrl = (fitnaUrl && fitnaUrl.trim()) ? fitnaUrl.trim() : currentOrigin;

  // Inject target URL
  const injectedCode = rawClipperCode.replace(/__FITNA_URL__/g, targetUrl);

  const minified = minifyScript(injectedCode);
  const encoded = encodeURIComponent(minified);
  const bookmarkletUrl = 'javascript:' + encoded;

  return {
    code: minified,
    bookmarkletUrl,
    byteSize: new Blob([bookmarkletUrl]).size
  };
}
