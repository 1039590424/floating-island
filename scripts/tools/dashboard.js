// dashboard.js
// 工作台 — AI 任务管理工作台
// 功能：
//   1. 顶部欢迎区 + 任务发布输入框
//   2. 任务卡片列表（多任务并行，每个卡片有状态/进度条/动画）
//   3. 状态：queued(待机) / running(运行中) / done(完成) / failed(失败)
//   4. 点击卡片进入详情面板（占位，后续优化）
//   5. 任务持久化（localStorage）

import { el, clear, $ } from '../utils/dom.js';
import { sleep, uid, relativeTime, formatDate } from '../utils/helpers.js';
import * as storage from '../utils/storage.js';

const TASKS_KEY = 'ai:tasks'; // AI 任务列表（含状态）

/** 任务类型预设（不同类型有不同的图标和执行动画） */
const TASK_TYPES = [
  { id: 'write',    icon: '✍', name: '写作',   color: 'var(--nintendo-blue)' },
  { id: 'code',     icon: '⚡', name: '代码',   color: 'var(--nintendo-red)' },
  { id: 'analyze',  icon: '📊', name: '分析',   color: 'var(--nintendo-green)' },
  { id: 'image',    icon: '🎨', name: '绘图',   color: 'var(--nintendo-purple)' },
  { id: 'translate',icon: '🌐', name: '翻译',   color: 'var(--nintendo-yellow)' },
  { id: 'general',  icon: '✦', name: '通用',   color: 'var(--color-text-secondary)' },
];

/** AI 执行阶段（不同阶段显示不同文案）*/
const AI_STAGES = [
  { text: '理解任务中…',     duration: 600, progress: 15 },
  { text: '整理思路…',       duration: 700, progress: 35 },
  { text: '生成方案…',       duration: 900, progress: 60 },
  { text: '校对与优化…',     duration: 600, progress: 85 },
  { text: '完成',           duration: 200, progress: 100 },
];

/** 模拟 AI 响应（占位，后续接入真实后端） */
function mockAIResponse(prompt) {
  const trimmed = (prompt || '').trim();
  if (!trimmed) return '任务描述为空。';
  return [
    `已处理任务："${trimmed.slice(0, 60)}${trimmed.length > 60 ? '…' : ''}"`,
    '',
    '当前为演示模式，AI 执行能力尚未接入真实后端。',
    '后续规划：通过 fetch 调用后端 AI 接口，流式接收响应并实时更新此卡片。',
  ].join('\n');
}

/** 根据任务描述推断类型 */
function inferTaskType(prompt) {
  const p = (prompt || '').toLowerCase();
  if (/写|文章|文案|总结|邮件|报告/.test(p)) return 'write';
  if (/代码|函数|bug|编程|实现|开发/.test(p)) return 'code';
  if (/分析|统计|数据|报表|趋势/.test(p)) return 'analyze';
  if (/画|图|设计|海报|logo/.test(p)) return 'image';
  if (/翻译|translate|英文|中文/.test(p)) return 'translate';
  return 'general';
}

/* ============ 任务存储 ============ */
function loadTasks() {
  return storage.get(TASKS_KEY, []);
}
function saveTasks(tasks) {
  storage.set(TASKS_KEY, tasks.slice(0, 50));
}

/* ============ 渲染主结构 ============ */
function renderSkeleton(container, app) {
  clear(container);
  const root = el('div', { class: 'dashboard' }, [
    // 顶部：欢迎区 + 发布框
    el('section', { class: 'dashboard__top' }, [
      el('div', { class: 'dashboard__welcome' }, [
        el('div', { class: 'welcome__avatar', attrs: { 'aria-hidden': 'true' } }, '★'),
        el('div', { class: 'welcome__text' }, [
          el('h2', { class: 'welcome__greeting', id: 'welcome-greeting' }, '你好'),
          el('p', { class: 'welcome__date', id: 'welcome-date' }, ''),
        ]),
      ]),
      // 任务发布面板
      el('div', { class: 'ai-publisher' }, [
        el('div', { class: 'ai-publisher__type-bar', id: 'ai-type-bar' }),
        el('textarea', {
          class: 'ai-publisher__input',
          id: 'ai-task-input',
          attrs: {
            placeholder: '描述你想让 AI 干的活…\n例如：帮我写一份本周工作总结 / 翻译这段英文 / 分析这个数据',
            rows: '2',
            'aria-label': '任务描述',
          },
        }),
        el('div', { class: 'ai-publisher__actions' }, [
          el('span', { class: 'ai-publisher__hint' }, 'Enter 发布 · Shift+Enter 换行'),
          el('button', {
            class: 'ai-publisher__submit',
            type: 'button',
            id: 'ai-task-submit',
            on: { click: handlePublish },
          }, [
            el('span', { class: 'ai-publisher__submit-icon' }, '▶'),
            el('span', {}, '发布任务'),
          ]),
        ]),
      ]),
    ]),

    // 任务卡片列表区
    el('section', { class: 'dashboard__tasks' }, [
      el('div', { class: 'dashboard__tasks-header' }, [
        el('h3', { class: 'dashboard__section-title' }, '任务工作区'),
        el('div', { class: 'dashboard__tasks-stats', id: 'tasks-stats' }),
      ]),
      el('div', { class: 'task-cards', id: 'task-cards' }),
    ]),
  ]);
  container.append(root);
  return root;
}

