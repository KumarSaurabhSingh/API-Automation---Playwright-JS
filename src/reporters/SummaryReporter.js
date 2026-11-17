const fs = require('node:fs');
const path = require('node:path');

function ensureDirectory(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function extractTags(title) {
  return [...String(title).matchAll(/@[a-zA-Z][\w-]*/g)].map((match) => match[0]);
}

class SummaryReporter {
  constructor(options = {}) {
    this.options = options;
    this.outputFile = path.resolve(
      process.cwd(),
      options.outputFile || 'reports/summary.md',
    );
    this.results = [];
    this.startedAt = null;
    this.totalTests = 0;
  }

  onBegin(config, suite) {
    this.startedAt = Date.now();
    this.totalTests = suite.allTests().length;
  }

  onTestEnd(test, result) {
    this.results.push({
      title: test.titlePath().filter(Boolean).join(' > '),
      status: result.status,
      duration: result.duration,
      retry: result.retry,
      tags: extractTags(test.title),
      error: result.error?.message?.split('\n')[0] || '',
    });
  }

  onEnd(result) {
    const durationMs = Date.now() - (this.startedAt || Date.now());
    const counts = {
      passed: 0,
      failed: 0,
      timedOut: 0,
      skipped: 0,
      interrupted: 0,
      flaky: 0,
    };

    for (const item of this.results) {
      if (item.status === 'passed' && item.retry > 0) counts.flaky += 1;
      if (item.status in counts) counts[item.status] += 1;
    }

    const slowest = [...this.results]
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 5);

    const lines = [
      '# API Automation Test Summary',
      '',
      `- Status: **${result.status.toUpperCase()}**`,
      `- Environment: \`${process.env.TEST_ENV || 'qa'}\``,
      `- Total tests: ${this.totalTests}`,
      `- Passed: ${counts.passed}`,
      `- Failed: ${counts.failed + counts.timedOut + counts.interrupted}`,
      `- Flaky: ${counts.flaky}`,
      `- Skipped: ${counts.skipped}`,
      `- Duration: ${(durationMs / 1000).toFixed(2)}s`,
      `- Generated: ${new Date().toISOString()}`,
      '',
      '## Slowest tests',
      '',
      '| Duration (ms) | Status | Test |',
      '| ---: | --- | --- |',
      ...slowest.map(
        (item) =>
          `| ${Math.round(item.duration)} | ${item.status} | ${item.title.replace(/\|/g, '\\|')} |`,
      ),
      '',
    ];

    if (counts.failed + counts.timedOut + counts.interrupted > 0) {
      lines.push('## Failures', '');
      for (const item of this.results.filter(
        (entry) => !['passed', 'skipped'].includes(entry.status),
      )) {
        lines.push(`- \`${item.title}\`: ${item.error || item.status}`);
      }
      lines.push('');
    }

    try {
      ensureDirectory(this.outputFile);
      fs.writeFileSync(this.outputFile, `${lines.join('\n')}\n`, 'utf8');
    } catch {
      // Reporting must never fail the run.
    }

    const summary = [
      '',
      'API automation summary',
      `  Status   : ${result.status.toUpperCase()}`,
      `  Passed   : ${counts.passed}`,
      `  Failed   : ${counts.failed + counts.timedOut + counts.interrupted}`,
      `  Flaky    : ${counts.flaky}`,
      `  Skipped  : ${counts.skipped}`,
      `  Duration : ${(durationMs / 1000).toFixed(2)}s`,
      '  Reports  : reports/html/index.html | reports/junit.xml | reports/results.json | reports/summary.md',
      '',
    ].join('\n');

    process.stdout.write(`${summary}\n`);
  }
}

module.exports = SummaryReporter;
