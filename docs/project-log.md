# 项目日志

> 按日期记录每次开发会话的进展。

## 2026-08-01

- 讨论项目需求与定位
- 确定核心设计要求：个人工作站，展示优先 + 工具按需拉出
- 确定视觉方向：任天堂游戏风格，明快友好
- 确定技术约束：纯前端，GitHub Pages 部署
- 创建核心设计要求文档
- 新增感悟卡片模块（抽卡机制）
- 新增 AI 任务发布功能
- 调整架构为"展示优先，工具按需拉出"

## 2026-08-02

### 会话 1：项目骨架搭建
- 确定目录结构方案（软件架构 + UI工程 + 项目管理三视角）
- 创建完整目录结构：docs / styles / scripts / data / lib / assets
- 创建所有占位文件（CSS / JS / JSON / .gitkeep）
- 迁移核心设计要求文档至 docs/core-design-requirements.md
- 创建框架结构说明书 STRUCTURE.md（中英双语）
- 创建项目管理文档：ai-context.md / project-log.md / project-conventions.md
- 创建根目录基础文件：README.md / .gitignore / index.html / .nojekyll

### 会话 2：核心模块实现
- tokens.css 任天堂风格设计令牌（色彩/间距/字体/动效/暗色主题）
- base.css 浏览器重置 + 全局排版规则
- animations.css 全局动画库（抽卡翻转/任务执行特效/视图过渡）
- app.js 状态管理、视图切换、事件总线、模块注册系统
- main.js 启动入口，注册展示层与工具层全部模块
- 工具函数库：dom.js / helpers.js / storage.js
- 侧边栏组件 sidebar.js（手势切换、焦点陷阱、滚动锁）
- 修复：侧边栏未挂载问题（补充 data-mount="sidebar"）

### 会话 3：展示层模块
- 关于我 about.js：玩家档案卡 + 经历时间线 + 联系方式
- 技能矩阵 skills.js：RPG 技能条 + IntersectionObserver 滚动填充动画
- 项目成果集 projects.js：关卡选择风格 + 分类筛选
- 感悟卡片 cards.js：抽卡机制 + 4 稀有度 + 加权随机 + 图鉴收藏

### 会话 4：工具层模块
- 工作台 dashboard.js：欢迎区 + 快速入口 + AI 任务面板（模拟执行）+ 历史记录
- 快捷工具集 quicktools.js：文本统计 / Base64 / URL 编码 / JSON 格式化
- 知识库 knowledge.js：笔记收藏 + 搜索筛选 + localStorage 持久化
- 任务与日程 tasks.js：待办管理 + 进度环可视化 + 优先级 + 完成动画
- 数据文件：cards.json(23张) / profile.json / skills.json / projects.json
- 清理：移除 knowledge.js 与 quicktools.js 中未使用的导入

### 待办
- [ ] 浏览器端到端测试（需启动本地服务器，ES Modules 要求 http 协议）
- [ ] 填充真实个人内容替换示例数据
- [ ] 视觉细节打磨（响应式、动效微调）
- [ ] 部署到 GitHub Pages
