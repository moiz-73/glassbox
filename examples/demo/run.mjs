#!/usr/bin/env node
// glassbox demo -- watch the five-phase loop solve a small mock API.
//
// The mock serves four deterministic quirks:
//   1. one route reports failure inside an HTTP 200 body
//   2. one list route pages with an opaque next_cursor
//   3. one route streams line-framed events in chunks
//   4. one write route dedupes on an idempotency-key header
//
// Zero dependencies, Node 18+ ESM. Run: node examples/demo/run.mjs

import http from 'node:http';
import os from 'node:os';
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const CHECKS = [];
let failures = 0;

// Record one graded check. [OBS] = observed live; [INF] = model prediction.
function check(label, grade, condition, detail) {
  const ok = Boolean(condition);
  if (!ok) failures += 1;
  CHECKS.push(ok);
  const mark = ok ? 'PASS' : 'FAIL';
  const tail = detail ? ' -- ' + detail : '';
  console.log('  [' + mark + '] ' + grade + ' ' + label + tail);
}

const log = (msg) => console.log(msg);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ---------------------------------------------------------------------------
// The mock API: deterministic; same request, same response, every run.
// ---------------------------------------------------------------------------

const ITEMS = Array.from({ length: 7 }, (_, i) => ({ id: i + 1, name: 'item-' + (i + 1) }));
const PAGE_SIZE = 3;

const db = {
  effects: 0,       // real write side effects performed
  byKey: new Map(), // idempotency-key -> stored result
};

function sendJson(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json', connection: 'close' });
  res.end(JSON.stringify(body));
}

function listPage(cursor) {
  const raw = String(cursor || '').replace('cur-', '');
  const start = Number(raw) || 0;
  const slice = ITEMS.slice(start, start + PAGE_SIZE);
  const next = start + PAGE_SIZE < ITEMS.length ? 'cur-' + (start + PAGE_SIZE) : null;
  return { items: slice, next_cursor: next };
}

async function streamEvents(res) {
  res.writeHead(200, { 'content-type': 'text/event-stream', connection: 'close' });
  const events = [
    { seq: 1, kind: 'tick' },
    { seq: 2, kind: 'tick' },
    { seq: 3, kind: 'tick' },
    { seq: 4, kind: 'done' },
  ];
  for (const event of events) {
    if (res.destroyed || res.writableEnded) return;
    res.write('data: ' + JSON.stringify(event) + '\n\n');
    await sleep(5); // force real chunk boundaries on the wire
  }
  res.end();
}

function writeJob(req, res) {
  const key = req.headers['idempotency-key'];
  if (key && db.byKey.has(key)) {
    const stored = db.byKey.get(key);
    sendJson(res, 200, { ok: true, job_id: stored.job_id, deduplicated: true });
    return;
  }
  db.effects += 1;
  const record = { job_id: 'job-' + db.effects };
  if (key) db.byKey.set(key, record);
  sendJson(res, 200, { ok: true, job_id: record.job_id, deduplicated: false });
}

function readReport(url, res) {
  if (url.searchParams.get('ready') === '1') {
    sendJson(res, 200, { ok: true, report: { rows: 3, status: 'ready' } });
    return;
  }
  // Quirk 1: HTTP 200, but the payload itself reports the failure.
  sendJson(res, 200, {
    ok: false,
    error: { code: 'NOT_READY', message: 'still building; retry with ready=1' },
  });
}

const server = http.createServer(async (req, res) => {
  res.on('error', () => {}); // a cancelled client must not crash the mock
  req.resume();
  try {
    const url = new URL(req.url, 'http://127.0.0.1');
    const path = url.pathname;
    if (req.method === 'GET' && path === '/v1/items') {
      sendJson(res, 200, listPage(url.searchParams.get('cursor')));
    } else if (req.method === 'GET' && path === '/v1/stream') {
      await streamEvents(res);
    } else if (req.method === 'POST' && path === '/v1/jobs') {
      writeJob(req, res);
    } else if (req.method === 'POST' && path === '/v1/report') {
      readReport(url, res);
    } else {
      sendJson(res, 404, { ok: false, error: { code: 'NO_ROUTE', message: 'unknown path' } });
    }
  } catch (err) {
    if (!res.headersSent) {
      sendJson(res, 500, { ok: false, error: { code: 'SERVER_ERROR', message: String(err) } });
    } else {
      res.end();
    }
  }
});

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const { port } = server.address();
const base = `http://127.0.0.1:${port}`;

