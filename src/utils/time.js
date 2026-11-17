function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));
}

function nowMs() {
  return Number(process.hrtime.bigint() / 1000000n);
}

function elapsedMs(startedAt) {
  return Math.round(nowMs() - startedAt);
}

function isoNow() {
  return new Date().toISOString();
}

module.exports = { sleep, nowMs, elapsedMs, isoNow };
