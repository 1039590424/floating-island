// quicktools.js
// 工具台 — AI 工具网站收藏夹
// 展示与收藏好用的 AI 工具网站：通用助手、图像、视频、产品经理、开发者、写作
// 支持分类筛选、搜索、收藏（localStorage）、外链跳转

import { el, clear, $ } from '../utils/dom.js';
import * as storage from '../utils/storage.js';

const FAV_KEY = 'ai:tool-favs'; // 收藏列表
const dataUrl = 'data/ai-tools.json';
let allTools = [];
let categories = [];
let activeCategory = 'all';
let searchKeyword = '';

/* ============ 数据加载 ============ */
async function loadData() {
  try {
    const res = await fetch(dataUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    categories = data.categories || [];
    allTools = data.tools || [];
  } catch (err) {
    console.error('[quicktools] 加载 AI 工具数据失败:', err);
    categories = [];
    allTools = [];
  }
}

/* ============ 收藏管理 ============ */
function getFavs() {
  return storage.get(FAV_KEY, []);
}
function toggleFav(toolId) {
  const favs = getFavs();
  const idx = favs.indexOf(toolId);
  if (idx >= 0) favs.splice(idx, 1);
  else favs.push(toolId);
  storage.set(FAV_KEY, favs);
  return favs.includes(toolId);
}

/* ============ 过滤 ============ */
function getFilteredTools() {
  let list = allTools;
  if (activeCategory === 'favs') {
    const favs = getFavs();
    list = list.filter((t) => favs.includes(t.id));
  } else if (activeCategory !== 'all') {
    list = list.filter((t) => t.category === activeCategory);
  }
  if (searchKeyword) {
    const kw = searchKeyword.toLowerCase();
    list = list.filter((t) =>
      t.name.toLowerCase().includes(kw) ||
      t.desc.toLowerCase().includes(kw) ||
      (t.tags || []).some((tag) => tag.toLowerCase().includes(kw))
    );
  }
  return list;
}

/* ============ 渲染：分类标签栏 ============ */
function renderCategoryBar() {
  const favCount = getFavs().length;
  const tabs = [
    { id: 'all', name: '全部', icon: '◆' },
    ...categories.map((c) => ({ id: c.id, name: c.name, icon: c.icon })),
    { id: 'favs', name: `收藏 (${favCount})`, icon: '★' },
  ];

  return el('div', { class: 'qt-categories', role: 'tablist' },
    tabs.map((tab) =>
      el('button', {
        class: `qt-cat-tab ${tab.id === activeCategory ? 'is-active' : ''}`,
        type: 'button',
        role: 'tab',
        attrs: { 'aria-selected': tab.id === activeCategory ? 'true' : 'false' },
        on: { click: () => { activeCategory = tab.id; rerender(); } },
      }, [
        el('span', { class: 'qt-cat-tab__icon', attrs: { 'aria-hidden': 'true' } }, tab.icon),
        el('span', { class: 'qt-cat-tab__name' }, tab.name),
      ])
    )
  );
}

/* ============ 渲染：搜索框 ============ */
function renderSearch() {
  return el('div', { class: 'qt-search-wrap' }, [
    el('input', {
      class: 'qt-search-input',
      type: 'search',
      attrs: {
        placeholder: '搜索工具名称、描述或标签…',
        'aria-label': '搜索 AI 工具',
      },
      on: {
        input: (e) => {
          searchKeyword = e.target.value;
          rerenderList();
        },
      },
    }),
    el('span', { class: 'qt-search-icon', attrs: { 'aria-hidden': 'true' } }, '🔍'),
  ]);
}

/* ============ 渲染：工具卡片 ============ */
function renderToolCard(tool, app) {
  const isFav = getFavs().includes(tool.id);
  const category = categories.find((c) => c.id === tool.category);

  return el('a', {
    class: `ai-tool-card ${tool.featured ? 'is-featured' : ''}`,
    href: tool.url,
    target: '_blank',
    rel: 'noopener noreferrer',
    style: { '--tool-color': tool.color },
  }, [
    // 顶部色带 + 图标
    el('div', { class: 'ai-tool-card__header' }, [
      el('div', { class: 'ai-tool-card__icon' },
        tool.name.charAt(0)
      ),
      el('div', { class: 'ai-tool-card__cat-badge' },
        category?.icon + ' ' + (category?.name || '')
      ),
      el('button', {
        class: `ai-tool-card__fav ${isFav ? 'is-fav' : ''}`,
        type: 'button',
        attrs: { 'aria-label': isFav ? '取消收藏' : '收藏', 'aria-pressed': isFav ? 'true' : 'false' },
        on: {
          click: (e) => {
            e.preventDefault();
            e.stopPropagation();
            const nowFav = toggleFav(tool.id);
            e.currentTarget.classList.toggle('is-fav', nowFav);
            e.currentTarget.setAttribute('aria-pressed', nowFav ? 'true' : 'false');
            app.toast?.(nowFav ? `已收藏「${tool.name}」` : `已取消收藏`, 'success');
            // 如果在收藏分类下，重新渲染列表
            if (activeCategory === 'favs') rerenderList();
          },
        },
      }, isFav ? '★' : '☆'),
    ]),
    // 主体内容
    el('div', { class: 'ai-tool-card__body' }, [
      el('h3', { class: 'ai-tool-card__name' }, tool.name),
      el('p', { class: 'ai-tool-card__desc' }, tool.desc),
      tool.tags?.length
        ? el('div', { class: 'ai-tool-card__tags' },
            tool.tags.map((tag) => el('span', { class: 'ai-tool-card__tag' }, tag))
          )
        : null,
    ]),
    // 底部跳转链接
    el('div', { class: 'ai-tool-card__footer' }, [
      el('span', { class: 'ai-tool-card__url' }, new URL(tool.url).hostname.replace('www.', '')),
      el('span', { class: 'ai-tool-card__go' }, '访问 →'),
    ]),
  ]);
}

/* ============ 渲染：空状态 ============ */
function renderEmpty() {
  if (activeCategory === 'favs') {
    return el('div', { class: 'qt-empty' }, [
      el('div', { class: 'qt-empty__icon' }, '☆'),
      el('p', { class: 'qt-empty__text' }, '还没有收藏任何工具'),
      el('p', { class: 'qt-empty__hint' }, '点击工具卡片右上角的 ☆ 即可收藏'),
    ]);
  }
  if (searchKeyword) {
    return el('div', { class: 'qt-empty' }, [
      el('div', { class: 'qt-empty__icon' }, '🔍'),
      el('p', { class: 'qt-empty__text' }, `没有找到匹配"${searchKeyword}"的工具`),
    ]);
  }
  return el('div', { class: 'qt-empty' }, [
    el('div', { class: 'qt-empty__icon' }, '📦'),
    el('p', { class: 'qt-empty__text' }, '该分类下暂无工具'),
  ]);
}

/* ============ 渲染：工具列表 ============ */
function renderToolList(app) {
  const list = getFilteredTools();
  if (list.length === 0) return renderEmpty();

  // 推荐工具优先排前
  list.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));

  return el('div', { class: 'ai-tool-grid' },
    list.map((tool) => renderToolCard(tool, app))
  );
}

