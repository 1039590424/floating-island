# 项目设定

> 项目约定与规范。一旦确定不常变，但需要随时可查。

## 命名规范

- 文件名：英文，kebab-case（如 `about.js`、`quicktools.css`）
- CSS 类名：kebab-case（如 `.showcase-view`、`.sidebar-toggle`）
- JavaScript 变量/函数：camelCase（如 `getCurrentMode`、`sidebarState`）
- JavaScript 类/模块：PascalCase（如 `AppRouter`、`CardDeck`）
- JSON 键名：camelCase
- 目录名：英文，小写

## 代码风格

- 缩进：2 空格
- 引号：单引号（JS），双引号（HTML 属性）
- 分号：JS 语句末尾加分号
- CSS：使用 CSS 变量（定义在 `tokens.css`），不硬编码颜色/间距/字号
- JS：使用 ES Modules（`import`/`export`），不用 CommonJS
- 注释：JS 用 `//`，CSS 用 `/* */`，注释内容用中文

## CSS 约定

- 所有视觉数值（色彩、间距、字体、圆角、动效时长）定义在 `tokens.css` 中作为 CSS 变量
- 其他 CSS 文件只引用变量，不写硬编码值
- `main.css` 通过 `@import` 加载所有样式模块
- 展示层样式放 `styles/showcase/`，工具层样式放 `styles/tools/`
- 共享组件样式放 `styles/components/`

## JS 约定

- `index.html` 只加载 `scripts/main.js`（`type="module"`）
- `main.js` 启动 `app.js`，由 `app.js` 管理路由和状态
- 模块之间不直接调用，通过 `app.js` 注册和切换
- 展示层逻辑放 `scripts/showcase/`，工具层逻辑放 `scripts/tools/`
- 共享组件放 `scripts/components/`，工具函数放 `scripts/utils/`
- localStorage 操作统一通过 `scripts/utils/storage.js`，不散落各处

## 数据约定

- 展示内容放 `data/*.json`，不硬编码在 JS 中
- 修改内容时只改 JSON，不碰代码
- JSON 文件会随仓库公开，不得包含敏感信息
- 工具层的本地数据（任务、笔记等）通过 `storage.js` 存入 localStorage

## 设计决策记录

| 日期 | 决策 | 理由 |
|---|---|---|
| 2026-08-01 | 纯前端，无后端 | 部署在 GitHub Pages，无需服务器 |
| 2026-08-01 | 原生 ES Modules，不用构建工具 | 零配置、双击即开、离线可用 |
| 2026-08-01 | 数据与代码分离（JSON） | 改内容不碰代码 |
| 2026-08-02 | 展示优先，工具按需拉出 | 访客第一眼看到展示内容，符合预期 |
| 2026-08-02 | 文件名英文，文档内容中文 | 避免路径编码问题，同时便于阅读 |
| 2026-08-02 | 添加 lib/ 目录 | 后续按需引入第三方库 |
| 2026-08-02 | 添加 .nojekyll | GitHub Pages 直接托管静态文件 |
