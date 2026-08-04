// cards.js
// 感悟卡片模块 — 创作型抽卡系统
// 流程：抽关键词 → 用户写感悟 → AI 评级 → 生成符文卡片 → 入图鉴
// 机制：每日 3 次抽卡，12 小时冷却回满；评级后不可重写，可销毁

import { el, clear, $ } from '../utils/dom.js';
import { sleep } from '../utils/helpers.js';
import * as storage from '../utils/storage.js';
import { gradeInsight } from './ai-grade.js';
import { drawRune, getGradeConfig, GRADES } from './rune.js';

const CARDS_URL = 'data/cards.json';
const KEYWORDS_URL = 'data/keywords.json';
const DAILY_KEY = 'cards:daily';        // { remaining, nextReset }
const COLLECTION_KEY = 'cards:collection'; // 已收藏卡片数组
const HISTORY_KEY = 'cards:history';     // 抽卡历史

let cardConfig = null;    // cards.json 配置
let keywordData = null;   // keywords.json 词库
let collection = [];      // 已收藏卡片
let isDrawing = false;    // 防连点

/* ============ 数据加载 ============ */
async function loadData() {
  if (!cardConfig) {
    const [c, k] = await Promise.all([
      fetch(CARDS_URL).then((r) => r.json()),
      fetch(KEYWORDS_URL).then((r) => r.json()),
    ]);
    cardConfig = c;
    keywordData = k;
  }
}

/* ============ 每日抽卡次数管理 ============ */
function getDailyStatus() {
  const now = Date.now();
  const saved = storage.get(DAILY_KEY, null);
  if (!saved || now >= saved.nextReset) {
    // 首次或已过冷却，重置
    const next = now + cardConfig.dailyConfig.cooldownHours * 3600 * 1000;
    const fresh = { remaining: cardConfig.dailyConfig.drawsPerDay, nextReset: next };
    storage.set(DAILY_KEY, fresh);
    return fresh;
  }
  return saved;
}

function consumeDraw() {
  const daily = getDailyStatus();
  daily.remaining = Math.max(0, daily.remaining - 1);
  storage.set(DAILY_KEY, daily);
  return daily.remaining;
}

/* ============ 抽关键词 ============ */
function drawKeyword() {
  // 从所有主题的所有词中随机抽一个
  const allWords = [];
  keywordData.themes.forEach((t) => {
    t.words.forEach((w) => allWords.push({ ...w, theme: t.name, themeIcon: t.icon }));
  });
  return allWords[Math.floor(Math.random() * allWords.length)];
}

/* ============ 收藏管理 ============ */
function loadCollection() {
  collection = storage.get(COLLECTION_KEY, []);
}

function saveCard(card) {
  collection.unshift(card);
  storage.set(COLLECTION_KEY, collection);
  // 历史
  const log = storage.get(HISTORY_KEY, []);
  log.unshift({ cardId: card.id, time: Date.now(), grade: card.grade });
  storage.set(HISTORY_KEY, log.slice(0, 100));
}

function destroyCard(cardId) {
  collection = collection.filter((c) => c.id !== cardId);
  storage.set(COLLECTION_KEY, collection);
}

