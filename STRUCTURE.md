# Project Structure / 项目目录结构说明书

> This document is the authoritative reference for the project's file organization.
> AI sessions should read this file first to determine where files belong.
>
> 本文档是项目文件组织的权威参考。AI 每次执行前应先阅读此文件，判断文件应放置的位置。

## Quick Navigation / 快速导航

| I want to... / 我想... | Go to / 去这里 |
|---|---|
| Add a new showcase page / 添加展示页 | `styles/showcase/` + `scripts/showcase/` + `data/*.json` |
| Add a new tool / 添加工具 | `styles/tools/` + `scripts/tools/` |
| Add a shared component / 添加共享组件 | `styles/components/` + `scripts/components/` |
| Add public content data / 添加公开内容数据 | `data/*.json` |
| Add images/icons / 添加图片图标 | `assets/images/` or `assets/icons/` |
| Add a third-party library / 添加第三方库 | `lib/` |
| Update project progress / 更新项目进度 | `docs/ai-context.md` + `docs/project-log.md` |
| Check design decisions / 查看设计决策 | `docs/core-design-requirements.md` |

## Directory Tree / 目录树

```
personal-workstation/
│
├── index.html                  Site entry / 站点入口
├── README.md                   Project overview / 项目概述
├── STRUCTURE.md                This file / 本文件（目录结构说明书）
├── .gitignore                  Git ignore rules / Git忽略规则
├── .nojekyll                   Disable Jekyll / 禁用GitHub Pages Jekyll处理
│
├── docs/                       Project documentation / 项目文档中心
│   ├── core-design-requirements.md
│   ├── ai-context.md
│   ├── project-log.md
│   └── project-conventions.md
│
├── styles/                     Stylesheets / 样式层
│   ├── main.css
│   ├── tokens.css
│   ├── base.css
│   ├── showcase/
│   ├── tools/
│   └── components/
│
├── scripts/                    JavaScript / 脚本层
│   ├── main.js
│   ├── app.js
│   ├── showcase/
│   ├── tools/
│   ├── components/
│   └── utils/
│
├── data/                       Public JSON data / 公开数据（可随仓库公开）
│
├── lib/                        Third-party libraries / 第三方库
│
└── assets/                     Static assets / 静态资源
    ├── images/
    ├── icons/
    ├── sprites/
    └── fonts/
```

## Root Files / 根目录文件

| File / 文件 | Chinese Name / 中文名 | Purpose / 用途 |
|---|---|---|
| `index.html` | 站点入口 | 网站的唯一 HTML 入口，加载 `main.js` 启动应用。展示层为默认视图 |
| `README.md` | 项目概述 | 给 GitHub 访客看的项目简介 |
| `STRUCTURE.md` | 目录结构说明书 | 本文件。整个项目目录结构的权威说明，AI 执行前必读 |
| `.gitignore` | Git忽略规则 | 指定哪些文件不被 Git 跟踪 |
| `.nojekyll` | 禁用Jekyll | 空文件，告诉 GitHub Pages 不要用 Jekyll 处理 |

## docs/ — 项目文档中心

存放所有项目文档。AI 每次执行前应先读取此目录下的文件恢复上下文。

| File / 文件 | Chinese Name / 中文名 | Purpose / 用途 |
|---|---|---|
| `core-design-requirements.md` | 核心设计要求 | 项目设计基准。所有架构、视觉、交互决策的源头。只读参考，不随意修改 |
| `ai-context.md` | AI执行参考 | AI 上下文恢复文件。记录当前进度、下一步任务、重要约定。每次开发会话结束后更新 |
| `project-log.md` | 项目日志 | 按日期记录每次开发会话做了什么、改了什么、遗留什么问题 |
| `project-conventions.md` | 项目设定 | 命名规范、代码风格、设计决策归档。约定一旦确定不常变 |

AI 使用方式：新会话开始时，按 `ai-context.md` → `core-design-requirements.md` → `project-conventions.md` 的顺序读取，即可恢复完整上下文。

## styles/ — 样式层

所有 CSS 文件。通过 `main.css` 统一入口，使用 `@import` 加载其他样式。

| File / 文件 | Chinese Name / 中文名 | Purpose / 用途 |
|---|---|---|
| `main.css` | 主样式入口 | `@import` 所有样式模块的统一入口 |
| `tokens.css` | 设计令牌 | 色彩、间距、字体、圆角、动效等 CSS 变量定义。任天堂风格的数值源头 |
| `base.css` | 基础样式 | 浏览器重置 + 全局排版规则 |

### styles/showcase/ — 展示层样式

展示层（默认可见）各模块的样式。

| File / 文件 | Chinese Name / 中文名 |
|---|---|
| `about.css` | 关于我模块样式 |
| `skills.css` | 技能矩阵模块样式 |
| `projects.css` | 项目成果集模块样式 |
| `cards.css` | 感悟卡片模块样式（含抽卡动画） |

