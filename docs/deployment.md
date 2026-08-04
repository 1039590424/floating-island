# 部署与推送指南

个人工作站部署在 **GitHub Pages**，通过 SSH key 免密推送。本文件记录完整的配置与日常推送流程，供 AI 助手或本人参考。

## 线上信息

| 项目 | 值 |
|------|-----|
| GitHub 用户名 | `1039590424` |
| 仓库名 | `floating-island` |
| 仓库地址（HTTPS） | https://github.com/1039590424/floating-island |
| 仓库地址（SSH） | `git@github.com:1039590424/floating-island.git` |
| 线上访问地址 | https://1039590424.github.io/floating-island/ |
| 仓库可见性 | Public |
| 部署来源 | `main` 分支根目录（`/`） |
| 已配置 `.nojekyll` | 是（禁用 Jekyll 处理，保留 `_` 开头的文件） |

## 本地环境配置（已完成，仅参考）

### 1. Git 全局配置
- 用户名：`1039590424`
- 邮箱：`87410847+1039590424@users.noreply.github.com`
- 代理：`http.proxy = http://127.0.0.1:7897`，`https.proxy = http://127.0.0.1:7897`
- SSL 后端：仓库本地 `http.sslBackend = schannel`

### 2. 网络代理
- 本地代理（Clash 等）监听 `127.0.0.1:7897`
- git 已配置走该代理（直连 github.com 不通，必须走代理）
- 推送前确保代理软件在运行，且节点能访问 github.com（浏览器打开 https://github.com 验证）

### 3. SSH key（免密推送）
- 密钥类型：ed25519
- 私钥路径：`C:\Users\Frank\.ssh\id_ed25519`
- 公钥路径：`C:\Users\Frank\.ssh\id_ed25519.pub`
- 公钥已添加到 GitHub 账户（Settings → SSH and GPG keys）
- SSH 配置文件 `~/.ssh/config` 中 github.com 走 HTTP 代理

## 日常推送流程

每次修改代码后，按以下步骤推送：

### 步骤 1：检查改动
```powershell
git status
git diff
```

### 步骤 2：暂存并提交
```powershell
git add -A
git commit -m "描述本次改动内容"
```
> 提交信息用中文简明描述改了什么，例如：`优化小精灵穿梭动画`、`修复工具台布局`。

### 步骤 3：推送到 GitHub
```powershell
git push
```
- 首次推送已设置 upstream（`origin/main`），直接 `git push` 即可
- 推送走 SSH key 免密，无需输入任何账号密码或 token
- 推送后 GitHub Pages 会自动触发重新构建

### 步骤 4：等待线上生效
- 推送后约 1-2 分钟，线上站点自动更新
- 访问 https://1039590424.github.io/floating-island/ 查看效果
- 若看到旧内容，强刷浏览器（Ctrl+Shift+R）清缓存

## 故障排查

### 推送失败：SSL/TLS 握手错误
**原因**：代理节点对 github.com 不通。
**解决**：
1. 确认代理软件（Clash 等）正在运行
2. 切换到一个能访问 GitHub 的节点，或开启全局模式
3. 浏览器打开 https://github.com 验证能秒开
4. 重新 `git push`

### 推送失败：Permission denied (publickey)
**原因**：SSH key 未添加到 GitHub，或私钥路径不对。
**解决**：
1. 确认 `C:\Users\Frank\.ssh\id_ed25519` 存在
2. 到 https://github.com/settings/keys 确认公钥已添加
3. 测试：`ssh -T git@github.com`（应返回 "Hi 1039590424!"）

### 线上未更新
**原因**：浏览器缓存或构建未完成。
**解决**：
1. Ctrl+Shift+R 强刷
2. 到 https://github.com/1039590424/floating-island/actions 查看构建状态
3. 确认已 `git push` 成功

### 资源版本号（前端缓存）
修改 JS/CSS 后，在引用处递增版本号以强制浏览器加载新文件：
- `index.html`：`scripts/main.js?v=XXm`
- `scripts/main.js`：`import ... from './showcase/map3d.js?v=XXm'`
- `scripts/app.js`：`import ... from './showcase/map3d.js?v=XXm'`

## 首次部署历史记录

- 初始化本地 git 仓库，首次提交 71 个文件
- 通过 HTTPS + Personal Access Token 完成首次推送
- 通过 GitHub Pages API 启用站点（`main` 分支根目录）
- 后续配置 SSH key 实现免密推送

## 重要安全提醒

- Personal Access Token 等同于密码，使用后应立即吊销
- 吊销地址：https://github.com/settings/tokens
- SSH 私钥 `id_ed25519` 切勿上传到任何仓库或分享给他人
- `.gitignore` 已排除敏感文件，保持其配置不被修改