/* ============ 渲染主结构 ============ */
function renderSkeleton(container) {
  clear(container);
  const root = el('div', { class: 'cards-module' }, [
    el('header', { class: 'island__title' }, [
      '感悟卡片',
      el('span', { class: 'island__title-accent' }, ['INSIGHT CARDS']),
    ]),

    // 抽卡舞台
    el('div', { class: 'cards-stage', id: 'cards-stage' }, [
      el('div', { class: 'cards-daily-info', id: 'cards-daily-info' }), // 剩余次数/冷却
      el('div', { class: 'cards-deck-wrap', id: 'cards-deck-wrap' }, [
        el('div', { class: 'cards-deck', attrs: { 'aria-hidden': 'true' } }, [
          el('div', { class: 'cards-deck__layer cards-deck__layer--3' }),
          el('div', { class: 'cards-deck__layer cards-deck__layer--2' }),
          el('div', { class: 'cards-deck__layer cards-deck__layer--1' }),
          el('div', { class: 'cards-deck__layer cards-deck__layer--0' }, [
            el('span', { class: 'cards-deck__icon' }, '?'),
          ]),
        ]),
        el('button', {
          class: 'cards-draw-btn',
          id: 'cards-draw-btn',
          type: 'button',
          attrs: { 'aria-label': '抽取关键词' },
        }, [
          el('span', { class: 'cards-draw-btn__icon' }, '✦'),
          el('span', { class: 'cards-draw-btn__text' }, '抽取关键词'),
        ]),
      ]),
      // 当前抽到的关键词 + 写作区（动态出现）
      el('div', { class: 'cards-current', id: 'cards-current', attrs: { 'aria-live': 'polite' } }),
    ]),

    // 统计区
    el('div', { class: 'cards-stats', id: 'cards-stats' }, [
      el('div', { class: 'cards-stat' }, [
        el('div', { class: 'cards-stat__value', id: 'stat-draws' }, '0'),
        el('div', { class: 'cards-stat__label' }, '累计抽卡'),
      ]),
      el('div', { class: 'cards-stat' }, [
        el('div', { class: 'cards-stat__value', id: 'stat-collected' }, '0'),
        el('div', { class: 'cards-stat__label' }, '已收藏'),
      ]),
      el('div', { class: 'cards-stat' }, [
        el('div', { class: 'cards-stat__value', id: 'stat-best' }, '—'),
        el('div', { class: 'cards-stat__label' }, '最高等级'),
      ]),
      el('div', { class: 'cards-stat' }, [
        el('div', { class: 'cards-stat__value', id: 'stat-sss' }, '0'),
        el('div', { class: 'cards-stat__label' }, 'SSS 卡数'),
      ]),
    ]),

    // 图鉴
    el('div', { class: 'cards-collection' }, [
      el('div', { class: 'cards-collection__header' }, [
        el('h3', { class: 'cards-collection__title' }, '我的感悟图鉴'),
        el('div', { class: 'cards-collection__actions' }, [
          el('button', {
            class: 'cards-collection__btn',
            id: 'cards-clear-btn',
            type: 'button',
          }, '清空收藏'),
        ]),
      ]),
      el('div', { class: 'cards-collection__grid', id: 'cards-grid' }),
    ]),
  ]);
  container.append(root);
  return root;
}

/* ============ 渲染：每日信息 ============ */
function renderDailyInfo() {
  const info = $('#cards-daily-info');
  if (!info) return;
  const daily = getDailyStatus();
  clear(info);
  if (daily.remaining > 0) {
    info.append(el('span', { class: 'cards-daily-info__remaining' }, [
      el('span', { class: 'cards-daily-info__dot' }, '●'),
      `今日剩余 ${daily.remaining} 次抽卡机会`,
    ]));
  } else {
    const remainMs = daily.nextReset - Date.now();
    const hours = Math.floor(remainMs / 3600000);
    const mins = Math.floor((remainMs % 3600000) / 60000);
    info.append(el('span', { class: 'cards-daily-info__cooldown' }, [
      el('span', { class: 'cards-daily-info__dot cards-daily-info__dot--cooling' }, '◐'),
      `冷却中，${hours}时${mins}分后恢复`,
    ]));
  }
}

/* ============ 渲染：统计 ============ */
function renderStats() {
  const drawLog = storage.get(HISTORY_KEY, []);
  const setVal = (id, v) => { const n = $(id); if (n) n.textContent = v; };
  setVal('#stat-draws', drawLog.length);
  setVal('#stat-collected', collection.length);
  // 最高等级
  const gradeOrder = GRADES; // SSS > S > A > ...
  const best = collection
    .map((c) => c.grade)
    .sort((a, b) => GRADES.indexOf(a) - GRADES.indexOf(b))[0];
  setVal('#stat-best', best || '—');
  setVal('#stat-sss', collection.filter((c) => c.grade === 'SSS').length);
}