### styles/tools/ — 工具层样式

工具层（侧边栏拉出）各模块的样式。

| File / 文件 | Chinese Name / 中文名 |
|---|---|
| `dashboard.css` | 工作台模块样式 |
| `quicktools.css` | 快捷工具集模块样式 |
| `knowledge.css` | 知识库模块样式 |
| `tasks.css` | 任务与日程模块样式 |

### styles/components/ — 共享组件样式

跨展示层和工具层复用的组件样式。

| File / 文件 | Chinese Name / 中文名 |
|---|---|
| `sidebar.css` | 侧边栏组件样式（展示层与工具层切换控件） |
| `animations.css` | 全局动画与特效定义（抽卡翻转、任务执行特效等） |
| `theme.css` | 主题与配色切换样式 |

## scripts/ — 脚本层

所有 JavaScript 文件。使用 ES Modules（原生 `import`/`export`），无需构建工具。

| File / 文件 | Chinese Name / 中文名 | Purpose / 用途 |
|---|---|---|
| `main.js` | 主入口 | 应用启动入口，`index.html` 唯一加载的脚本 |
| `app.js` | 应用核心 | 路由、状态管理、展示/工具模式切换 |

### scripts/showcase/ — 展示层逻辑

| File / 文件 | Chinese Name / 中文名 |
|---|---|
| `about.js` | 关于我模块逻辑 |
| `skills.js` | 技能矩阵模块逻辑 |
| `projects.js` | 项目成果集模块逻辑 |
| `cards.js` | 感悟卡片模块逻辑（抽卡、收藏、图鉴） |

### scripts/tools/ — 工具层逻辑

| File / 文件 | Chinese Name / 中文名 |
|---|---|
| `dashboard.js` | 工作台模块逻辑 |
| `quicktools.js` | 快捷工具集模块逻辑 |
| `knowledge.js` | 知识库模块逻辑 |
| `tasks.js` | 任务与日程模块逻辑 |

### scripts/components/ — 共享组件

| File / 文件 | Chinese Name / 中文名 |
|---|---|
| `sidebar.js` | 侧边栏交互组件 |
| `ai-task.js` | AI任务发布与执行反馈组件 |

### scripts/utils/ — 工具函数

| File / 文件 | Chinese Name / 中文名 |
|---|---|
| `storage.js` | localStorage 封装（读写、迁移） |
| `dom.js` | DOM 操作辅助函数 |
| `helpers.js` | 通用工具函数（格式化、随机、防抖等） |

## data/ — 公开数据

存放展示层内容的 JSON 数据文件。这些文件会随仓库公开，不得包含敏感个人信息。

| File / 文件 | Chinese Name / 中文名 | Content / 内容 |
|---|---|---|
| `profile.json` | 个人简介 | 姓名、职业标题、简介、经历（脱敏后） |
| `skills.json` | 技能数据 | 技能分类与熟练度 |
| `projects.json` | 项目案例 | 项目背景、角色、成果 |
| `cards.json` | 感悟卡片库 | 卡片内容、稀有度、分类 |

修改内容时只改 JSON，不碰代码。数据与表现分离。

## lib/ — 第三方库

存放引入的第三方库文件。目前为空，后续按需添加。

优先使用原生能力。只有在原生无法满足需求时才引入第三方库。引入时在此目录下创建子目录存放。

## assets/ — 静态资源

| Directory / 目录 | Chinese Name / 中文名 | Content / 内容 |
|---|---|---|
| `images/` | 图片 | 头像、项目截图、背景图等 |
| `icons/` | 图标 | SVG 格式图标 |
| `sprites/` | 精灵图 | 角色动画帧（游戏化元素，如任务执行特效） |
| `fonts/` | 字体 | 自定义字体文件（如有） |

## File Naming Rules / 文件命名规则

- All file names use English / 所有文件名使用英文
- CSS/JS files: `kebab-case` / CSS/JS 文件使用短横线命名
- JSON files: lowercase / JSON 文件使用小写
- Documentation content: Chinese / 文档内容使用中文
- This doc uses bilingual format for clarity / 本文档使用中英双语格式以便阅读

## Architecture Summary / 架构要点

1. **Showcase-first / 展示优先** — Default view is the showcase layer; tools are pulled out via sidebar
2. **No build tools / 无构建工具** — Native ES Modules, double-click to run
3. **Data-code separation / 数据与代码分离** — Content in `data/*.json`, logic in `scripts/`
4. **Two-layer structure / 双层结构** — `showcase/` and `tools/` are physically separated in both `styles/` and `scripts/`
5. **Design tokens / 设计令牌** — All visual values defined in `tokens.css` as CSS variables
