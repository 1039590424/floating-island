// cards.js
// 感悟卡片模块 — 抽卡机制 + 收藏图鉴
// 展示层最具游戏化色彩的模块

import { el, clear, $ } from '../utils/dom.js';
import { pickWeighted, sleep } from '../utils/helpers.js';
import * as storage from '../utils/storage.js';

const DATA_URL = 'data/cards.json';
const STORAGE_KEY = 'cards:collected';
const DRAW_LOG_KEY = 'cards:drawLog';

let cardData = null;       // 加载后的卡牌库
let collected = new Set(); // 已收集卡牌 ID
let drawCount = 0;         // 总抽卡次数
let isDrawing = false;     // 防连点

/** 加载卡牌数据 */
async function loadCards() {
  if (cardData) return cardData;
  try {
    const res = await fetch(DATA_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    cardData = await res.json();
    return cardData;
  } catch (err) {
    console.error('[cards] 数据加载失败', err);
    throw err;
  }
}

/** 按稀有度权重随机抽一张卡 */
function drawOne() {
  // 先按稀有度权重选稀有度
  const rarity = pickWeighted(cardData.rarities);
  // 再在该稀有度的卡牌中随机选一张
  const pool = cardData.cards.filter((c) => c.rarity === rarity.id);
  if (pool.length === 0) {
    // 兜底：从所有卡里抽
    return cardData.cards[Math.floor(Math.random() * cardData.cards.length)];
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

/** 获取稀有度配置 */
function getRarity(id) {
  return cardData.rarities.find((r) => r.id === id) || cardData.rarities[0];
}

/** 持久化收藏 */
function persistCollected() {
  storage.set(STORAGE_KEY, Array.from(collected));
}
function persistDrawLog(cardId) {
  const log = storage.get(DRAW_LOG_KEY, []);
  log.unshift({ cardId, time: Date.now() });
  // 只保留最近 50 条
  storage.set(DRAW_LOG_KEY, log.slice(0, 50));
  drawCount = log.length;
}

function loadPersisted() {
  const saved = storage.get(STORAGE_KEY, []);
  collected = new Set(saved);
  const log = storage.get(DRAW_LOG_KEY, []);
  drawCount = log.length;
}

/* ============ 渲染 ============ */

/** 渲染模块主结构 */
function renderSkeleton(container) {
  clear(container);
  const root = el('div', { class: 'cards-module' }, [
    // 抽卡舞台
    el('div', { class: 'cards-stage' }, [
      // 卡组堆叠视觉
      el('div', { class: 'cards-deck', attrs: { 'aria-hidden': 'true' } }, [
        el('div', { class: 'cards-deck__layer cards-deck__layer--3' }),
        el('div', { class: 'cards-deck__layer cards-deck__layer--2' }),
        el('div', { class: 'cards-deck__layer cards-deck__layer--1' }),
        el('div', { class: 'cards-deck__layer cards-deck__layer--0' }, [
          el('span', { class: 'cards-deck__icon' }, '?'),
        ]),
      ]),
      // 抽卡按钮
      el('button', {
        class: 'cards-draw-btn',
        type: 'button',
        attrs: { 'aria-label': '抽取一张感悟卡片' },
        on: { click: handleDraw },
      }, [
        el('span', { class: 'cards-draw-btn__icon' }, '✦'),
        el('span', { class: 'cards-draw-btn__text' }, '抽一张'),
      ]),
      // 当前抽到的卡（动态出现）
      el('div', { class: 'cards-current', attrs: { 'aria-live': 'polite' } }),
    ]),

    // 统计区
    el('div', { class: 'cards-stats' }, [
      el('div', { class: 'cards-stat', dataset: { stat: 'draws' } }, [
        el('div', { class: 'cards-stat__value' }, '0'),
        el('div', { class: 'cards-stat__label' }, '累计抽取'),
      ]),
      el('div', { class: 'cards-stat', dataset: { stat: 'collected' } }, [
        el('div', { class: 'cards-stat__value' }, '0'),
        el('div', { class: 'cards-stat__label' }, '已收录'),
      ]),
      el('div', { class: 'cards-stat', dataset: { stat: 'total' } }, [
        el('div', { class: 'cards-stat__value' }, '0'),
        el('div', { class: 'cards-stat__label' }, '图鉴总数'),
      ]),
      el('div', { class: 'cards-stat', dataset: { stat: 'rate' } }, [
        el('div', { class: 'cards-stat__value' }, '0%'),
        el('div', { class: 'cards-stat__label' }, '完成度'),
      ]),
    ]),

    // 稀有度图例
    el('div', { class: 'cards-legend' }),

    // 图鉴
    el('div', { class: 'cards-collection' }, [
      el('div', { class: 'cards-collection__header' }, [
        el('h3', { class: 'cards-collection__title' }, '卡片图鉴'),
        el('div', { class: 'cards-collection__actions' }, [
          el('button', {
            class: 'cards-collection__btn',
            type: 'button',
            on: { click: handleReset },
          }, '清空收藏'),
        ]),
      ]),
      el('div', { class: 'cards-collection__grid' }),
    ]),
  ]);

  // 在根节点前置插入岛屿标题
  root.prepend(
    el('header', { class: 'island__title' }, [
      '感悟卡片',
      el('span', { class: 'island__title-accent' }, ['INSIGHT CARDS']),
    ])
  );
  container.append(root);
  return root;
}

/** 渲染稀有度图例 */
function renderLegend() {
  const legend = $('.cards-legend');
  if (!legend) return;
  clear(legend);
  cardData.rarities.forEach((r) => {
    const count = cardData.cards.filter((c) => c.rarity === r.id).length;
    const owned = cardData.cards.filter((c) => c.rarity === r.id && collected.has(c.id)).length;
    legend.append(el('div', {
      class: ['cards-legend__item', `rarity--${r.id}`],
      dataset: { rarity: r.id },
    }, [
      el('span', { class: 'cards-legend__dot' }),
      el('span', { class: 'cards-legend__name' }, r.name),
      el('span', { class: 'cards-legend__count' }, `${owned}/${count}`),
    ]));
  });
}

/** 渲染统计 */
function renderStats() {
  const total = cardData.cards.length;
  const owned = collected.size;
  const rate = total > 0 ? Math.round((owned / total) * 100) : 0;

  const setStat = (key, value) => {
    const node = $(`.cards-stat[data-stat="${key}"] .cards-stat__value`);
    if (node) node.textContent = value;
  };
  setStat('draws', drawCount);
  setStat('collected', owned);
  setStat('total', total);
  setStat('rate', `${rate}%`);
}

/** 渲染图鉴网格 */
function renderCollection() {
  const grid = $('.cards-collection__grid');
  if (!grid) return;
  clear(grid);

  // 按稀有度倒序排列
  const rarityOrder = cardData.rarities.map((r) => r.id).reverse();
  const sorted = [...cardData.cards].sort((a, b) => {
    const ra = rarityOrder.indexOf(a.rarity);
    const rb = rarityOrder.indexOf(b.rarity);
    if (ra !== rb) return ra - rb;
    return a.id.localeCompare(b.id);
  });

  sorted.forEach((card) => {
    const isCollected = collected.has(card.id);
    const rarity = getRarity(card.rarity);
    const item = el('div', {
      class: ['collection-card', `collection-card--${card.rarity}`, !isCollected && 'is-locked'],
      dataset: { cardId: card.id, rarity: card.rarity },
      attrs: {
        role: 'button',
        tabindex: '0',
        'aria-label': isCollected ? `${rarity.name}：${card.title}` : `未解锁的 ${rarity.name} 卡片`,
      },
      on: {
        click: () => isCollected && previewCard(card),
        keydown: (e) => {
          if (isCollected && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            previewCard(card);
          }
        },
      },
    }, [
      el('div', { class: 'collection-card__rarity', style: { color: rarity.color } },
        rarity.name
      ),
      el('div', { class: 'collection-card__title' },
        isCollected ? card.title : '？？？'
      ),
      el('div', { class: 'collection-card__icon' },
        isCollected ? '✦' : '?'
      ),
    ]);
    grid.append(item);
  });
}

/** 创建一张完整卡牌 DOM */
function createCardEl(card) {
  const rarity = getRarity(card.rarity);
  return el('div', {
    class: ['insight-card', `insight-card--${card.rarity}`, `rarity-glow--${card.rarity}`],
    dataset: { cardId: card.id },
  }, [
    el('div', { class: 'insight-card__inner' }, [
      el('div', { class: 'insight-card__rarity-bar', style: { background: rarity.color } }),
      el('div', { class: 'insight-card__header' }, [
        el('span', { class: 'insight-card__rarity', style: { color: rarity.color } }, rarity.name),
        el('span', { class: 'insight-card__category' }, card.category),
      ]),
      el('div', { class: 'insight-card__body' }, [
        el('h3', { class: 'insight-card__title' }, card.title),
        el('p', { class: 'insight-card__text' }, card.text),
      ]),
      el('div', { class: 'insight-card__footer' }, [
        el('span', { class: 'insight-card__author' }, `— ${card.author}`),
        el('span', { class: 'insight-card__id' }, `#${card.id}`),
      ]),
    ]),
  ]);
}

/** 预览某张已收集的卡（无动画，直接展示） */
function previewCard(card) {
  const current = $('.cards-current');
  if (!current) return;
  clear(current);
  const wrap = el('div', { class: 'card-flip-container is-flipped is-preview' }, [
    el('div', { class: 'card-flip-inner' }, [
      el('div', { class: 'card-face card-face--back' }, [createCardEl(card)]),
    ]),
    el('div', { class: 'cards-current__actions' }, [
      el('button', {
        class: 'cards-action-btn',
        type: 'button',
        on: { click: handleDraw },
      }, '抽一张新的'),
    ]),
  ]);
  current.append(wrap);
  // 滚动到舞台
  const stage = $('.cards-stage');
  if (stage) stage.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

/* ============ 抽卡交互 ============ */

async function handleDraw() {
  if (isDrawing) return;
  isDrawing = true;

  const btn = $('.cards-draw-btn');
  if (btn) {
    btn.disabled = true;
    btn.classList.add('is-drawing');
  }

  try {
    await loadCards();
    const card = drawOne();

    // 阶段 1：抽卡动画（卡片飞入）
    await animateDraw(card);

    // 持久化
    const isNew = !collected.has(card.id);
    collected.add(card.id);
    persistCollected();
    persistDrawLog(card.id);

    // 阶段 2：翻牌揭示
    await sleep(200);
    await flipReveal(card);

    // 阶段 3：如果是新卡，提示
    if (isNew) {
      const rarity = getRarity(card.rarity);
      // 通过自定义事件让 app.toast 显示
      document.dispatchEvent(new CustomEvent('cards:new', { detail: { card, rarity } }));
    }

    // 更新 UI
    renderStats();
    renderLegend();
    renderCollection();
  } catch (err) {
    console.error('[cards] 抽卡失败', err);
    document.dispatchEvent(new CustomEvent('cards:error', { detail: { message: '抽卡失败，请刷新重试' } }));
  } finally {
    isDrawing = false;
    if (btn) {
      btn.disabled = false;
      btn.classList.remove('is-drawing');
    }
  }
}

/** 阶段 1：卡组震动 → 卡片飞入（卡背朝上） */
async function animateDraw(card) {
  const stage = $('.cards-stage');
  const current = $('.cards-current');
  if (!stage || !current) return;

  // 清空之前的卡
  clear(current);

  // 卡组震动效果
  const deck = $('.cards-deck');
  if (deck) {
    deck.classList.add('is-shaking');
    await sleep(400);
    deck.classList.remove('is-shaking');
  }

  // 卡背朝上飞入
  const cardBack = el('div', { class: 'card-flip-container card-back-flyin' }, [
    el('div', { class: 'card-flip-inner' }, [
      el('div', { class: 'card-face card-face--front card-back' }, [
        el('div', { class: 'card-back__pattern' }, [
          el('span', { class: 'card-back__logo' }, '★'),
        ]),
      ]),
    ]),
  ]);
  current.append(cardBack);

  await sleep(600); // 等飞入动画完成
}

/** 阶段 2：3D 翻转揭示卡面 */
async function flipReveal(card) {
  const container = $('.card-back-flyin');
  if (!container) return;

  // 替换为完整 flip 容器：正反两面
  const parent = container.parentElement;
  const oldEl = container;

  const flipContainer = el('div', { class: 'card-flip-container is-flipping' }, [
    el('div', { class: 'card-flip-inner' }, [
      // 正面（卡背图案）— 翻转前可见
      el('div', { class: 'card-face card-face--front card-back' }, [
        el('div', { class: 'card-back__pattern' }, [
          el('span', { class: 'card-back__logo' }, '★'),
        ]),
      ]),
      // 反面（卡面内容）— 翻转后可见
      el('div', { class: 'card-face card-face--back' }, [
        createCardEl(card),
      ]),
    ]),
  ]);

  parent.replaceChild(flipContainer, oldEl);

  // 触发翻转
  await sleep(50);
  flipContainer.classList.add('is-flipped');
  await sleep(700);
  flipContainer.classList.remove('is-flipping');

  // 翻转完成后，保留卡牌并添加交互按钮
  const cardEl = $('.insight-card', flipContainer);
  if (cardEl) {
    const actions = el('div', { class: 'cards-current__actions' }, [
      el('button', {
        class: 'cards-action-btn',
        type: 'button',
        on: { click: handleDraw },
      }, '再抽一张'),
    ]);
    flipContainer.append(actions);
  }
}

/** 清空收藏 */
function handleReset() {
  if (collected.size === 0) {
    document.dispatchEvent(new CustomEvent('cards:info', { detail: { message: '图鉴还是空的' } }));
    return;
  }
  // 简易确认（不引入 modal，用 toast 的二次点击确认）
  if (!handleReset._confirming) {
    handleReset._confirming = true;
    document.dispatchEvent(new CustomEvent('cards:warning', {
      detail: { message: `确定清空 ${collected.size} 张收藏？再点一次确认` },
    }));
    setTimeout(() => { handleReset._confirming = false; }, 3000);
    return;
  }
  handleReset._confirming = false;
  collected.clear();
  storage.remove(STORAGE_KEY);
  storage.remove(DRAW_LOG_KEY);
  drawCount = 0;
  renderStats();
  renderLegend();
  renderCollection();
  document.dispatchEvent(new CustomEvent('cards:success', { detail: { message: '已清空收藏' } }));
}

/* ============ 模块导出 ============ */
export const cardsModule = {
  async mount(container, app) {
    loadPersisted();
    renderSkeleton(container);

    // 监听自定义事件转发到 app.toast
    document.addEventListener('cards:new', (e) => {
      const { card, rarity } = e.detail;
      const messages = {
        common: `新卡片：${card.title}`,
        rare: `★ 稀有卡：${card.title}`,
        epic: `★★ 史诗卡：${card.title}`,
        legendary: `★★★ 传说卡！${card.title}`,
      };
      app.toast(messages[card.rarity] || messages.common, 'success', 3000);
    });
    document.addEventListener('cards:info', (e) => app.toast(e.detail.message, 'info'));
    document.addEventListener('cards:warning', (e) => app.toast(e.detail.message, 'warning', 3000));
    document.addEventListener('cards:success', (e) => app.toast(e.detail.message, 'success'));
    document.addEventListener('cards:error', (e) => app.toast(e.detail.message, 'error'));

    try {
      await loadCards();
      renderStats();
      renderLegend();
      renderCollection();
    } catch (err) {
      const stage = $('.cards-stage', container);
      if (stage) {
        stage.append(el('div', { class: 'cards-error' }, '卡片数据加载失败，请刷新重试'));
      }
    }
  },
};
