# js-vm-code-mmo69-com

NodeJS SDK for the **JsVM.MMO69.Com** VMCode protection API — compile plain
JavaScript into server-side TNVM **VM bytecode** without shipping the engine
to the browser.

- **Async task API** (captcha-solver style): submit → `taskId` → poll — made
  for large files and slow presets
- **Zero dependencies** (Node ≥ 18, built-in `fetch`)
- **gzip uploads** for large payloads
- Needs an **API key** (`tnvm_…`, Pro plan or higher) — create one at
  <https://JsVM.MMO69.Com/client/apikeys.html>

## Install

```bash
npm i js-vm-code-mmo69-com
# hoặc chỉ copy index.mjs — cả thư viện gói gọn trong 1 file
```

## Quick start

```js
import { VmCode } from 'js-vm-code-mmo69-com';
import fs from 'node:fs';

const vm = new VmCode({ apiKey: 'tnvm_YOUR_KEY' });

const out = await vm.protect(
  fs.readFileSync('src/app.js', 'utf8'),
  { preset: 'medium', target: 'node' },
);
fs.writeFileSync('app.protected.js', out.result);
console.log(`Done in ${out.elapsed}ms — quota used: ${out.usage?.bytes}/${out.usage?.quotaMB}MB`);
```

## Manual submit / poll (queue-friendly)

```js
const { taskId } = await vm.submit(source, { preset: 'max' });
// … làm việc khác, poll khi cần (kết quả chỉ lấy được MỘT lần) …
const r = await vm.poll(taskId); // {status:'pending'|'running'} | 'done' | 'error' | 'gone'
if (r.status === 'done') console.log(r.result);
```

## API

### `new VmCode({ apiKey, baseUrl, pollMs, timeoutMs, gzip })`

| Option | Default | Note |
|---|---|---|
| `apiKey` | — | **required**, `tnvm_…` (Pro+) |
| `baseUrl` | `https://JsVM.MMO69.Com` | đổi khi chạy server local |
| `pollMs` | `1000` | nhịp poll kết quả |
| `timeoutMs` | `600000` | thời gian chờ tối đa của `protect()` (preset `max` trên file lớn có thể mất vài phút) |
| `gzip` | `true` | nén gzip request > 1KB |

### `vm.protect(code, options?, callOpts?)` → `{ result, elapsed, usage? }`

- `options`: `preset` `'low' | 'medium' | 'max'` (mặc định `low`),
  `targetMode` `'root' | 'comment'`, `target` `'browser' | 'node'`,
  + boolean engine toggles (danh sách đầy đủ lấy từ `vm.meta().options`)
- `callOpts`: `{ pollMs, timeoutMs }` đè cấu hình constructor cho lần gọi này

### `vm.submit(code, options?)` → `{ taskId, status: 'pending' }`
### `vm.poll(taskId)` → `{ status, result?, elapsed?, usage?, error? }`
### `vm.meta()` → `{ options, presets, plans, … }`

### `VmError`

Mọi lỗi đều throw `VmError` — `err.code` khớp mã lỗi API:
`size` `options_locked` `quota` `rate` `engine` `task` `timeout` `network` …
(`err.status` = HTTP status, `0` = lỗi mạng/timeout phía SDK).

## Dùng nhanh (Tiếng Việt)

```js
import { VmCode } from 'js-vm-code-mmo69-com';
const vm = new VmCode({ apiKey: 'tnvm_CUA_BAN' }); // cần gói Pro+
const { result } = await vm.protect('function f(x){ return x*3+1; }', { preset: 'low' });
console.log(result); // mã đã được bảo vệ — chạy y hệt bản gốc
```

API chạy bất đồng bộ: `submit()` trả `taskId` ngay, `poll(taskId)` lấy kết quả
(chỉ lấy được 1 lần; task không lấy sẽ hết hạn sau 2 giờ).
