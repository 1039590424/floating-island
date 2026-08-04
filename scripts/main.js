// main.js
// 应用启动入口
// index.html 唯一加载的脚本（type="module"）
// 职责：初始化 App、注册所有模块、启动应用

import { app } from './app.js?v=5';
import { ready } from './utils/dom.js';
import { dockComponent } from './components/dock.js';

// 展示层模块
import { portalModule } from './showcase/portal.js';
import { aboutModule } from './showcase/about.js';
import { skillsModule } from './showcase/skills.js';
import { projectsModule } from './showcase/projects.js';
import { cardsModule } from './showcase/cards.js';
import * as mapSystem from './showcase/map3d.js?v=19m';
// 工具层模块
import { dashboardModule } from './tools/dashboard.js?v=2';
import { quicktoolsModule } from './tools/quicktools.js?v=2';
import { knowledgeModule } from './tools/knowledge.js';
import { tasksModule } from './tools/tasks.js';

async function bootstrap() {
  await ready();

  // 注册共享组件
  app.register('dock', dockComponent);

  // 注册展示层模块（挂载在岛屿内容面板中）
  app.register('portal', portalModule);
  app.register('about', aboutModule);
  app.register('skills', skillsModule);
  app.register('projects', projectsModule);
  app.register('cards', cardsModule);

  // 注册工具层模块
  app.register('dashboard', dashboardModule);
  app.register('quicktools', quicktoolsModule);
  app.register('knowledge', knowledgeModule);
  app.register('tasks', tasksModule);

  // 初始化应用
  await app.init();

  // 初始化世界地图系统（拖拽、缩放、人物移动）
  console.log('[main] 准备调用 mapSystem.init()');
  mapSystem.init();
  console.log('[main] mapSystem.init() 调用完成');

  // 设置工具岛屿点击回调：点击工具岛时切换到 tools-view 并打开对应工具
  // fromIsland=true：显示"返回地图"按钮
  mapSystem.setToolIslandHandler?.((toolId) => {
    app.switchView('tools', true);
    app.openTool(toolId, true);
  });

  // 应用就绪后的额外行为
  app.on('ready', () => {
    // 同步 dock 初始激活态
    app._syncDockActive?.();
  });

  // 开发模式提示
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
    console.log('%c★ 个人工作站 ★', 'color:#E60012;font-size:18px;font-weight:bold;');
    console.log('开发模式：本地预览');
  }
}

bootstrap().catch((err) => {
  console.error('[main] 启动失败', err);
});