/** 渲染欢迎区 */
function renderWelcome() {
  const greeting = $('#welcome-greeting');
  const dateEl = $('#welcome-date');
  if (!greeting || !dateEl) return;

  const now = new Date();
  const hour = now.getHours();
  let text = '夜深了';
  if (hour < 5) text = '夜深了';
  else if (hour < 11) text = '早上好';
  else if (hour < 13) text = '中午好';
  else if (hour < 18) text = '下午好';
  else if (hour < 22) text = '晚上好';
  greeting.textContent = `${text}，欢迎回到工作站`;

  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  dateEl.textContent = `${formatDate(now, 'YYYY年MM月DD日')} · ${weekdays[now.getDay()]}`;
}

/** 渲染任务类型选择条 */
function renderTypeBar() {
  const bar = $('#ai-type-bar');
  if (!bar) return;
  clear(bar);
  let selectedType = 'auto'; // auto 表示自动推断

  TASK_TYPES.forEach((t) => {
    const btn = el('button', {
      class: 'type-chip',
      type: 'button',
      dataset: { type: t.id },
      style: { '--chip-color': t.color },
      attrs: { 'aria-pressed': 'false' },
      on: {
        click: () => {
          const isAuto = btn.dataset.type === selectedType;
          bar.querySelectorAll('.type-chip').forEach((b) => {
            b.classList.remove('is-active');
            b.setAttribute('aria-pressed', 'false');
          });
          if (isAuto) {
            selectedType = 'auto';
          } else {
            btn.classList.add('is-active');
            btn.setAttribute('aria-pressed', 'true');
            selectedType = t.id;
          }
        },
      },
    }, [
      el('span', { class: 'type-chip__icon' }, t.icon),
      el('span', {}, t.name),
    ]);
    bar.append(btn);
  });

  // "自动" 选项
  const autoBtn = el('button', {
    class: 'type-chip type-chip--auto is-active',
    type: 'button',
    dataset: { type: 'auto' },
    attrs: { 'aria-pressed': 'true' },
    on: {
      click: () => {
        bar.querySelectorAll('.type-chip').forEach((b) => {
          b.classList.remove('is-active');
          b.setAttribute('aria-pressed', 'false');
        });
        autoBtn.classList.add('is-active');
        autoBtn.setAttribute('aria-pressed', 'true');
      },
    },
  }, [
    el('span', { class: 'type-chip__icon' }, '◆'),
    el('span', {}, '自动'),
  ]);
  bar.prepend(autoBtn);
}

/* ============ 任务卡片渲染 ============ */
function renderTaskCards() {
  const container = $('#task-cards');
  if (!container) return;
  clear(container);

  const tasks = loadTasks();
  updateStats(tasks);

  if (tasks.length === 0) {
    container.append(el('div', { class: 'task-cards__empty' }, [
      el('div', { class: 'task-cards__empty-icon' }, '◆'),
      el('p', { class: 'task-cards__empty-text' }, '还没有任务'),
      el('p', { class: 'task-cards__empty-hint' }, '在上方输入框描述任务，点击「发布任务」开始'),
    ]));
    return;
  }

  tasks.forEach((task) => {
    container.append(renderTaskCard(task));
  });
}

