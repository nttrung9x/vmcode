// vmcode — NodeJS SDK gọi API bảo vệ mã JsVM.MMO69.Com (TNVM VMCode).
// API chạy async kiểu giải captcha: POST /api/vm → {taskId} → poll POST /api/vm/result.
// Cần API key (tnvm_…, gói Pro+) — tạo tại https://JsVM.MMO69.Com/client/apikeys.html
// Zero dependency — chỉ dùng fetch có sẵn của Node ≥ 18 (response gzip tự giải nén).

import zlib from 'node:zlib';

const DEFAULT_BASE = 'https://JsVM.MMO69.Com';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Lỗi từ SDK/API — err.code khớp mã API: size, options_locked, quota, rate, engine, task, timeout, network… */
export class VmError extends Error {
  constructor(message, code, status = 0) {
    super(message);
    this.name = 'VmError';
    this.code = code || 'error';
    this.status = status; // HTTP status (0 = lỗi mạng/timeout phía SDK)
  }
}

export class VmCode {
  /**
   * @param {object} opts
   * @param {string}  opts.apiKey     API key tnvm_… (bắt buộc — gói Pro trở lên)
   * @param {string} [opts.baseUrl]   mặc định https://JsVM.MMO69.Com (đổi khi chạy local/dev)
   * @param {number} [opts.pollMs]    nhịp poll kết quả (mặc định 1000)
   * @param {number} [opts.timeoutMs] thời gian chờ tối đa của protect() (mặc định 10 phút)
   * @param {boolean} [opts.gzip]     nén gzip request > 1KB (mặc định true)
   */
  constructor({ apiKey, baseUrl, pollMs = 1000, timeoutMs = 10 * 60_000, gzip = true } = {}) {
    if (!apiKey) throw new VmError('Thiếu apiKey (tnvm_…) — tạo tại /client/apikeys.html, cần gói Pro+', 'apikey');
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
    if (this.gzip && json.length > 1024) { // body lớn → nén gzip, server tự giải nén
      payload = zlib.gzipSync(Buffer.from(json));
      headers['content-encoding'] = 'gzip';
    }
    let res;
    try {
      res = await fetch(this.base + path, { method: 'POST', headers, body: payload });
    } catch (err) {
      throw new VmError(`Không kết nối được ${this.base}: ${err.message}`, 'network');
    }
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new VmError((data && data.error) || `HTTP ${res.status}`, (data && data.code) || 'http', res.status);
    return data;
  }

  /** GET /api/meta — options + presets + plans (nền để render UI chọn option) */
  async meta() {
    let res;
    try { res = await fetch(this.base + '/api/meta', { headers: { authorization: `Bearer ${this.apiKey}` } }); }
    catch (err) { throw new VmError(`Không kết nối được ${this.base}: ${err.message}`, 'network'); }
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new VmError((data && data.error) || `HTTP ${res.status}`, (data && data.code) || 'http', res.status);
    return data;
  }

  /** Bước 1 — tạo task compile → {taskId, status:'pending'} (giữ taskId để poll) */
  submit(code, options = {}) {
    if (typeof code !== 'string' || !code.trim()) throw new VmError('Thiếu code (chuỗi JavaScript nguồn)', 'missing');
    return this.#post('/api/vm', { code, options });
  }

  /** Bước 2 — poll task → {status:'pending'|'running'} | done{result,elapsed,usage} | error | gone */
  poll(taskId) {
    return this.#post('/api/vm/result', { taskId });
  }

  /**
   * Submit + tự poll tới khi xong — cách dùng nhanh nhất.
   * @param {string} code       mã JavaScript nguồn
   * @param {object} options    preset 'low'|'medium'|'max' + targetMode 'root'|'comment' +
   *                            target 'browser'|'node' + boolean engine option (xem vm.meta())
   * @param {object} [callOpts] {pollMs, timeoutMs} đè cấu hình constructor cho lần gọi này
   * @returns {Promise<{result:string, elapsed:number, usage?:object}>}
   */
  async protect(code, options = {}, { pollMs = this.pollMs, timeoutMs = this.timeoutMs } = {}) {
    const { taskId } = await this.submit(code, options);
    const deadline = Date.now() + timeoutMs;
    for (;;) {
      if (Date.now() > deadline) {
        throw new VmError(`Timeout ${timeoutMs}ms — task ${taskId} chưa xong, dùng poll("${taskId}") để thử tiếp`, 'timeout');
      }
      await sleep(pollMs);
      const r = await this.poll(taskId);
      if (r.status === 'done') return { result: r.result, elapsed: r.elapsed, usage: r.usage };
      if (r.status === 'error') throw new VmError(r.error || 'Engine xử lý lỗi', 'engine');
      if (r.status === 'gone') throw new VmError(r.error || 'Task không tồn tại hoặc đã lấy kết quả', 'task');
      // pending / running → chờ tick kế tiếp
    }
  }
}

export default VmCode;
