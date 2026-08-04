// app.js
// 应用核心：状态管理、视图切换、模块注册、事件总线
// 所有模块通过 app 注册和通信，不直接互调

import * as storage from './utils/storage.js';
import { $, $$ } from './utils/dom.js';
import { gotoIsland, gotoIslandDirect, resetToHome } from './showcase/map3d.js?v=19m';

/** 应用状态 */
const initialState = {
  view: 'showcase',           // 'showcase' | 'tools'
  currentTool: 'dashboard',   // 当前工具层模块
  theme: 'light',             // 'light' | 'dark'
  ready: false,               // 是否已初始化
};

class App {
  constructor() {
    this.state = { ...initialState };
    /** @type {Map<string, {mount?: Function, unmount?: Function, mounted?: boolean}>} */
    this.modules = new Map();
    /** @type {Map<string, Set<Function>>} */
    this.listeners = new Map();
    /** @type {Map<string, HTMLElement>} */
    this.mounts = new Map();
    this.els = {}; // 缓存关键 DOM 引用
  }

  /* ============ 事件总线 ============ */
  on(event, handler) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event).add(handler);
    return () => this.off(event, handler);
  }

  off(event, handler) {
    this.listeners.get(event)?.delete(handler);
  }

  emit(event, payload) {
    this.listeners.get(event)?.forEach((fn) => {
      try { fn(payload); } catch (err) { console.error(`[app] 事件处理器异常：${event}`, err); }
    });
  }

  /* ============ 模块注册 ============ */
  /**
   * 注册模块
   * @param {string} name - 模块名（对应 data-mount 属性）
   * @param {Object} def - { mount(container, app), unmount?(container, app) }
   */
  register(name, def) {
    if (this.modules.has(name)) {
      console.warn(`[app] 模块 "${name}" 已注册，覆盖`);
    }
    this.modules.set(name, def);
    // 若已初始化，立即挂载
    if (this.state.ready) this._tryMount(name);
    return this;
  }

  /** 找到所有 data-mount 容器并挂载对应模块 */
  _discoverMounts() {
    const nodes = $$('[data-mount]');
    nodes.forEach((node) => {
      const name = node.dataset.mount;
      this.mounts.set(name, node);
      this._tryMount(name);
    });
  }

  _tryMount(name) {
    const def = this.modules.get(name);
    const container = this.mounts.get(name);
    if (!def || !container || def.mounted) return;

    // 工具层模块只在激活时挂载；展示层立即挂载
    const isTool = container.closest('.tool-section');
    if (isTool && !isTool.classList.contains('is-active')) return;

    if (typeof def.mount === 'function') {
      try {
        def.mount(container, this);
        def.mounted = true;
      } catch (err) {
        console.error(`[app] 模块 "${name}" 挂载失败`, err);
      }
    }
  }

  /* ============ 状态变更 ============ */
  _setState(patch) {
    const changes = {};
    for (const [key, value] of Object.entries(patch)) {
      if (this.state[key] !== value) {
        changes[key] = { from: this.state[key], to: value };
        this.state[key] = value;
      }
    }
    if (Object.keys(changes).length) {
      this.emit('state:change', changes);
      // 细分事件
      if (changes.view) this.emit('view:change', changes.view);
      if (changes.currentTool) this.emit('tool:change', changes.currentTool);
      if (changes.theme) this.emit('theme:change', changes.theme);
    }
  }

  /* ============ 视图切换 ============ */
  switchView(view) {
    if (view === this.state.view) return;
    if (view !== 'showcase' && view !== 'tools') return;

    const showcaseEl = this.els.showcaseView;
    const toolsEl = this.els.toolsView;

    if (view === 'tools') {
      showcaseEl.hidden = true;
      toolsEl.hidden = false;
      document.body.dataset.view = 'tools';
      this._activateTool(this.state.currentTool);
      // 显示返回地图按钮
      this.els.toolBack?.classList.add('is-visible');
      if (this.els.toolBack) this.els.toolBack.hidden = false;
    } else {
      toolsEl.hidden = true;
      showcaseEl.hidden = false;
      document.body.dataset.view = 'showcase';
      // 隐藏返回地图按钮
      this.els.toolBack?.classList.remove('is-visible');
      if (this.els.toolBack) this.els.toolBack.hidden = true;
    }

    this._setState({ view });
    this._updateModeBadge();
    storage.set('lastView', view, { ttl: 7 * 24 * 60 * 60 * 1000 });
  }

  /* ============ 工具切换 ============ */
  openTool(toolName) {
    if (this.state.view !== 'tools') {
      this.switchView('tools');
    }
    if (toolName === this.state.currentTool && this.state.view === 'tools') {
      return;
    }

    this._activateTool(toolName);
    this._setState({ currentTool: toolName });
    storage.set('lastTool', toolName, { ttl: 7 * 24 * 60 * 60 * 1000 });
  }

  _activateTool(toolName) {
    const sections = $$('.tool-section', this.els.toolsView);
    let activated = null;
    sections.forEach((section) => {
      const isTarget = section.dataset.module === toolName;
      section.classList.toggle('is-active', isTarget);
      section.hidden = !isTarget;
      if (isTarget) {
        activated = section;
        const mount = section.querySelector('[data-mount]');
        if (mount) {
          this.mounts.set(toolName, mount);
          this._tryMount(toolName);
        }
      }
    });
    if (activated) {
      // 滚动到顶部，让用户看到新视图
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  /* ============ 主题 ============ */
  setTheme(theme) {
    if (theme !== 'light' && theme !== 'dark') return;
    document.documentElement.setAttribute('data-theme', theme);
    this._setState({ theme });
    storage.set('theme', theme);
  }

  toggleTheme() {
    this.setTheme(this.state.theme === 'light' ? 'dark' : 'light');
  }

  _updateModeBadge() {
    if (!this.els.modeBadge) return;
    this.els.modeBadge.textContent = this.state.view === 'showcase' ? '展示' : '工具';
    this.els.modeBadge.dataset.view = this.state.view;
  }

  /* ============ Toast 提示 ============ */
  toast(message, type = 'info', duration = 2500) {
    if (!this.els.toastContainer) return;
    const item = document.createElement('div');
    item.className = `toast toast--${type}`;
    item.textContent = message;
    this.els.toastContainer.append(item);
    // 触发动画
    requestAnimationFrame(() => item.classList.add('is-visible'));
    setTimeout(() => {
      item.classList.remove('is-visible');
      item.addEventListener('transitionend', () => item.remove(), { once: true });
      // 兜底
      setTimeout(() => item.remove(), 500);
    }, duration);
  }

  /* ============ 初始化 ============ */
  async init() {
    if (this.state.ready) return;

    // 缓存关键 DOM
    this.els = {
      dock: $('#dock'),
      showcaseView: $('#showcase-view'),
      toolsView: $('#tools-view'),
      themeToggle: $('#theme-toggle'),
      modeBadge: $('#mode-badge'),
      toastContainer: $('#toast-container'),
      toolBack: $('#tool-back'),
    };

    // 恢复主题
    const savedTheme = storage.get('theme', 'light');
    if (savedTheme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      this.state.theme = 'dark';
    }

    // 恢复上次视图（仅当用户主动切到工具层时才恢复，避免访客一进来就看到工具页）
    // 这里采用：仅恢复主题，不自动恢复视图，让访客默认看到展示页

    this._updateModeBadge();
    document.body.dataset.view = this.state.view;

    // 绑定全局事件
    this._bindEvents();

    // 发现挂载点并尝试挂载
    this._discoverMounts();

    this._setState({ ready: true });
    this.emit('ready');

    console.log('[app] 初始化完成');
  }

  _bindEvents() {
    // 主题切换
    this.els.themeToggle?.addEventListener('click', () => this.toggleTheme());

    // 工具页返回地图按钮
    this.els.toolBack?.addEventListener('click', () => {
      this.switchView('showcase');
      setTimeout(() => resetToHome(), 150);
    });

    // Dock 导航（事件委托）
    this.els.dock?.addEventListener('click', (event) => {
      const btn = event.target.closest('[data-action]');
      if (!btn) return;
      const action = btn.dataset.action;

      if (action === 'switch-view') {
        const targetView = btn.dataset.view;
        // 点"展示页"时，无论当前是否在展示页，都重置到初始岛屿状态
        if (targetView === 'showcase') {
          const wasInOtherView = this.state.view !== 'showcase';
          if (wasInOtherView) {
            this.switchView('showcase');
          }
          // 重置：关闭所有打开的岛屿页面，相机回到原点
          // 若刚从工具页切过来，需等待展示层渲染与 3D 场景就绪
          setTimeout(() => resetToHome(), wasInOtherView ? 150 : 0);
        } else {
          this.switchView(targetView);
        }
      } else if (action === 'open-tool') {
        this.openTool(btn.dataset.tool);
      } else if (action === 'scroll-to') {
        // 锚点跳转：直接进入对应岛屿的全屏页面，不播放跳岛动画
        const wasInOtherView = this.state.view !== 'showcase';
        if (wasInOtherView) {
          this.switchView('showcase');
        }
        event.preventDefault();
        const href = btn.getAttribute('href') || '';
        const islandId = href.replace('#', '');
        if (islandId) {
          setTimeout(() => gotoIslandDirect(islandId), wasInOtherView ? 150 : 0);
        }
      }
    });

    // Dock 导航项激活态同步
    this.on('view:change', () => this._syncDockActive());
    this.on('tool:change', () => this._syncDockActive());
  }

  _syncDockActive() {
    if (!this.els.dock) return;
    const items = $$('[data-action]', this.els.dock);
    items.forEach((item) => {
      const action = item.dataset.action;
      let active = false;
      if (action === 'switch-view' && item.dataset.view === this.state.view) active = true;
      if (action === 'open-tool' && this.state.view === 'tools' && item.dataset.tool === this.state.currentTool) active = true;
      item.classList.toggle('is-active', active);
      item.setAttribute('aria-current', active ? 'page' : 'false');
    });
  }
}

// 单例导出
export const app = new App();