// Client helpers over the global fetch.
async function call(path, options = {}) {
  const res = await fetch(base + path, { ...options, signal: AbortSignal.timeout(5000) });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch (err) {
    body = text;
  }
  return { status: res.status, body };
}

async function drainStream() {
  const res = await fetch(base + '/v1/stream', { signal: AbortSignal.timeout(5000) });
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  const events = [];
  let buf = '';
  let reads = 0;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    reads += 1;
    buf += decoder.decode(value, { stream: true });
    // Frames are separated by a blank line; collect them as they arrive.
    let cut = buf.indexOf('\n\n');
    while (cut >= 0) {
      const frame = buf.slice(0, cut);
      buf = buf.slice(cut + 2);
      if (frame.startsWith('data: ')) events.push(JSON.parse(frame.slice(6)));
      cut = buf.indexOf('\n\n');
    }
  }
  return { events, reads };
}

async function main() {
  log('');
  log('glassbox demo: the five-phase loop against a local mock API');
  log('base URL: ' + base);

  // -------------------------------------------------------------------------
  // PERCEIVE: probe first; record raw behavior before interpreting anything.
  // -------------------------------------------------------------------------
  log('');
  log('== PERCEIVE ==');
  log('Probing the mock and writing down what happens, not what we hope.');

  const page1 = await call('/v1/items');
  log('GET /v1/items -> HTTP ' + page1.status);
  log('body keys: ' + Object.keys(page1.body).join(', '));
  log('first page: ' + page1.body.items.length + ' items, next_cursor = '
    + JSON.stringify(page1.body.next_cursor));

  const probeReport = await call('/v1/report', { method: 'POST' });
  log('POST /v1/report -> HTTP ' + probeReport.status + ' with body '
    + JSON.stringify(probeReport.body));
  log('[OBS] status 200, yet the payload reports failure: trust the body.');

  const probeStream = await fetch(base + '/v1/stream', {
    signal: AbortSignal.timeout(5000),
  });
  log('GET /v1/stream -> HTTP ' + probeStream.status + ', '
    + probeStream.headers.get('content-type'));
  await probeStream.body.cancel(); // release the stream; do not hold it open

  const probeJob = await call('/v1/jobs', {
    method: 'POST',
    headers: { 'idempotency-key': 'probe-write-0' },
  });
  log('POST /v1/jobs -> ' + JSON.stringify(probeJob.body));

  // -------------------------------------------------------------------------
  // MODEL: write the contract that explains the observations. Predictions are
  // only inferred until the verify phase puts them on trial.
  // -------------------------------------------------------------------------
  log('');
  log('== MODEL ==');
  log('Naive transport expectations vs observed application behavior:');
  log('- transport: a 2xx status means success');
  log('  observed: an HTTP 200 body can carry an application-level failure');
  log('- transport: one request returns one payload');
  log('  observed: list results arrive in cursor pages until null');
  log('- transport: a body is one blob');
  log('  observed: stream frames arrive in chunks and must be framed');
  log('- transport: retries are harmless');
  log('  observed: a write is safe to retry only with an idempotency key');

  // -------------------------------------------------------------------------
  // EXECUTE: use the model for real work -- page fully, drain the stream,
  // recover from the in-band failure, and replay an idempotent write.
  // -------------------------------------------------------------------------
  log('');
  log('== EXECUTE ==');

  const items = [];
  let cursor = null;
  let pages = 0;
  do {
    const suffix = cursor ? '?cursor=' + encodeURIComponent(cursor) : '';
    const page = await call('/v1/items' + suffix);
    if (page.body.ok === false) break; // same body gate as everywhere
    items.push(...page.body.items);
    cursor = page.body.next_cursor;
    pages += 1;
  } while (cursor);
  log('paged ' + pages + ' page(s); collected ' + items.length + ' items');

  const streamed = await drainStream();
  log('stream drained in ' + streamed.reads + ' read(s); '
    + streamed.events.length + ' events');

  const bad = await call('/v1/report', { method: 'POST' });
  let good = bad;
  if (bad.body.ok === false) {
    log('body gate: ' + bad.body.error.code + ' -- retrying with ready=1');
    good = await call('/v1/report?ready=1', { method: 'POST' });
  }
  log('recovery call: ok=' + good.body.ok + ', rows=' + good.body.report.rows);

  const effectsBefore = db.effects;
  const key = 'demo-write-1';
  const send1 = await call('/v1/jobs', {
    method: 'POST',
    headers: { 'idempotency-key': key },
  });
  const send2 = await call('/v1/jobs', {
    method: 'POST',
    headers: { 'idempotency-key': key },
  });
  const effectsAfter = db.effects;
  log('send 1 -> job_id=' + send1.body.job_id + ', dedup=' + send1.body.deduplicated);
  log('send 2 -> job_id=' + send2.body.job_id + ', dedup=' + send2.body.deduplicated);

  // -------------------------------------------------------------------------
  // VERIFY: no claim without a check. [OBS] is observed live; [INF] is a
  // model prediction now under test. Every line prints PASS or FAIL.
  // -------------------------------------------------------------------------
  log('');
  log('== VERIFY ==');

  check('failing route returned HTTP 200 with ok=false in the body',
    '[OBS]', probeReport.status === 200 && probeReport.body.ok === false);
  check('body gate branched to the recovery path',
    '[OBS]', bad.body.ok === false && good.body.ok === true);
  check('recovery returned the expected payload',
    '[OBS]', Boolean(good.body.report) && good.body.report.rows === 3);
  check('model predicted 3 pages for 7 items at page size 3',
    '[INF]', pages === 3);
  check('pagination collected every item exactly once',
    '[OBS]', items.length === 7 && items.every((it, i) => it.id === i + 1));
  check('cursor terminated at null',
    '[OBS]', cursor === null);
  check('model predicted 4 events ending in kind done',
    '[INF]', streamed.events.length === 4 && streamed.events[3].kind === 'done');
  check('replay returned the original job id',
    '[INF]', send1.body.job_id === send2.body.job_id);
  check('second send was flagged as deduplicated',
    '[OBS]', send2.body.deduplicated === true);
  check('exactly one side effect reached the server',
    '[OBS]', effectsAfter - effectsBefore === 1,
    effectsBefore + ' -> ' + effectsAfter);

  // -------------------------------------------------------------------------
  // EVOLVE: keep state outside the context window. A fresh memory directory
  // holds the memory triad; the run log is appended, never rewritten.
  // -------------------------------------------------------------------------
  log('');
  log('== EVOLVE ==');
  const stamp = new Date().toISOString();
  const memoryDir = join(os.tmpdir(), 'glassbox-demo-' + Date.now() + '-' + process.pid);
  mkdirSync(memoryDir, { recursive: true });

  const lessons = [
    '# Lessons',
    '',
    '- [OBS] HTTP 200 can carry an application-level failure; gate on the body.',
    '- [OBS] Cursor pagination: echo the cursor exactly, stop when it is null.',
    '- [OBS] Chunked streams must be read incrementally, frame by frame.',
    '- [INF] An idempotency key makes a retry safe; count side effects to prove it.',
    '',
  ].join('\n');

  const state = {
    run: stamp,
    phase: 'evolve',
    checks_total: CHECKS.length,
    checks_failed: failures,
    observations: ['in-band error', 'cursor paging', 'chunked stream', 'idempotent write'],
  };

  writeFileSync(join(memoryDir, 'lessons.md'), lessons);
  writeFileSync(join(memoryDir, 'state.json'), JSON.stringify(state, null, 2) + '\n');
  writeFileSync(join(memoryDir, 'run-log.md'), '# Run log\n\n');
  appendFileSync(join(memoryDir, 'run-log.md'),
    '- ' + stamp + ' verify=' + (failures === 0 ? 'PASS' : 'FAIL')
    + ' checks=' + CHECKS.length + '\n');
  log('memory triad written to: ' + memoryDir);
  log('files: lessons.md, state.json, run-log.md');
}

let crashed = false;
try {
  await main();
} catch (err) {
  crashed = true;
  log('DEMO ERROR: ' + (err && err.message ? err.message : String(err)));
} finally {
  await new Promise((resolve) => {
    if (typeof server.closeIdleConnections === 'function') server.closeIdleConnections();
    if (typeof server.closeAllConnections === 'function') server.closeAllConnections();
    server.close(resolve);
  });
}

const total = CHECKS.length;
if (!crashed && failures === 0) {
  log('');
  log('DEMO PASSED (' + total + ' checks)');
  process.exitCode = 0;
} else {
  log('');
  const failed = failures > 0 ? failures : 1;
  const denom = total >= failed ? total : failed;
  log('DEMO FAILED (' + failed + ' of ' + denom + ' checks failed)');
  process.exitCode = 1;
}
