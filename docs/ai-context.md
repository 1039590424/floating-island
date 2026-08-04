# AI 执行参考

> 本文件用于 AI 上下文恢复。每次新会话开始时读取此文件。
> 每次开发会话结束后更新此文件。

## 当前状态

- 项目阶段：所有核心模块已实现，待浏览器端到端测试与内容填充
- 最后更新：2026-08-02

## 已完成

- [x] 核心设计要求文档（docs/core-design-requirements.md）
- [x] 目录结构设计与创建
- [x] 框架结构说明书（STRUCTURE.md）
- [x] 项目管理文档（ai-context.md / project-log.md / project-conventions.md）
- [x] tokens.css 任天堂风格设计令牌（色彩/间距/字体/动效/暗色主题）
- [x] base.css 浏览器重置 + 全局排版
- [x] app.js 状态管理、视图切换、事件总线、模块注册
- [x] main.js 启动入口，注册所有模块
- [x] 工具函数：dom.js / helpers.js / storage.js
- [x] 侧边栏组件 sidebar.js（手势、焦点陷阱、滚动锁）
- [x] index.html 完整结构（展示层 + 工具层 + 侧边栏）
- [x] 展示层 - 关于我 about.js（玩家档案卡 + 时间线 + 联系方式）
- [x] 展示层 - 技能矩阵 skills.js（RPG 技能条 + 滚动填充动画）
- [x] 展示层 - 项目成果集 projects.js（关卡选择风格 + 分类筛选）
- [x] 展示层 - 感悟卡片 cards.js（抽卡机制 + 稀有度 + 图鉴）
- [x] 工具层 - 工作台 dashboard.js（欢迎区 + 快速入口 + AI 任务面板 + 历史）
- [x] 工具层 - 快捷工具集 quicktools.js（文本统计/Base64/URL/JSON）
- [x] 工具层 - 知识库 knowledge.js（笔记收藏 + 搜索筛选 + localStorage）
- [x] 工具层 - 任务与日程 tasks.js（待办管理 + 进度环 + 优先级）
- [x] 数据文件：cards.json(23张) / profile.json / skills.json / projects.json
- [x] 全部模块 CSS 样式（任天堂风格）
- [x] 动画库 animations.css（含 shimmer/pulseDot 等关键帧）

## 进行中

- 无

## 下一步

- [ ] 浏览器端到端测试（需启动本地服务器，ES Modules 要求 http 协议）
- [ ] 填充真实个人内容替换示例数据（profile.json / skills.json / projects.json）
- [ ] 视觉细节打磨（响应式、动效微调）
- [ ] 部署到 GitHub Pages

## 重要约定

- 设计风格：任天堂游戏风格，见 core-design-requirements.md
- 架构：展示层默认可见，工具层侧边栏拉出
- 技术栈：纯前端 ES Modules，无构建工具
- 部署：GitHub Pages，静态文件
- 文件命名：英文文件名，中文文档内容
- 隐私：不硬编码敏感信息，工具层数据存 localStorage
- CSS 变量：所有视觉数值定义在 tokens.css，不硬编码
- 数据分离：展示内容放 data/*.json，不写死在代码里
- 模块通信：通过 app 事件总线，不直接互调
- Toast 反馈：模块通过 CustomEvent 转发，app.toast 统一展示

## 模块进度

| 模块 | 状态 | 说明 |
|---|---|---|
| 框架与目录结构 | 已完成 | 所有目录和文件就位 |
| index.html 入口 | 已完成 | 完整结构，含 data-mount 挂载点 |
| 侧边栏组件 | 已完成 | 展示/工具切换、手势、焦点陷阱 |
| 关于我 | 已完成 | 玩家档案卡 + 经历时间线 + 联系方式 |
| 技能矩阵 | 已完成 | RPG 技能条 + 滚动填充动画 |
| 项目成果集 | 已完成 | 关卡选择风格 + 分类筛选 |
| 感悟卡片 | 已完成 | 抽卡机制 + 4 稀有度 + 图鉴收藏 |
| 工作台 Dashboard | 已完成 | 欢迎区 + AI 任务面板（演示） |
| 快捷工具集 | 已完成 | 文本统计/Base64/URL/JSON |
| 知识库 | 已完成 | 笔记收藏 + 搜索 + localStorage |
| 任务与日程 | 已完成 | 待办管理 + 进度环 + 优先级 |
| 主题切换 | 已完成 | 明暗主题，存 localStorage |
| 浏览器测试 | 待开始 | 需本地服务器 |

## 文件读取顺序

新会话恢复上下文时，按以下顺序读取：

1. `STRUCTURE.md` — 了解目录结构和文件归属
2. `docs/ai-context.md` — 本文件，了解当前进度
3. `docs/core-design-requirements.md` — 了解设计基准
4. `docs/project-conventions.md` — 了解编码约定
