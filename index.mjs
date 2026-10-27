// vmcode — NodeJS SDK for the JsVM.MMO69.Com code-protection API (TNVM VMCode).
// Async captcha-solver style API: POST /api/vm → {taskId} → poll POST /api/vm/result.
// Requires an API key (tnvm_…, Pro plan+) — create at https://JsVM.MMO69.Com/client/apikeys.html
// Zero dependencies — only the Node ≥ 18 built-in fetch (gzip responses auto-decompressed).

import zlib from 'node:zlib';

const DEFAULT_BASE = 'https://JsVM.MMO69.Com';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Error thrown by the SDK/API — err.code matches API codes: size, options_locked, quota, rate, engine, task, timeout, network… */
export class VmError extends Error {
  constructor(message, code, status = 0) {
    super(message);
    this.name = 'VmError';
    this.code = code || 'error';
    this.status = status; // HTTP status (0 = network/timeout error on the SDK side)
  }
}

export class VmCode {
  /**
   * @param {object} opts
   * @param {string}  opts.apiKey     tnvm_… API key (required — Pro plan or higher)
   * @param {string} [opts.baseUrl]   default https://JsVM.MMO69.Com (change for local/dev)
   * @param {number} [opts.pollMs]    result polling interval (default 1000)
   * @param {number} [opts.timeoutMs] max wait of protect() (default 10 minutes)
   * @param {boolean} [opts.gzip]     gzip requests > 1KB (default true)
   */
  constructor({ apiKey, baseUrl, pollMs = 1000, timeoutMs = 10 * 60_000, gzip = true } = {}) {
    if (!apiKey) throw new VmError('Missing apiKey (tnvm_…) — create one at /client/apikeys.html (Pro plan+)', 'apikey');
    this.apiKey = String(apiKey);
    this.base = String(baseUrl || DEFAULT_BASE).replace(/\/+$/, '');
    this.pollMs = pollMs;
    this.timeoutMs = timeoutMs;
    this.gzip = gzip;
  }

  async #post(path, body) {
    const json = JSON.stringify(body);
    const headers = { 'content-type': 'application/json', authorization: `Bearer ${this.apiKey}` };
    let payload = json;
    if (this.gzip && json.length > 1024) { // large body → gzip it, the server decompresses automatically
      payload = zlib.gzipSync(Buffer.from(json));
      headers['content-encoding'] = 'gzip';
    }
    let res;
    try {
      res = await fetch(this.base + path, { method: 'POST', headers, body: payload });
    } catch (err) {
      throw new VmError(`Cannot connect to ${this.base}: ${err.message}`, 'network');
    }
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new VmError((data && data.error) || `HTTP ${res.status}`, (data && data.code) || 'http', res.status);
    return data;
  }

  /** GET /api/meta — options + presets + plans (ground truth for building an option UI) */
  async meta() {
    let res;
    try { res = await fetch(this.base + '/api/meta', { headers: { authorization: `Bearer ${this.apiKey}` } }); }
    catch (err) { throw new VmError(`Cannot connect to ${this.base}: ${err.message}`, 'network'); }
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new VmError((data && data.error) || `HTTP ${res.status}`, (data && data.code) || 'http', res.status);
    return data;
  }

  /** Step 1 — create a compile task → {taskId, status:'pending'} (keep the taskId for polling) */
  submit(code, options = {}) {
    if (typeof code !== 'string' || !code.trim()) throw new VmError('Missing code (JavaScript source string)', 'missing');
    return this.#post('/api/vm', { code, options });
  }

  /** Step 2 — poll the task → {status:'pending'|'running'} | done{result,elapsed,usage} | error | gone */
  poll(taskId) {
    return this.#post('/api/vm/result', { taskId });
  }

  /**
   * Submit + auto-poll until done — the quickest way to use the SDK.
   * @param {string} code       source JavaScript
   * @param {object} options    preset 'low'|'medium'|'max' + targetMode 'root'|'comment' +
   *                            target 'browser'|'node' + boolean engine options (see vm.meta())
   * @param {object} [callOpts] {pollMs, timeoutMs} overrides the constructor config for this call
   * @returns {Promise<{result:string, elapsed:number, usage?:object}>}
   */
  async protect(code, options = {}, { pollMs = this.pollMs, timeoutMs = this.timeoutMs } = {}) {
    const { taskId } = await this.submit(code, options);
    const deadline = Date.now() + timeoutMs;
    for (;;) {
      if (Date.now() > deadline) {
        throw new VmError(`Timeout after ${timeoutMs}ms — task ${taskId} not finished, keep polling with poll("${taskId}")`, 'timeout');
      }
      await sleep(pollMs);
      const r = await this.poll(taskId);
      if (r.status === 'done') return { result: r.result, elapsed: r.elapsed, usage: r.usage };
      if (r.status === 'error') throw new VmError(r.error || 'Engine failed to process the code', 'engine');
      if (r.status === 'gone') throw new VmError(r.error || 'Task not found or result already fetched', 'task');
      // pending / running → wait for the next tick
    }
  }
}

export default VmCode;
