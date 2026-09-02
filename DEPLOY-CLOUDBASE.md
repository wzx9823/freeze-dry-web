# 部署到腾讯云 CloudBase（实时云同步 · 国内极快）

> 目标：把冻干工艺优化 Web 部署到 CloudBase 静态托管，并用一个云函数 `sync` 当同步后端，
> 让**手机 ↔ 电脑**改一处、另一端约 25 秒自动同步（端到端加密，云端只存密文）。
> 这是目前唯一能绕开 netlify 被墙、实现**真·自动实时同步**的国内通道。

---

## 已为你准备好的文件（本目录内）

| 文件 | 作用 |
|---|---|
| `cloudbase/functions/sync/index.js` | 云函数：按同步码哈希 `k` 存/取 AES-GCM 密文 blob，服务端不解密 |
| `cloudbase/functions/sync/package.json` | 依赖 `@cloudbase/node-sdk`（部署时自动安装） |
| `cloudbaserc.json` | CloudBase CLI 部署配置（兜底用，主走 MCP） |
| `index.html`(v3.991) | 已改：CloudBase 域自动用同源 `/sync` + 25s 周期拉取；无后端时降级为手动备份 |

---

## 方式一（推荐）：连接 CloudBase 连接器，我来一键部署

1. 在 WorkBuddy 左侧「连接器」面板找到 **腾讯云 CloudBase**，点「连接」。
2. 按提示 **微信扫码 / 设备码登录**（免 AK、免密钥，无需填 SecretId）。
3. 连线成功后回来跟我说一声「CloudBase 已连」，我会用 MCP 一次性完成：
   - 开通/绑定环境（envId）
   - 创建 NoSQL 集合 `sync_blobs`（空集合即可）
   - 部署云函数 `sync`（Nodejs18.15，自动装依赖）
   - 配置**静态托管函数路由**：把同源 `/sync` 映射到 `sync` 云函数
   - 上传 `pwa/` 到静态托管
   - 验证 `/sync` 与首页均返回 200
4. 部署完把 `https://<envId>.service.tcloudbase.com/` 发我，我验证实时同步。

---

## 方式二（手动 · 网页控制台，零命令）

### 第 1 步 登录并开环境
- 打开 https://tcb.cloud.tencent.com → 微信扫码登录
- 新建环境（每个账号有 1 个免费环境，3000 资源点/月）→ 记下 **环境 ID（envId）**

### 第 2 步 建集合
- 进入环境 → **数据库（文档型）** → 新建集合 `sync_blobs`（权限默认即可，云端函数以管理员身份读写，不受安全规则限制）

### 第 3 步 部署云函数 sync
- **云函数** → 新建函数 `sync`，运行环境选 **Nodejs18.15**
- 把 `cloudbase/functions/sync/index.js` 与 `package.json` 内容粘进去（或本地用 CLI：`tcb fn deploy sync`）
- 保存并部署，等「部署成功」

### 第 4 步 配函数路由（关键，让 `/sync` 同源可用）
- 环境 → **静态网站托管** → **函数路由** → 添加路由
- 路径：`/sync` → 关联云函数：`sync`
- （若无"函数路由"入口，改在「HTTP 访问服务」暴露 `sync` 为公开路径，并确保函数返回 `Access-Control-Allow-Origin: *`——代码已带）

### 第 5 步 上传静态站点
- **静态网站托管** → 上传文件 → 把本目录 `pwa/` 下**全部文件**（含 `index.html`、`sw.js`、`manifest.json`、`version.json`、`.nojekyll`、改好的云函数目录可忽略）拖进去
- 等 CDN 刷新（约 1–2 分钟）

### 第 6 步 验证
- 浏览器开 `https://<envId>.service.tcloudbase.com/`
- F12 控制台：`fetch('/sync?k=test').then(r=>r.json())` 应返回 `{ok:true}`（无 data）
- 应用内：数据页点「☁️ 创建同步码」→ 另一台设备输同一码 → 两端自动互通

---

## 怎么用实时同步（部署后）

1. 任一设备打开 CloudBase 地址 → 数据页「☁️ 创建同步码」→ 记下同步码（仅本机显示）。
2. 另一台设备打开同一地址 → 「☁️ 连接同步码」→ 输入同一码。
3. 之后：在电脑端改了配方/AI 数据/课程进度 → **约 25 秒后手机端自动拉取并刷新**；反向同理。
4. 同步码即"房间钥匙"，两端相同即互通；换码即换独立空间。数据全程 AES-GCM 加密，CloudBase 仅存密文。

---

## 与现有通道的关系

| 通道 | 实时同步 | 说明 |
|---|---|---|
| 本地 file:// / 本地服务器 | ❌ | 离线，用「📦 备份/恢复」手动互通 |
| GitHub Pages | ❌ | 静态托管无后端，手动互通 |
| **CloudBase（本方案）** | ✅ | 真·自动实时，国内极快 |
| Netlify（旧） | ❌ | 你的网络打不开 netlify.app |

> 部署到 CloudBase 后，`index.html` 已自适应：只有 `*.tcloudbase.com` 域才启用 `/sync` 与周期拉取；
> 本地 / GitHub Pages 打开时自动跳过，回退为手动备份，**互不干扰**。