/* ============ 重新渲染 ============ */
let rootContainer = null;
let listContainer = null;
let appRef = null;

function rerender() {
  if (!rootContainer) return;
  // 重建分类栏 + 搜索
  const filtersWrap = $('.qt-filters', rootContainer);
  if (filtersWrap) {
    clear(filtersWrap);
    filtersWrap.append(renderCategoryBar(), renderSearch());
  }
  rerenderList();
}

function rerenderList() {
  if (!listContainer) return;
  clear(listContainer);
  listContainer.append(renderToolList(appRef));

  // 更新结果计数
  const countEl = $('.qt-count', rootContainer);
  if (countEl) {
    const count = getFilteredTools().length;
    countEl.textContent = `共 ${count} 个工具`;
  }
}

/* ============ 模块导出 ============ */
export const quicktoolsModule = {
  async mount(container, app) {
    appRef = app;
    rootContainer = container;
    clear(container);

    // 骨架屏
    container.append(
      el('div', { class: 'quicktools-module' }, [
        el('div', { class: 'qt-header' }, [
          el('h2', { class: 'qt-title' }, 'AI 工具收藏夹'),
          el('p', { class: 'qt-subtitle' }, '精选好用 AI 工具网站，按分类查找，点击卡片直达'),
        ]),
        el('div', { class: 'qt-filters' }),
        el('div', { class: 'qt-count-bar' }, [
          el('span', { class: 'qt-count' }, '加载中…'),
        ]),
        (listContainer = el('div', { class: 'qt-list-wrap' })),
      ])
    );

    // 加载数据
    await loadData();

    // 渲染分类 + 搜索
    const filtersWrap = $('.qt-filters', container);
    if (filtersWrap) {
      filtersWrap.append(renderCategoryBar(), renderSearch());
    }

    // 渲染列表
    rerenderList();
  },
};
