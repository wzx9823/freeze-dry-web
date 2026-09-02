# 部署到腾讯云 CloudBase（实时云同步 · 国内极快）

> 状态：**已上线并验证通过（2026-09-02）**。
> 把冻干工艺优化 Web 部署到 CloudBase 静态托管，并用云函数 `sync` 当同步后端，
> 让**手机 ↔ 电脑**改一处、另一端约 25 秒自动同步（端到端加密，云端只存密文）。
> 这是目前唯一能绕开 netlify 被墙、实现**真·自动实时同步**的国内通道。

---

## 实际部署结果（已验证）

| 项 | 值 |
|---|---|
| 环境 ID (envId) | `wzx9823-d3gmk6n9d1e3e671a`（上海区，体验版，2027-03-01 到期） |
| 运行模式 | **PostgreSQL 模式**（NoSQL/文档型未开通 → 故同步后端改用**云存储**，非 NoSQL/PG） |
| 静态托管域名 | `https://wzx9823-d3gmk6n9d1e3e671a-1471241944.tcloudbaseapp.com/` |
| 云函数 | `sync`（Event 函数，Nodejs18.15，`@cloudbase/node-sdk` 2.11.0） |
| 函数路由域名 | `https://wzx9823-d3gmk6n9d1e3e671a-1471241944.ap-shanghai.app.tcloudbase.com/sync` |
| 同步存储桶 | `777a-wzx9823-d3gmk6n9d1e3e671a-1471241944`，路径前缀 `syncblobs/` |
| 权限 | 函数路由匿名调用已开（`invoke:true`）；CORS `Access-Control-Allow-Origin: *` |
| app 版本 | v3.991（自适应 CloudBase 域 + 25s 周期拉取） |

> 备注：早期曾建过 PostgreSQL 表 `sync_blobs`（migrations/20260902110600_create_sync_blobs.sql），
> 但因 node-sdk 2.11.0 无 `app.rdb()` / NoSQL 未开通，**已废弃改用云存储**，该表留空无害。

---

## 同步后端原理（云存储版）

- 函数 `cloudbase/functions/sync/index.js`：按 `k = sha256(同步码)` 在云存储 `syncblobs/<k>.json` 存/取 **AES-GCM 密文**。
  - 服务端**不解密**，只透存/透取 Blob。
  - 写入：`app.uploadFile({ cloudPath, fileContent: Buffer.from(data,'utf8') })`
  - 读取：`app.downloadFile({ fileID })` → 文件不存在时返回 `{ok:true,data:null}`（视为空）。
- 端到端加密在 app 端完成：同步码 `PBKDF2 → AES-GCM-256`，`k = sha256(同步码)`，密钥只存本机。
- app 在 CloudBase 域（`*.tcloudbaseapp.com`）打开时，由当前 host **推导**函数绝对地址
  `https://<envId>.ap-shanghai.app.tcloudbase.com/sync`（两域可互推，跨域但 CORS 已开）；
  本地 / GitHub Pages 无后端时回退 Netlify 端点，不可达则降级为「📦 备份/恢复」手动互通。

---

## 怎么用实时同步（已上线）

1. 手机或电脑浏览器打开 `https://wzx9823-d3gmk6n9d1e3e671a-1471241944.tcloudbaseapp.com/`
   （微信里直接发链接给另一台设备也行，国内极快）。
2. 任一端 → 数据页「☁️ 创建同步码」→ 记下同步码（仅本机显示，不上传）。
3. 另一端 → 「☁️ 连接同步码」→ 输入同一码。
4. 之后：在电脑端改了配方/AI 数据/课程进度 → **约 25 秒后手机端自动拉取并刷新**；反向同理。
5. 同步码即"房间钥匙"，两端相同即互通；换码即换独立空间。数据全程 AES-GCM 加密，CloudBase 仅存密文。

---

## 重新部署 / 改代码（MCP 路径）

> 须经 CloudBase 连接器（左侧「连接器」微信扫码登录，免 AK）。以下为本次实际走过的步骤备忘。

1. 改 `cloudbase/functions/sync/index.js`（或 `pwa/index.html`）后，用 CloudBase MCP：
   - `manageFunctions deployFunction`（envId 同上，函数名 `sync`，runtime `Nodejs18.15`）。
2. 上传静态站点：把 `pwa/` 下 `index.html / sw.js / manifest.json / version.json / .nojekyll` 传到**静态托管**，
   首页文档设为 `index.html`。
3. 函数路由：`manageGateway` 在 HTTPSERVICE 默认域建 `/sync` → 关联 `sync` 函数（静态默认域 `*.tcloudbaseapp.com`
   **不支持**手动函数路由，必须用 HTTPSERVICE 默认域 `*.ap-shanghai.app.tcloudbase.com`）。
4. 匿名权限：`modifyEnvAuthzConfig` 设 `{"invoke":true}`，确保未登录也能调 `/sync`。
5. 验证：
   - `curl -I https://<envId>-1471241944.tcloudbaseapp.com/` → 200
   - `curl -X POST https://<envId>-1471241944.ap-shanghai.app.tcloudbase.com/sync -d '{"k":"t","data":"x"}'` → `{"ok":true}`
   - `curl https://<envId>-1471241944.ap-shanghai.app.tcloudbase.com/sync?k=t` → `{"ok":true,"data":"x"}`
   - ⚠️ **冷启动注意**：函数更新后首次调用可能偶发 `FUNCTIONS_INVOCATION_FAILED`（旧实例/冷启动），
     重试 1–2 次即命中新版，属正常传播延迟，非代码缺陷。

---

## 本地文件清单（本仓库）

| 文件 | 作用 |
|---|---|
| `cloudbase/functions/sync/index.js` | 云函数源码（云存储版，已部署） |
| `cloudbase/functions/sync/package.json` | 依赖 `@cloudbase/node-sdk` |
| `cloudbase/migrations/20260902110600_create_sync_blobs.sql` | 早期 PG 表（已废弃，留档） |
| `cloudbaserc.json` | CloudBase CLI 兜底配置 |
| `index.html`(v3.991) | 已改：CloudBase 域自动用推导 `/sync` + 25s 周期拉取；无后端降级手动备份 |

---

## 与现有通道的关系

| 通道 | 实时同步 | 说明 |
|---|---|---|
| 本地 file:// / 本地服务器 | ❌ | 离线，用「📦 备份/恢复」手动互通 |
| GitHub Pages | ❌ | 静态托管无后端，手动互通 |
| **CloudBase（本方案）** | ✅ | 真·自动实时，国内极快 |
| Netlify（旧） | ❌ | 你的网络打不开 netlify.app |