/* ============ 渲染：图鉴网格（卡背小卡）============ */
function renderCollection() {
  const grid = $('#cards-grid');
  if (!grid) return;
  clear(grid);

  if (collection.length === 0) {
    grid.append(el('div', { class: 'cards-empty' }, [
      el('div', { class: 'cards-empty__icon' }, '✦'),
      el('p', {}, '还没有感悟卡片，抽一张关键词开始你的思考之旅'),
    ]));
    return;
  }

  // 按等级从高到低排列
  const sorted = [...collection].sort((a, b) =>
    GRADES.indexOf(a.grade) - GRADES.indexOf(b.grade)
  );

  sorted.forEach((card) => {
    const cfg = getGradeConfig(card.grade);
    // 卡背小卡：金属底 + 等级徽章 + 符文 + 高光
    const item = el('div', {
      class: ['col-card', `col-card--${card.grade}`],
      dataset: { cardId: card.id },
      attrs: { role: 'button', tabindex: '0', 'aria-label': `${cfg.name}：${card.keyword}` },
      on: {
        click: () => previewCard(card),
        keydown: (e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); previewCard(card); }
        },
      },
    }, [
      // 金属高光层
      el('div', { class: 'col-card__shine' }),
      // 等级徽章
      el('div', { class: 'col-card__grade', style: { color: cfg.color } }, card.grade),
      // 符文
      el('canvas', {
        class: 'col-card__rune',
        attrs: { width: '70', height: '70' },
      }),
      // 主题标识
      el('div', { class: 'col-card__theme' }, card.theme),
    ]);
    const canvas = item.querySelector('canvas');
    if (canvas) drawRune(canvas, card.grade, card.runeSeed, false);
    grid.append(item);
  });
}

/* ============ 预览卡片（弹出模态 + 翻开动画）============ */
let activeModal = null;

function previewCard(card) {
  // 关闭已存在的模态
  if (activeModal) { activeModal.remove(); activeModal = null; }

  const cfg = getGradeConfig(card.grade);

  // 模态容器
  const modal = el('div', { class: 'card-modal', attrs: { role: 'dialog', 'aria-modal': 'true' } }, [
    el('div', { class: 'card-modal__backdrop' }),
    el('div', { class: 'card-modal__content' }, [
      // 翻牌容器：先显示卡背，点击/自动翻到卡面
      el('div', { class: 'card-flip-container card-modal__flip', id: 'modal-flip' }, [
        el('div', { class: 'card-flip-inner' }, [
          // 卡背（金属符文面 — 神秘面）
          el('div', { class: 'card-face card-face--front' }, [
            el('div', { class: ['card-mystic', `card-mystic--${card.grade}`] }, [
              el('div', { class: 'card-mystic__shine' }),
              el('div', { class: 'card-mystic__grade', style: { color: cfg.color } }, card.grade),
              el('canvas', {
                class: 'card-mystic__rune',
                attrs: { width: '140', height: '140' },
              }),
              el('div', { class: 'card-mystic__hint' }, '点击翻开'),
            ]),
          ]),
          // 卡面（感悟内容）
          el('div', { class: 'card-face card-face--back' }, [
            createInsightCardEl(card),
          ]),
        ]),
      ]),
      // 操作按钮
      el('div', { class: 'card-modal__actions' }, [
        el('button', {
          class: 'cards-action-btn cards-action-btn--destroy',
          type: 'button',
          on: {
            click: () => {
              if (!confirm(`确定销毁这张「${card.keyword}」卡片？销毁后无法恢复。`)) return;
              destroyCard(card.id);
              closeModal();
              renderStats();
              renderCollection();
              toast('已销毁卡片', 'info');
            },
          },
        }, '销毁此卡'),
        el('button', {
          class: 'cards-action-btn',
          type: 'button',
          on: { click: closeModal },
        }, '关闭'),
      ]),
    ]),
  ]);

  document.body.append(modal);
  activeModal = modal;

  // 绘制卡背符文（动画）
  const mysticCanvas = modal.querySelector('.card-mystic__rune');
  if (mysticCanvas) drawRune(mysticCanvas, card.grade, card.runeSeed, true);

  // 点击卡背 → 翻开到卡面
  const flip = modal.querySelector('#modal-flip');
  const flipToBack = () => {
    flip.classList.add('is-flipped');
    // 翻开后绘制卡面符文
    const insightCanvas = modal.querySelector('.insight-card__rune');
    if (insightCanvas) drawRune(insightCanvas, card.grade, card.runeSeed, true);
    flip.removeEventListener('click', flipToBack);
  };
  if (flip) {
    flip.addEventListener('click', flipToBack);
    // 1.2 秒后自动翻开
    setTimeout(() => {
      if (activeModal === modal && !flip.classList.contains('is-flipped')) {
        flipToBack();
      }
    }, 1200);
  }

  // 点击背景关闭
  const backdrop = modal.querySelector('.card-modal__backdrop');
  if (backdrop) backdrop.addEventListener('click', closeModal);

  // ESC 关闭
  const escHandler = (e) => {
    if (e.key === 'Escape') { closeModal(); document.removeEventListener('keydown', escHandler); }
  };
  document.addEventListener('keydown', escHandler);
}

