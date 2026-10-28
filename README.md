# vmcode

> [🇻🇳 Tiếng Việt](README_VI.md) • 🇬🇧 English

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
npm i @mmo69/vmcode
# or just copy index.mjs — the whole library is a single file
```

## Quick start

```js
import { VmCode } from '@mmo69/vmcode';
import fs from 'node:fs';

const vm = new VmCode({ apiKey: 'tnvm_YOUR_KEY' });

const out = await vm.protect(
  fs.readFileSync('src/app.js', 'utf8'),
  { preset: 'medium', target: 'node' },
);
fs.writeFileSync('app.protected.js', out.result);
console.log(`Done in ${out.elapsed}ms — quota used: ${out.usage?.bytes}/${out.usage?.quotaMB}MB`);
```

Or protect a single function inline:

```js
const { result } = await vm.protect('function f(x){ return x*3+1; }', { preset: 'low' });
console.log(result); // protected code — runs exactly like the original
```

## Presets

| Option (order matches the tables below) | `low` | `medium` | `max` |
|---|:---:|:---:|:---:|
| `targetMode` | `root` | `root` | `root` |
| `preprocessIdentifiers` | – | ✓ | ✓ |
| `encryptBytecode` | – | ✓ | ✓ |
| `debugProtection` | – | – | ✓ |
| `dynamicOpcodes` | ✓ | ✓ | ✓ |
| `decoyOpcodes` | – | ✓ | ✓ |
| `deadCodeInjection` | – | – | ✓ |
| `stackEncoding` | – | – | ✓ |
| `rollingCipher` | – | ✓ | ✓ |
| `integrityBinding` | – | – | ✓ |
| `vmShielding` | – | – | ✓ |
| `mixedBooleanArithmetic` | – | – | ✓ |
| `handlerFragmentation` | – | – | ✓ |
| `stringAtomization` | – | ✓ | ✓ |
| `polymorphicDecoder` | – | ✓ | ✓ |
| `scatteredKeys` | – | ✓ | ✓ |
| `blockPermutation` | – | – | ✓ |
| `opcodeMutation` | – | – | ✓ |
| `bytecodeScattering` | – | ✓ | ✓ |
| `incrementalCipher` | – | – | ✓ |
| `semanticOpacity` | – | – | ✓ |
| `observationResistance` | – | – | ✓ |

- **`low`** *(default)* — fastest, only `dynamicOpcodes`: plain VM bytecode,
  compact output. A 122KB file takes ~a few hundred ms.
- **`medium`** — balanced: 9/21 options on. A 122KB file takes ~3s.
- **`max`** — all 21 options. Strongest but slow — **cost scales with
  FUNCTION COUNT**; a many-function file (800+) can take minutes — raise
  `timeoutMs` when using it.

**Auto-enable** (the engine turns these on by itself, no need to declare):
enabling `integrityBinding` / `vmShielding` / `opcodeMutation` /
`incrementalCipher` / `observationResistance` → auto-enables `rollingCipher`;
enabling `stringAtomization` → auto-enables `polymorphicDecoder`.

## Engine options

Pass as the second argument of `submit()` / `protect()`. Booleans only work
as **opt-IN additions** to the preset (the server only accepts `true` — you
cannot turn off an option the preset already enables):

```js
await vm.protect(code, {
  preset: 'medium',            // low | medium | max (default low)
  targetMode: 'comment',       // root (default) | comment — Pro+
  target: 'node',              // browser (default) | node — Pro+
  rollingCipher: true,         // turn an extra option ON top of the preset
  vmShielding: true,           // → rollingCipher comes along automatically
});
```

### `targetMode`

- **`root`** *(default)* — protects ALL top-level functions of the file
- **`comment`** *(Pro+)* — only protects functions marked by a leading comment:
  ```js
  // tnvm:vm
  function secret(a, b) { /* only this function gets VM-compiled */ }
  ```

### `target`

- **`browser`** *(default)* — output runs in the browser
- **`node`** *(Pro+)* — output runs in NodeJS

### Security

| Option | Description |
|---|---|
| `rollingCipher` | Position-dependent XOR encryption on every instruction |
| `integrityBinding` | Bind bytecode decryption to interpreter source integrity |
| `debugProtection` | Multi-layered anti-debugger with escalating response |
| `vmShielding` | Per-function micro-interpreters with independent opcode shuffle |
| `incrementalCipher` | Move instruction decryption into the VM dispatch loop |
| `semanticOpacity` | Opaque predicates, handler aliasing, and encoding diversity |
| `observationResistance` | Silent computation corruption when instrumentation detected |
| `encryptBytecode` | RC4 encryption using an environment fingerprint key |

### Obfuscation

| Option | Description |
|---|---|
| `mixedBooleanArithmetic` | Replace arithmetic/bitwise ops with MBA expressions |
| `stackEncoding` | XOR-encode VM stack values during execution |
| `deadCodeInjection` | Insert unreachable bytecode sequences after RETURN |
| `handlerFragmentation` | Split handlers into interleaved fragments |
| `stringAtomization` | Replace string literals with encoded table lookups |
| `blockPermutation` | Shuffle bytecode basic block order |
| `opcodeMutation` | Runtime handler table mutations via MUTATE opcodes |
| `bytecodeScattering` | Split bytecode into mixed-type fragments scattered through output |

### Optimization

| Option | Description |
|---|---|
| `preprocessIdentifiers` | Rename identifiers before compilation |
| `dynamicOpcodes` | Filter unused opcode handlers from interpreter |
| `decoyOpcodes` | Inject realistic fake opcode handlers |
| `polymorphicDecoder` | Per-build random chain of reversible byte operations |
| `scatteredKeys` | Fragment key materials across closure tiers |

## Plan gating

API keys are only issued from the **Pro** plan up, so any valid `tnvm_…` key
unlocks every preset and all custom options:

| Plan | Presets | Custom options | Max request size |
|---|---|:---:|---|
| Anonymous (web) | low, medium | ✗ | 128KB |
| Free | low, medium | ✗ | 268KB |
| **Pro** | low, medium, max | ✓ | 1MB |
| Team / Business | low, medium, max | ✓ + priority queue | 3MB |

## API

### `new VmCode({ apiKey, baseUrl, pollMs, timeoutMs, gzip })`

| Option | Default | Note |
|---|---|---|
| `apiKey` | — | **required**, `tnvm_…` (Pro+) |
| `baseUrl` | `https://JsVM.MMO69.Com` | change for a local server |
| `pollMs` | `1000` | result polling interval |
| `timeoutMs` | `600000` | max wait of `protect()` (preset `max` on many-function files can take minutes) |
| `gzip` | `true` | gzip requests > 1KB |

### Methods

| Method | Returns |
|---|---|
| `vm.protect(code, options?, callOpts?)` | `{ result, elapsed, usage? }` — submits and polls until done |
| `vm.submit(code, options?)` | `{ taskId, status: 'pending' }` — creates the task, keep the `taskId` |
| `vm.poll(taskId)` | `{status:'pending'\|'running'}` \| `done{result,elapsed,usage}` \| `error{error}` \| `gone` |
| `vm.meta()` | `{ options, presets, plans, … }` from `/api/meta` |

`callOpts` = `{ pollMs, timeoutMs }` overrides the constructor config for a
single call.

**The result can be fetched only ONCE** — after a `done` poll the task is
deleted; unclaimed tasks expire after 2 hours. Queue-friendly: after
`submit()` you can do other work and `poll()` whenever you're ready.

### `VmError`

Every failure throws a `VmError` — `err.code` matches the API error codes:
`size` `options_locked` `quota` `rate` `engine` `task` `timeout` `network` …
(`err.status` = HTTP status, `0` = network/timeout error on the SDK side).
On `protect()` timeout the message already includes the `taskId` so you can
resume polling manually.