/** 渲染单个任务卡片 */
function renderTaskCard(task) {
  const type = TASK_TYPES.find((t) => t.id === task.type) || TASK_TYPES[TASK_TYPES.length - 1];
  const statusMeta = getStatusMeta(task.status);

  return el('div', {
    class: `task-card task-card--${task.status}`,
    dataset: { taskId: task.id },
    on: {
      click: () => openTaskDetail(task),
    },
  }, [
    // 左侧状态指示器（脉冲动画）
    el('div', { class: 'task-card__status-indicator', style: { '--status-color': statusMeta.color } }),
    // 主体
    el('div', { class: 'task-card__body' }, [
      el('div', { class: 'task-card__header' }, [
        el('div', { class: 'task-card__type', style: { '--type-color': type.color } }, [
          el('span', { class: 'task-card__type-icon' }, type.icon),
          el('span', { class: 'task-card__type-name' }, type.name),
        ]),
        el('span', { class: `task-card__status task-card__status--${task.status}` }, statusMeta.label),
      ]),
      el('div', { class: 'task-card__prompt' }, task.prompt),
      // 进度条（运行中显示）
      task.status === 'running'
        ? el('div', { class: 'task-card__progress' }, [
            el('div', { class: 'task-card__progress-bar' }, [
              el('div', {
                class: 'task-card__progress-fill',
                style: { width: `${task.progress || 0}%` },
              }),
            ]),
            el('span', { class: 'task-card__progress-text', id: `progress-text-${task.id}` },
              task.stageText || AI_STAGES[0].text
            ),
          ])
        : null,
      // 结果预览（完成时显示）
      task.status === 'done' && task.response
        ? el('div', { class: 'task-card__result' }, task.response.split('\n')[0])
        : null,
      // 错误信息（失败时显示）
      task.status === 'failed' && task.error
        ? el('div', { class: 'task-card__error' }, task.error)
        : null,
      // 底部信息
      el('div', { class: 'task-card__footer' }, [
        el('span', { class: 'task-card__time' }, relativeTime(task.createdAt)),
        el('span', { class: 'task-card__go' }, '查看详情 →'),
      ]),
    ]),
  ]);
}

/** 获取状态元数据 */
function getStatusMeta(status) {
  const map = {
    queued:  { label: '待机',   color: 'var(--color-text-muted)' },
    running: { label: '运行中', color: 'var(--nintendo-blue)' },
    done:    { label: '已完成', color: 'var(--nintendo-green)' },
    failed:  { label: '失败',   color: 'var(--nintendo-red)' },
  };
  return map[status] || map.queued;
}

/** 更新统计 */
function updateStats(tasks) {
  const statsEl = $('#tasks-stats');
  if (!statsEl) return;
  const running = tasks.filter((t) => t.status === 'running').length;
  const done = tasks.filter((t) => t.status === 'done').length;
  const queued = tasks.filter((t) => t.status === 'queued').length;
  clear(statsEl);
  statsEl.append(
    el('span', { class: 'stat-pill stat-pill--running' }, `运行中 ${running}`),
    el('span', { class: 'stat-pill stat-pill--queued' }, `待机 ${queued}`),
    el('span', { class: 'stat-pill stat-pill--done' }, `完成 ${done}`)
  );
}

/* ============ 任务详情（占位）============ */
function openTaskDetail(task) {
  const type = TASK_TYPES.find((t) => t.id === task.type) || TASK_TYPES[TASK_TYPES.length - 1];
  const statusMeta = getStatusMeta(task.status);

  // 创建详情覆盖层
  const existing = document.getElementById('task-detail-overlay');
  if (existing) existing.remove();

  const overlay = el('div', {
    class: 'task-detail-overlay',
    id: 'task-detail-overlay',
    on: {
      click: (e) => {
        if (e.target === overlay) overlay.remove();
      },
    },
  }, [
    el('div', { class: 'task-detail' }, [
      el('button', {
        class: 'task-detail__close',
        type: 'button',
        attrs: { 'aria-label': '关闭' },
        on: { click: () => overlay.remove() },
      }, '×'),
      el('div', { class: 'task-detail__header' }, [
        el('div', { class: 'task-detail__type', style: { '--type-color': type.color } }, [
          el('span', { class: 'task-detail__type-icon' }, type.icon),
          el('span', {}, type.name),
        ]),
        el('span', { class: `task-detail__status task-detail__status--${task.status}` }, statusMeta.label),
      ]),
      el('div', { class: 'task-detail__section' }, [
        el('h4', { class: 'task-detail__label' }, '任务描述'),
        el('p', { class: 'task-detail__prompt' }, task.prompt),
      ]),
      task.status === 'running'
        ? el('div', { class: 'task-detail__section' }, [
            el('h4', { class: 'task-detail__label' }, '执行进度'),
            el('div', { class: 'task-card__progress-bar' }, [
              el('div', {
                class: 'task-card__progress-fill',
                style: { width: `${task.progress || 0}%` },
              }),
            ]),
            el('p', { class: 'task-detail__stage' }, task.stageText || ''),
          ])
        : null,
      task.response
        ? el('div', { class: 'task-detail__section' }, [
            el('h4', { class: 'task-detail__label' }, '执行结果'),
            el('pre', { class: 'task-detail__response' }, task.response),
          ])
        : null,
      el('div', { class: 'task-detail__meta' }, [
        el('span', {}, `创建时间：${formatDate(task.createdAt, 'YYYY-MM-DD HH:mm')}`),
        task.duration ? el('span', {}, `耗时：${(task.duration / 1000).toFixed(1)}s`) : null,
      ]),
      el('div', { class: 'task-detail__tip' }, '详情页后续将支持：结果编辑、重新执行、导出、对接真实 AI 后端'),
    ]),
  ]);
  document.body.append(overlay);
}