function closeModal() {
  if (activeModal) { activeModal.remove(); activeModal = null; }
}

/* ============ 抽卡主流程 ============ */
async function handleDraw() {
  if (isDrawing) return;

  const daily = getDailyStatus();
  if (daily.remaining <= 0) {
    toast('今日抽卡次数已用完，请等待冷却', 'warning');
    return;
  }

  isDrawing = true;
  const btn = $('#cards-draw-btn');
  if (btn) { btn.disabled = true; btn.classList.add('is-drawing'); }

  try {
    await loadData();
    const keyword = drawKeyword();

    // 消耗一次抽卡机会
    consumeDraw();
    renderDailyInfo();

    // 阶段 1：抽卡动画 + 揭示关键词
    await animateDrawKeyword(keyword);

    // 阶段 2：展示写作面板
    showWritingPanel(keyword);
  } catch (err) {
    console.error('[cards] 抽卡失败', err);
    toast('抽卡失败，请刷新重试', 'error');
  } finally {
    isDrawing = false;
    if (btn) { btn.disabled = false; btn.classList.remove('is-drawing'); }
  }
}

/** 阶段 1：卡组震动 → 关键词揭示 */
async function animateDrawKeyword(keyword) {
  const current = $('#cards-current');
  if (!current) return;
  clear(current);

  // 卡组震动
  const deck = $('.cards-deck');
  if (deck) {
    deck.classList.add('is-shaking');
    await sleep(400);
    deck.classList.remove('is-shaking');
  }

  // 关键词卡飞入
  const kwCard = el('div', { class: 'keyword-reveal card-back-flyin' }, [
    el('div', { class: 'keyword-reveal__inner' }, [
      el('div', { class: 'keyword-reveal__theme' }, [
        el('span', {}, keyword.themeIcon),
        el('span', {}, keyword.theme),
      ]),
      el('div', { class: 'keyword-reveal__word' }, keyword.word),
      el('div', { class: 'keyword-reveal__hint' }, keyword.hint),
    ]),
  ]);
  current.append(kwCard);
  await sleep(600);
}

/** 阶段 2：展示写作面板 */
function showWritingPanel(keyword) {
  const current = $('#cards-current');
  if (!current) return;
  clear(current);

  const cfg = cardConfig.dailyConfig;
  const panel = el('div', { class: 'writing-panel' }, [
    el('div', { class: 'writing-panel__keyword' }, [
      el('span', { class: 'writing-panel__theme' }, `${keyword.themeIcon} ${keyword.theme}`),
      el('div', { class: 'writing-panel__word' }, keyword.word),
      el('div', { class: 'writing-panel__hint' }, keyword.hint),
    ]),
    el('textarea', {
      class: 'writing-panel__textarea',
      id: 'writing-input',
      attrs: {
        placeholder: `围绕「${keyword.word}」写下你的感悟（${cfg.minWords}-${cfg.maxWords} 字）…`,
        'aria-label': '感悟内容',
        minlength: String(cfg.minWords),
        maxlength: String(cfg.maxWords),
        rows: '6',
      },
    }),
    el('div', { class: 'writing-panel__footer' }, [
      el('span', { class: 'writing-panel__count', id: 'writing-count' }, `0 / ${cfg.maxWords}`),
      el('div', { class: 'writing-panel__actions' }, [
        el('button', {
          class: 'cards-action-btn cards-action-btn--ghost',
          type: 'button',
          on: { click: () => { clear(current); renderDailyInfo(); } },
        }, '放弃'),
        el('button', {
          class: 'cards-action-btn cards-action-btn--primary',
          id: 'writing-submit',
          type: 'button',
        }, '提交评级'),
      ]),
    ]),
  ]);
  current.append(panel);

  // 字数统计
  const textarea = $('#writing-input');
  const countEl = $('#writing-count');
  const submitBtn = $('#writing-submit');
  if (textarea && countEl) {
    textarea.addEventListener('input', () => {
      const len = textarea.value.trim().length;
      countEl.textContent = `${len} / ${cfg.maxWords}`;
      countEl.classList.toggle('is-short', len < cfg.minWords);
      countEl.classList.toggle('is-ok', len >= cfg.minWords);
    });
  }

  // 提交评级
  if (submitBtn) {
    submitBtn.addEventListener('click', () => handleSubmitInsight(keyword, textarea, submitBtn));
  }

  // 自动聚焦
  if (textarea) textarea.focus();
}

