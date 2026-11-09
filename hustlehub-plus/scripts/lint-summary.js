// Turns ESLint JSON reports into a readable summary for the pipeline log, the
// job summary page and the saved static analysis evidence.
//
//   node scripts/lint-summary.js <label>=<report.json> ... [--out summary.md]

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const outIndex = args.indexOf('--out');
const outFile = outIndex >= 0 ? args[outIndex + 1] : null;
const inputs = args.filter((a, i) => a.includes('=') && i !== outIndex + 1);

const lines = ['# Static analysis results', ''];
let totalErrors = 0;

for (const input of inputs) {
  const [label, file] = input.split('=');
  const results = JSON.parse(fs.readFileSync(file, 'utf8'));
  const byRule = new Map();
  let errors = 0;
  let warnings = 0;

  for (const result of results) {
    for (const m of result.messages) {
      if (m.severity === 2) errors++; else warnings++;
      const key = (m.severity === 2 ? 'error   ' : 'warning ') + (m.ruleId || 'parse-error');
      byRule.set(key, (byRule.get(key) || 0) + 1);
    }
  }

  totalErrors += errors;
  lines.push('## ' + label, '',
    results.length + ' files analysed, ' + errors + ' errors, ' + warnings + ' warnings', '');

  if (byRule.size) {
    lines.push('| Severity and rule | Count |', '|---|---|');
    [...byRule.entries()].sort((a, b) => b[1] - a[1])
      .forEach(([rule, count]) => lines.push('| ' + rule + ' | ' + count + ' |'));
    lines.push('');
  }

  for (const result of results) {
    for (const m of result.messages) {
      lines.push('- ' + (m.severity === 2 ? 'ERROR' : 'warning') + ' ' +
        path.relative(process.cwd(), result.filePath).replace(/\\/g, '/') + ':' + m.line +
        ' ' + (m.ruleId || '') + ' - ' + m.message.split('\n')[0]);
    }
  }
  lines.push('');
}

const text = lines.join('\n');
console.log(text);
if (outFile) fs.writeFileSync(outFile, text + '\n');
process.exit(totalErrors ? 1 : 0);