/* ============ 发布任务 ============ */
let isRunning = false;

async function handlePublish() {
  if (isRunning) return;
  const input = $('#ai-task-input');
  if (!input) return;

  const prompt = input.value.trim();
  if (!prompt) {
    input.classList.add('anim-shake');
    input.focus();
    setTimeout(() => input.classList.remove('anim-shake'), 400);
    return;
  }

  // 获取选中的类型
  const activeTypeBtn = $('.type-chip.is-active');
  const selectedType = activeTypeBtn?.dataset.type || 'auto';
  const type = selectedType === 'auto' ? inferTaskType(prompt) : selectedType;
  const typeMeta = TASK_TYPES.find((t) => t.id === type) || TASK_TYPES[TASK_TYPES.length - 1];

  isRunning = true;
  const submitBtn = $('#ai-task-submit');
  if (submitBtn) submitBtn.disabled = true;
  input.disabled = true;

  // 创建任务并加入列表（状态：running）
  const task = {
    id: uid('task'),
    prompt,
    type,
    status: 'running',
    progress: 0,
    stageText: AI_STAGES[0].text,
    createdAt: Date.now(),
    response: null,
    error: null,
    duration: 0,
  };
  const tasks = loadTasks();
  tasks.unshift(task);
  saveTasks(tasks);
  renderTaskCards();

  // 滚动到新任务
  const cardEl = $(`[data-task-id="${task.id}"]`);
  if (cardEl) cardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  // 执行阶段动画
  const startTime = Date.now();
  for (const stage of AI_STAGES) {
    // 更新任务状态
    task.stageText = stage.text;
    task.progress = stage.progress;
    updateTaskInList(task);

    await sleep(stage.duration);
  }

  // 生成结果
  try {
    task.response = mockAIResponse(prompt);
    task.status = 'done';
    task.duration = Date.now() - startTime;
  } catch (err) {
    task.status = 'failed';
    task.error = err.message || '执行失败';
    task.duration = Date.now() - startTime;
  }

  saveTasks(loadTasks().map((t) => (t.id === task.id ? task : t)));
  renderTaskCards();

  isRunning = false;
  if (submitBtn) submitBtn.disabled = false;
  input.disabled = false;
  input.value = '';
  input.focus();

  handlePublish._app?.toast?.(
    task.status === 'done' ? '任务已完成' : '任务执行失败',
    task.status === 'done' ? 'success' : 'error'
  );
}

/** 更新列表中单个任务（不重建整个列表，保留滚动位置）*/
function updateTaskInList(task) {
  const card = $(`[data-task-id="${task.id}"]`);
  if (!card) return;
  // 更新进度条
  const fill = $('.task-card__progress-fill', card);
  if (fill) fill.style.width = `${task.progress || 0}%`;
  // 更新阶段文案
  const stageText = $(`#progress-text-${task.id}`, card) || $('.task-card__progress-text', card);
  if (stageText) stageText.textContent = task.stageText;
  // 同步存储
  saveTasks(loadTasks().map((t) => (t.id === task.id ? task : t)));
}

/* ============ 模块导出 ============ */
export const dashboardModule = {
  mount(container, app) {
    renderSkeleton(container, app);
    renderWelcome();
    renderTypeBar();
    renderTaskCards();

    // 绑定输入框快捷键
    const input = $('#ai-task-input');
    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          handlePublish();
        }
      });
    }

    // Toast 转发
    document.addEventListener('dashboard:toast', (e) => {
      const { message, type = 'info' } = e.detail;
      app.toast(message, type);
    });

    // 每分钟刷新时间显示
    setInterval(() => {
      renderWelcome();
      renderTaskCards();
    }, 60 * 1000);

    // 让 handlePublish 能访问 app（用于 toast）
    handlePublish._app = app;

    // ESC 关闭详情
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const overlay = document.getElementById('task-detail-overlay');
        if (overlay) overlay.remove();
      }
    });
  },
};