/** 阶段 3：提交感悟 → AI 评级 → 生成卡片 */
async function handleSubmitInsight(keyword, textarea, submitBtn) {
  const cfg = cardConfig.dailyConfig;
  const text = textarea.value.trim();

  if (text.length < cfg.minWords) {
    toast(`感悟太短了，至少 ${cfg.minWords} 字`, 'warning');
    textarea.focus();
    return;
  }
  if (text.length > cfg.maxWords) {
    toast(`感悟超长，最多 ${cfg.maxWords} 字`, 'warning');
    return;
  }

  // 提交按钮变 loading
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'AI 评级中…';
  }

  try {
    // 调用 AI 评级
    const result = await gradeInsight(text, keyword.word);

    // 生成卡片对象
    const cardId = 'c' + Date.now().toString(36);
    const runeSeed = keyword.word + Date.now() + cardId;
    const card = {
      id: cardId,
      keyword: keyword.word,
      theme: `${keyword.themeIcon} ${keyword.theme}`,
      hint: keyword.hint,
      text,
      grade: result.grade,
      comment: result.comment,
      scores: result.scores,
      total: result.total,
      runeSeed,
      time: Date.now(),
    };

    // 阶段 4：生成卡片动画（含收藏/销毁按钮，由用户选择是否入库）
    await animateRevealCard(card);

    if (result.grade === 'SSS' || result.grade === 'S') {
      toast(`恭喜！获得 ${result.grade} 级感悟卡片`, 'success', 3000);
    }
  } catch (err) {
    console.error('[cards] 评级失败', err);
    toast('评级失败，请重试', 'error');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = '提交评级';
    }
  }
}

/** 阶段 4：评级结果 + 卡片揭示动画 */
async function animateRevealCard(card) {
  const current = $('#cards-current');
  if (!current) return;
  clear(current);

  const cfg = getGradeConfig(card.grade);

  // 先展示评级结果
  const resultEl = el('div', { class: 'grade-result' }, [
    el('div', { class: `grade-result__badge grade-result__badge--${card.grade}` }, card.grade),
    el('div', { class: 'grade-result__label' }, cfg.name),
    el('div', { class: 'grade-result__comment' }, card.comment),
  ]);
  current.append(resultEl);
  await sleep(1500);

  // 翻转揭示卡片
  clear(current);
  const flipContainer = el('div', { class: 'card-flip-container is-flipping' }, [
    el('div', { class: 'card-flip-inner' }, [
      // 正面（卡背图案）
      el('div', { class: 'card-face card-face--front card-back' }, [
        el('div', { class: 'card-back__pattern' }, [
          el('span', { class: 'card-back__logo' }, '★'),
        ]),
      ]),
      // 反面（卡面）
      el('div', { class: 'card-face card-face--back' }, [
        createInsightCardEl(card),
      ]),
    ]),
  ]);
  current.append(flipContainer);
  await sleep(50);
  flipContainer.classList.add('is-flipped');
  await sleep(700);
  flipContainer.classList.remove('is-flipping');

  // 添加操作按钮：收藏 + 销毁 + 再抽一张
  const actions = el('div', { class: 'cards-current__actions' }, [
    el('button', {
      class: 'cards-action-btn cards-action-btn--primary',
      type: 'button',
      on: {
        click: () => {
          saveCard(card);
          renderStats();
          renderCollection();
          clear(current);
          renderDailyInfo();
          toast('已收藏到图鉴', 'success');
        },
      },
    }, '收藏'),
    el('button', {
      class: 'cards-action-btn cards-action-btn--destroy',
      type: 'button',
      on: {
        click: () => {
          if (!confirm(`丢弃这张「${card.keyword}」卡片？丢弃后无法恢复。`)) return;
          clear(current);
          renderDailyInfo();
          toast('已丢弃卡片', 'info');
        },
      },
    }, '丢弃'),
    el('button', {
      class: 'cards-action-btn',
      type: 'button',
      on: { click: handleDraw },
    }, '再抽一张'),
  ]);
  current.append(actions);

  // 绘制符文（动画）
  const canvas = flipContainer.querySelector('.insight-card__rune');
  if (canvas) drawRune(canvas, card.grade, card.runeSeed, true);
}

