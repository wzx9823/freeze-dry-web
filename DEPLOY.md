# 冻干工艺优化 · 外网部署指南（手机/电脑随时随地访问）

本地门户（`serve_local.js`）只能在同一 WiFi 下用手机访问。若要在**任意网络**用手机/电脑打开，把 `pwa/` 文件夹部署到国内静态托管即可。推荐 **腾讯云 CloudBase 静态网站托管**：微信扫码登录、拖拽上传、**免 AK（AccessKey）**、域名 `*.service.tcloudbase.com` **国内直连极快**。

---

## 方式一：网页端拖拽（零命令，推荐）

1. 打开 [腾讯云 CloudBase 控制台](https://console.cloud.tencent.com/tcb)，用**微信扫码**登录（无需 AK）。
2. 新建一个环境（开通"静态网站托管"），或进入已有环境。
3. 左侧菜单进入 **「静态网站托管」→「文件管理」**，点击**上传**，把本机 `pwa/` 文件夹里的**全部文件**（含 `index.html`、`sw.js`、`manifest.json`、`icon-192.png`、`icon-512.png`、`qr.js`、`_headers`、`vercel.json` 等）上传到根目录。
4. 上传完成后，在「设置」里复制**默认域名**，形如：
   ```
   https://xxx-xxxxxxx.service.tcloudbase.com
   ```
   这就是你的**永久外网地址**。
5. 手机/电脑在任意网络打开该地址即可使用；浏览器「添加到主屏幕」后像 App 一样启动。

> 提示：`sw.js` 需要 HTTPS，CloudBase 默认已提供，PWA 离线能力正常生效；`_headers` 已配置缓存与 `no-cache` 策略，更新后刷新即生效。

---

## 方式二：命令行（环境已预装 `tcb` CLI，需密钥）

仅当你愿意使用腾讯云 **SecretId / SecretKey** 时适用（你此前表示"不会 AK"，故默认不推荐）：

```bash
# 在 pwa/ 目录下
tcb login            # 浏览器微信扫码（仅首次）
tcb hosting:deploy . # 部署当前目录到静态托管
```

---

## 两种通道对比

| 通道 | 适用场景 | 是否需要网络 | 是否需要账号 | 地址形态 |
|------|----------|--------------|--------------|----------|
| 本地门户（serve_local.js） | 同一 WiFi 内手机/电脑 | 仅局域网，无需外网 | 否 | `http://电脑IP:8080/` |
| CloudBase 外网 | 任意网络随时随地 | 需要外网 | 微信扫码（免 AK） | `https://xxx.service.tcloudbase.com` |

外网部署后，**数据仍在你本地浏览器/云同步中**，CloudBase 仅托管静态页面，不存储你的工艺数据。

---

## 更新到新版本

重复方式一：把新版 `pwa/` 内容重新上传覆盖即可（版本号见页面顶栏 `Web v3.99`）。
