export interface SecretFinding {
  filePath: string;
  type: string;
  line: number;
  snippet: string;
  isHighRisk: boolean;
}

const SECRET_PATTERNS: { name: string; regex: RegExp; highRisk: boolean }[] = [
  {
    name: 'GitHub Personal Access Token',
    regex: /\b(ghp_[a-zA-Z0-9]{36}|github_pat_[a-zA-Z0-9_]{50,})\b/,
    highRisk: true
  },
  {
    name: 'OpenAI API Key',
    regex: /\b(sk-[a-zA-Z0-9]{20,}|sk-proj-[a-zA-Z0-9_]{30,})\b/,
    highRisk: true
  },
  {
    name: 'Google API Key',
    regex: /\bAIza[0-9A-Za-z\-_]{35}\b/,
    highRisk: true
  },
  {
    name: 'AWS Access Key ID',
    regex: /\b(AKIA|ABIA|ACCA|ASIA)[0-9A-Z]{16}\b/,
    highRisk: true
  },
  {
    name: 'Private Key PEM Block',
    regex: /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/,
    highRisk: true
  },
  {
    name: 'Generic API Secret Variable',
    regex: /(?:api[_-]?key|secret[_-]?key|access[_-]?token|auth[_-]?token)\s*[:=]\s*["']([a-zA-Z0-9_\-]{16,})["']/i,
    highRisk: false
  }
];

export function scanFileForSecrets(filePath: string, content: string): SecretFinding[] {
  const findings: SecretFinding[] = [];

  // Check dangerous filenames
  const baseName = filePath.split('/').pop()?.toLowerCase() || '';
  if (baseName === '.env' || baseName.startsWith('.env.') || baseName === 'id_rsa' || baseName === 'credentials.json') {
    findings.push({
      filePath,
      type: `ملف أسرار بيئية حساس (${baseName})`,
      line: 1,
      snippet: filePath,
      isHighRisk: true
    });
  }

  const lines = content.split('\n');
  lines.forEach((lineText, idx) => {
    for (const pattern of SECRET_PATTERNS) {
      const match = pattern.regex.exec(lineText);
      if (match) {
        // Redact match for security
        const rawMatch = match[0];
        const redacted = rawMatch.length > 8
          ? rawMatch.slice(0, 4) + '••••••••' + rawMatch.slice(-3)
          : '••••••••';

        findings.push({
          filePath,
          type: pattern.name,
          line: idx + 1,
          snippet: lineText.replace(rawMatch, redacted).trim(),
          isHighRisk: pattern.highRisk
        });
        break; // One finding per line
      }
    }
  });

  return findings;
}

export function scanProjectFiles(files: { path: string; content: string }[]): SecretFinding[] {
  const allFindings: SecretFinding[] = [];
  for (const f of files) {
    const findings = scanFileForSecrets(f.path, f.content);
    allFindings.push(...findings);
  }
  return allFindings;
}
