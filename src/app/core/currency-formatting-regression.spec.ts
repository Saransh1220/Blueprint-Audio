import * as fs from 'node:fs';
import * as path from 'node:path';

describe('Currency Formatting Regression Guard (RW-1-4)', () => {
  const appRoot = path.resolve(__dirname, '..');

  function getFiles(dir: string, fileList: string[] = []): string[] {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        getFiles(fullPath, fileList);
      } else if (
        (file.endsWith('.ts') || file.endsWith('.html')) &&
        !file.endsWith('.spec.ts') &&
        !file.endsWith('.d.ts')
      ) {
        fileList.push(fullPath);
      }
    }
    return fileList;
  }

  it('ensures no unauthorized literal currency symbols or ad-hoc money formatting exist in app code', () => {
    const files = getFiles(appRoot);
    const violations: { file: string; line: number; text: string; reason: string }[] = [];

    // Allowlisted files or relative paths
    const allowedSymbolFiles = new Set([
      path.normalize(path.join(appRoot, 'models', 'money.ts')),
      // Studio settings seller store currency choices are explicitly assigned to RW-1-6
      path.normalize(
        path.join(appRoot, 'pages', 'studio', 'tabs', 'studio-settings.component.html'),
      ),
      // Mock data catalog items per plan section D
      path.normalize(path.join(appRoot, 'content', 'catalog', 'catalog.mock-data.ts')),
    ]);

    for (const filePath of files) {
      const normalizedPath = path.normalize(filePath);
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split(/\r?\n/);

      lines.forEach((line, index) => {
        const lineNum = index + 1;
        const trimmed = line.trim();

        // Skip comments
        if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
          return;
        }

        // 1. Literal rupee symbol '₹'
        if (line.includes('₹') && !allowedSymbolFiles.has(normalizedPath)) {
          violations.push({
            file: path.relative(appRoot, filePath),
            line: lineNum,
            text: trimmed,
            reason: "Hard-coded '₹' literal found. Use CurrencyService or MoneyPipe.",
          });
        }

        // 2. Direct Intl.NumberFormat style: 'currency' outside formatMoneyValue
        if (
          line.includes("style: 'currency'") &&
          !normalizedPath.endsWith(path.normalize('models/money.ts')) &&
          !normalizedPath.endsWith(path.normalize('services/currency-configuration.service.ts'))
        ) {
          violations.push({
            file: path.relative(appRoot, filePath),
            line: lineNum,
            text: trimmed,
            reason:
              "Ad-hoc Intl.NumberFormat with style: 'currency' found. Use formatMoneyValue or CurrencyService.",
          });
        }

        // 3. toFixed called on money/price variables (e.g. price.toFixed, amount.toFixed)
        if (
          /\b(price|amount|major|minor|cost|fee|revenue|total)\b.*\.toFixed\(/i.test(line) &&
          !trimmed.includes('//')
        ) {
          violations.push({
            file: path.relative(appRoot, filePath),
            line: lineNum,
            text: trimmed,
            reason:
              'toFixed called on money/price variable. Currency minor units and scales must be handled via CurrencyService.',
          });
        }

        // 4. Literal dollar price patterns in HTML/code like >$10 or "$100" (excluding template interpolations like `${`)
        if (/>\s*\$\d+/i.test(line) && !allowedSymbolFiles.has(normalizedPath)) {
          violations.push({
            file: path.relative(appRoot, filePath),
            line: lineNum,
            text: trimmed,
            reason:
              'Hard-coded literal dollar price in HTML found. Prices must be rendered through MoneyPipe or CurrencyService.',
          });
        }
      });
    }

    if (violations.length > 0) {
      const report = violations
        .map((v) => `  [${v.file}:${v.line}] ${v.reason}\n    Line: "${v.text}"`)
        .join('\n\n');
      throw new Error(`Money formatting regression violations detected:\n${report}`);
    }

    expect(violations).toHaveLength(0);
  });
});