/** 创建感悟卡片 DOM */
function createInsightCardEl(card) {
  const cfg = getGradeConfig(card.grade);
  return el('div', {
    class: ['insight-card', `insight-card--${card.grade}`, `rarity-glow--${card.grade}`],
  }, [
    el('div', { class: 'insight-card__inner' }, [
      el('div', { class: 'insight-card__rarity-bar', style: { background: cfg.color } }),
      el('div', { class: 'insight-card__header' }, [
        el('span', { class: 'insight-card__rarity', style: { color: cfg.color } }, cfg.name),
        el('span', { class: 'insight-card__category' }, card.theme),
      ]),
      el('div', { class: 'insight-card__body' }, [
        el('div', { class: 'insight-card__keyword' }, card.keyword),
        el('p', { class: 'insight-card__text' }, card.text),
        card.comment ? el('div', { class: 'insight-card__comment' }, [
          el('span', { class: 'insight-card__comment-label' }, 'AI 点评'),
          card.comment,
        ]) : null,
      ]),
      el('div', { class: 'insight-card__footer' }, [
        el('span', {}, new Date(card.time).toLocaleString('zh-CN')),
        el('span', { class: 'insight-card__id' }, `#${card.id}`),
      ]),
      el('canvas', {
        class: 'insight-card__rune',
        attrs: { width: '120', height: '120' },
      }),
    ]),
  ]);
}

/* ============ 清空收藏 ============ */
function handleReset() {
  if (collection.length === 0) { toast('图鉴还是空的', 'info'); return; }
  if (!handleReset._confirming) {
    handleReset._confirming = true;
    toast(`确定清空 ${collection.length} 张收藏？再点一次确认`, 'warning', 3000);
    setTimeout(() => { handleReset._confirming = false; }, 3000);
    return;
  }
  handleReset._confirming = false;
  collection = [];
  storage.remove(COLLECTION_KEY);
  storage.remove(HISTORY_KEY);
  renderStats();
  renderCollection();
  toast('已清空收藏', 'success');
}

/* ============ Toast 转发 ============ */
function toast(msg, type, duration) {
  document.dispatchEvent(new CustomEvent('cards:toast', { detail: { message: msg, type, duration } }));
}

/* ============ 模块导出 ============ */
export const cardsModule = {
  async mount(container, app) {
    loadCollection();
    renderSkeleton(container);

    // toast 转发
    document.addEventListener('cards:toast', (e) => {
      const { message, type = 'info', duration } = e.detail;
      app.toast?.(message, type, duration);
    });

    // 抽卡按钮
    $('#cards-draw-btn')?.addEventListener('click', handleDraw);
    $('#cards-clear-btn')?.addEventListener('click', handleReset);

    try {
      await loadData();
      renderDailyInfo();
      renderStats();
      renderCollection();

      // 定时刷新冷却状态
      setInterval(renderDailyInfo, 60000);
    } catch (err) {
      const stage = $('#cards-stage');
      if (stage) stage.append(el('div', { class: 'cards-error' }, '数据加载失败，请刷新重试'));
    }
  },
};
