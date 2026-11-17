const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const targets = ['reports', 'logs', 'test-results', 'playwright-report'];

for (const target of targets) {
  const fullPath = path.join(root, target);
  if (fs.existsSync(fullPath)) {
    fs.rmSync(fullPath, { recursive: true, force: true });
    process.stdout.write(`Removed ${target}/\n`);
  }
}

process.stdout.write('Clean complete.\n');
