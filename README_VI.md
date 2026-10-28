# vmcode

> 🇻🇳 Tiếng Việt • [🇬🇧 English](README.md)

SDK NodeJS cho API bảo vệ mã **JsVM.MMO69.Com** (TNVM VMCode) — biên dịch
JavaScript thường thành **VM bytecode** xử lý bên server, không ship engine ra
trình duyệt.

- **API bất đồng bộ** kiểu captcha-solver: submit → `taskId` → poll — sinh ra
  cho file lớn và preset chậm
- **Zero dependencies** (Node ≥ 18, dùng `fetch` có sẵn)
- **gzip upload** cho payload lớn
- Cần **API key** (`tnvm_…`, gói Pro trở lên) — tạo tại
  [https://JsVM.MMO69.Com/client/apikeys.html](https://JsVM.MMO69.Com/client/apikeys.html)

## Cài đặt

```bash
npm i @mmo69/vmcode
# hoặc chỉ copy index.mjs — cả thư viện gói gọn trong 1 file
```

## Dùng nhanh

```js
import { VmCode } from '@mmo69/vmcode';
import fs from 'node:fs';

const vm = new VmCode({ apiKey: 'tnvm_CUA_BAN' });

const out = await vm.protect(
  fs.readFileSync('src/app.js', 'utf8'),
  { preset: 'medium', target: 'node' },
);
fs.writeFileSync('app.protected.js', out.result);
console.log(`Xong sau ${out.elapsed}ms — đã dùng ${out.usage?.bytes}/${out.usage?.quotaMB}MB`);
```

Hoặc inline 1 hàm:

```js
const { result } = await vm.protect('function f(x){ return x*3+1; }', { preset: 'low' });
console.log(result); // mã đã bảo vệ — chạy y hệt bản gốc
```

## Preset

| Option (thứ tự trong bảng ở dưới) | `low` | `medium` | `max` |
| --------------------------------------- | :------: | :--------: | :------: |
| `targetMode`                          | `root` |  `root`  | `root` |
| `preprocessIdentifiers`               |    –    |     ✓     |    ✓    |
| `encryptBytecode`                     |    –    |     ✓     |    ✓    |
| `debugProtection`                     |    –    |     –     |    ✓    |
| `dynamicOpcodes`                      |    ✓    |     ✓     |    ✓    |
| `decoyOpcodes`                        |    –    |     ✓     |    ✓    |
| `deadCodeInjection`                   |    –    |     –     |    ✓    |
| `stackEncoding`                       |    –    |     –     |    ✓    |
| `rollingCipher`                       |    –    |     ✓     |    ✓    |
| `integrityBinding`                    |    –    |     –     |    ✓    |
| `vmShielding`                         |    –    |     –     |    ✓    |
| `mixedBooleanArithmetic`              |    –    |     –     |    ✓    |
| `handlerFragmentation`                |    –    |     –     |    ✓    |
| `stringAtomization`                   |    –    |     ✓     |    ✓    |
| `polymorphicDecoder`                  |    –    |     ✓     |    ✓    |
| `scatteredKeys`                       |    –    |     ✓     |    ✓    |
| `blockPermutation`                    |    –    |     –     |    ✓    |
| `opcodeMutation`                      |    –    |     –     |    ✓    |
| `bytecodeScattering`                  |    –    |     ✓     |    ✓    |
| `incrementalCipher`                   |    –    |     –     |    ✓    |
| `semanticOpacity`                     |    –    |     –     |    ✓    |
| `observationResistance`               |    –    |     –     |    ✓    |

- **`low`** *(mặc định)* — nhanh nhất, chỉ `dynamicOpcodes`: bytecode VM thuần,
  output gọn. File 122KB ~vài trăm ms.
- **`medium`** — cân bằng: 9/21 option bật. File 122KB ~3s.
- **`max`** — tất cả 21 option. Mạnh nhất nhưng chậm — **thời gian tăng theo
  SỐ HÀM**, file nhiều hàm (800+) có thể mất vài phút; tăng `timeoutMs` khi dùng.

**Auto-enable** (engine tự bật kèm, không cần khai báo):
bật `integrityBinding` / `vmShielding` / `opcodeMutation` / `incrementalCipher` /
`observationResistance` → tự bật `rollingCipher`; bật `stringAtomization` → tự
bật `polymorphicDecoder`.

## Tuỳ chọn engine (options)

Truyền vào tham số thứ 2 của `submit()` / `protect()`. **Boolean chỉ có tác
dụng BẬT THÊM** ngoài preset (server chỉ nhận `true` — không thể tắt option mà
preset đã bật):

```js
await vm.protect(code, {
  preset: 'medium',            // low | medium | max (mặc định low)
  targetMode: 'comment',       // root (mặc định) | comment — Pro+
  target: 'node',              // browser (mặc định) | node — Pro+
  rollingCipher: true,         // bật THÊM option ngoài preset
  vmShielding: true,           // → tự bật rollingCipher kèm theo
});
```

### `targetMode`

- **`root`** *(mặc định)* — bảo vệ TOÀN BỘ hàm top-level của file
- **`comment`** *(Pro+)* — chỉ bảo vệ hàm có comment đánh dấu ngay phía trên:
  ```js
  // tnvm:vm
  function secret(a, b) { /* chỉ hàm này được VM hoá */ }
  ```

### `target`

- **`browser`** *(mặc định)* — output chạy trong trình duyệt
- **`node`** *(Pro+)* — output chạy trong NodeJS

### Bảo mật (Security)

| Option                    | Mô tả                                                                      |
| ------------------------- | ---------------------------------------------------------------------------- |
| `rollingCipher`         | Mã hoá XOR phụ thuộc vị trí trên từng instruction                    |
| `integrityBinding`      | Ràng buộc giải mã bytecode vào tính toàn vẹn source của interpreter |
| `debugProtection`       | Chống debugger đa tầng, phản ứng leo thang dần                         |
| `vmShielding`           | Micro-interpreter riêng cho từng hàm, xáo trộn opcode độc lập        |
| `incrementalCipher`     | Đưa việc giải mã instruction vào vòng dispatch của VM                |
| `semanticOpacity`       | Opaque predicates, alias handler, đa dạng hoá kiểu mã hoá              |
| `observationResistance` | Âm thầm làm hỏng kết quả tính toán khi phát hiện instrumentation   |
| `encryptBytecode`       | Mã hoá RC4 bằng khoá fingerprint của môi trường chạy                |

### Nghiền mã (Obfuscation)

| Option                     | Mô tả                                                  |
| -------------------------- | -------------------------------------------------------- |
| `mixedBooleanArithmetic` | Thay phép toán số học/bitwise bằng biểu thức MBA  |
| `stackEncoding`          | XOR-encode giá trị trên stack VM trong lúc chạy     |
| `deadCodeInjection`      | Chèn chuỗi bytecode không thể tới ngay sau RETURN   |
| `handlerFragmentation`   | Tách handler thành các mảnh đan xen nhau            |
| `stringAtomization`      | Thay string literal bằng tra bảng đã mã hoá        |
| `blockPermutation`       | Xáo trộn thứ tự basic block của bytecode            |
| `opcodeMutation`         | Đột biến bảng handler lúc runtime qua opcode MUTATE |
| `bytecodeScattering`     | Tách bytecode thành mảnh trộn lẫn rải khắp output |

### Tối ưu (Optimization)

| Option                    | Mô tả                                                      |
| ------------------------- | ------------------------------------------------------------ |
| `preprocessIdentifiers` | Đổi tên identifier trước khi compile                    |
| `dynamicOpcodes`        | Lọc opcode handler không dùng khỏi interpreter           |
| `decoyOpcodes`          | Tiêm các handler opcode giả giống thật                  |
| `polymorphicDecoder`    | Chuỗi phép toán byte ngẫu nhiên, đổi theo từng build |
| `scatteredKeys`         | Phân mảnh key material qua các tầng closure              |

## Phân quyền theo gói

API key chỉ cấp từ gói **Pro** trở lên, nên với key `tnvm_…` mọi preset và
tuỳ biến đều mở:

| Gói            | Preset           |     Tuỳ biến option     | Giới hạn / request |
| --------------- | ---------------- | :------------------------: | -------------------- |
| Ẩn danh (web)  | low, medium      |             ✗             | 128KB                |
| Free            | low, medium      |             ✗             | 268KB                |
| **Pro**   | low, medium, max |             ✓             | 1MB                  |
| Team / Business | low, medium, max | ✓ + hàng đợi ưu tiên | 3MB                  |

## API

### `new VmCode({ apiKey, baseUrl, pollMs, timeoutMs, gzip })`

| Option        | Default                    | Ghi chú                                                                                               |
| ------------- | -------------------------- | ------------------------------------------------------------------------------------------------------ |
| `apiKey`    | —                         | **bắt buộc**, `tnvm_…` (Pro+)                                                               |
| `baseUrl`   | `https://JsVM.MMO69.Com` | đổi khi chạy server local                                                                           |
| `pollMs`    | `1000`                   | nhịp poll kết quả                                                                                   |
| `timeoutMs` | `600000`                 | thời gian chờ tối đa của `protect()` (preset `max` file nhiều hàm có thể mất vài phút) |
| `gzip`      | `true`                   | nén gzip request > 1KB                                                                                |

### Phương thức

| Phương thức                            | Trả về                                                                                           |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `vm.protect(code, options?, callOpts?)` | `{ result, elapsed, usage? }` — submit + tự poll tới khi xong                                 |
| `vm.submit(code, options?)`             | `{ taskId, status: 'pending' }` — tạo task, giữ `taskId`                                    |
| `vm.poll(taskId)`                       | `{status:'pending'\|'running'}` \| `done{result,elapsed,usage}` \| `error{error}` \| `gone` |
| `vm.meta()`                             | `{ options, presets, plans, … }` từ `/api/meta`                                              |

`callOpts` = `{ pollMs, timeoutMs }` đè cấu hình constructor cho 1 lần gọi.

**Kết quả chỉ lấy được MỘT LẦN** — poll nhận `done` xong task bị xoá; task
không ai lấy sẽ hết hạn sau 2 giờ. Queue-friendly: `submit()` xong có thể
làm việc khác, `poll()` khi cần.

### `VmError`

Mọi lỗi đều throw `VmError` — `err.code` khớp mã lỗi API:
`size` `options_locked` `quota` `rate` `engine` `task` `timeout` `network` …
(`err.status` = HTTP status, `0` = lỗi mạng/timeout phía SDK).
`protect()` timeout thì message kèm sẵn `taskId` để poll thủ công tiếp.
