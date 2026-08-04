// tasks.js
// 任务与日程模块 — 工具层
// 待办事项管理：添加、完成、删除、筛选，数据存 localStorage
// 含完成时的小动画反馈与进度统计

import { el, clear, $ } from '../utils/dom.js';
import { uid, relativeTime } from '../utils/helpers.js';
import * as storage from '../utils/storage.js';

const TASKS_KEY = 'tasks:list';
const PRIORITIES = [
  { id: 'low',    name: '低',   color: 'var(--color-text-muted)' },
  { id: 'medium', name: '中',   color: 'var(--color-accent-orange)' },
  { id: 'high',   name: '高',   color: 'var(--color-danger)' },
];

function loadTasks() { return storage.get(TASKS_KEY, []); }
function saveTasks(tasks) { storage.set(TASKS_KEY, tasks); }

/* ============ 添加表单 ============ */
function renderForm(onAdd) {
  return el('form', {
    class: 'tasks-form',
    on: { submit: (e) => { e.preventDefault(); onAdd(); } },
  }, [
    el('input', {
      class: 'tasks-form__input',
      type: 'text',
      id: 'task-input',
      attrs: { placeholder: '添加一个待办事项…（Enter 提交）', 'aria-label': '任务内容' },
    }),
    el('select', {
      class: 'tasks-form__select',
      id: 'task-priority',
      attrs: { 'aria-label': '优先级' },
    }, PRIORITIES.map((p) => el('option', { value: p.id }, `${p.name}优先`))),
    el('button', { class: 'tasks-btn tasks-btn--primary', type: 'submit' }, '+ 添加'),
  ]);
}

/* ============ 统计与筛选 ============ */
function renderStats(tasks, filter, onFilter) {
  const total = tasks.length;
  const done = tasks.filter((t) => t.done).length;
  const percent = total ? Math.round((done / total) * 100) : 0;

  const filters = [
    { id: 'all',     name: '全部' },
    { id: 'active',  name: '进行中' },
    { id: 'done',    name: '已完成' },
  ];

  return el('div', { class: 'tasks-stats' }, [
    // 进度环
    el('div', { class: 'tasks-progress' }, [
      el('div', { class: 'tasks-progress__ring', style: { '--progress': `${percent}%` } }, [
        el('span', { class: 'tasks-progress__num' }, `${percent}%`),
      ]),
      el('div', { class: 'tasks-progress__text' }, [
        el('div', {}, `${done} / ${total} 完成`),
        el('div', { class: 'tasks-progress__sub' }, total ? (total - done) + ' 项待办' : '暂无任务'),
      ]),
    ]),
    // 筛选
    el('div', { class: 'tasks-filters' },
      filters.map((f) =>
        el('button', {
          class: `tasks-filter ${filter === f.id ? 'is-active' : ''}`,
          type: 'button',
          on: { click: () => onFilter(f.id) },
        }, f.name)
      )
    ),
  ]);
}

/* ============ 任务项 ============ */
function renderTask(task, onToggle, onDelete) {
  const priority = PRIORITIES.find((p) => p.id === task.priority) || PRIORITIES[1];
  return el('li', {
    class: `task-item ${task.done ? 'is-done' : ''}`,
    style: { '--priority-color': priority.color },
    dataset: { id: task.id },
  }, [
    // 完成复选框
    el('button', {
      class: `task-item__check ${task.done ? 'is-checked' : ''}`,
      type: 'button',
      attrs: { 'aria-label': task.done ? '标记为未完成' : '标记为已完成', 'aria-pressed': task.done ? 'true' : 'false' },
      on: { click: () => onToggle(task.id) },
    }, task.done ? '✓' : ''),
    el('div', { class: 'task-item__body' }, [
      el('div', { class: 'task-item__text' }, task.text),
      el('div', { class: 'task-item__meta' }, [
        el('span', { class: 'task-item__priority' }, priority.name + '优先'),
        el('span', { class: 'task-item__time' }, relativeTime(task.createdAt)),
      ]),
    ]),
    el('button', {
      class: 'task-item__delete',
      type: 'button',
      attrs: { 'aria-label': '删除任务' },
      on: { click: () => onDelete(task.id) },
    }, '×'),
  ]);
}

/* ============ 空状态 ============ */
function renderEmpty(filter) {
  const messages = {
    all: '还没有任务，添加第一条开始吧',
    active: '没有进行中的任务，干得漂亮！',
    done: '还没有完成任何任务',
  };
  return el('div', { class: 'tasks-empty' }, [
    el('div', { class: 'tasks-empty__icon' }, filter === 'done' ? '🎯' : '✨'),
    el('p', {}, messages[filter] || messages.all),
  ]);
}

/* ============ 模块导出 ============ */
export const tasksModule = {
  mount(container, app) {
    const state = { filter: 'all' };

    function getFiltered() {
      let tasks = loadTasks();
      if (state.filter === 'active') tasks = tasks.filter((t) => !t.done);
      if (state.filter === 'done') tasks = tasks.filter((t) => t.done);
      // 未完成的排前面，同级按创建时间倒序
      return tasks.sort((a, b) => {
        if (a.done !== b.done) return a.done ? 1 : -1;
        return b.createdAt - a.createdAt;
      });
    }

    function handleAdd() {
      const input = $('#task-input');
      const priorityEl = $('#task-priority');
      if (!input || !input.value.trim()) {
        input?.classList.add('anim-shake');
        setTimeout(() => input?.classList.remove('anim-shake'), 400);
        return;
      }
      const task = {
        id: uid('task'),
        text: input.value.trim(),
        priority: priorityEl?.value || 'medium',
        done: false,
        createdAt: Date.now(),
      };
      const tasks = loadTasks();
      tasks.push(task);
      saveTasks(tasks);
      input.value = '';
      input.focus();
      app.toast?.('已添加任务', 'success');
      render();
    }

    function handleToggle(id) {
      const tasks = loadTasks().map((t) =>
        t.id === id ? { ...t, done: !t.done } : t
      );
      saveTasks(tasks);
      const task = tasks.find((t) => t.id === id);
      if (task?.done) app.toast?.('任务完成！+1 经验', 'success');
      render();
    }

    function handleDelete(id) {
      const tasks = loadTasks().filter((t) => t.id !== id);
      saveTasks(tasks);
      app.toast?.('已删除', 'info');
      render();
    }

    function handleClearDone() {
      const tasks = loadTasks();
      const before = tasks.length;
      const remaining = tasks.filter((t) => !t.done);
      if (remaining.length === before) {
        app.toast?.('没有已完成的任务可清除', 'info');
        return;
      }
      saveTasks(remaining);
      app.toast?.(`已清除 ${before - remaining.length} 项已完成任务`, 'success');
      render();
    }

    function render() {
      clear(container);
      const allTasks = loadTasks();
      const filtered = getFiltered();
      const hasDone = allTasks.some((t) => t.done);

      container.append(
        el('div', { class: 'tasks-module' }, [
          renderForm(handleAdd),
          renderStats(allTasks, state.filter, (f) => { state.filter = f; render(); }),
          el('div', { class: 'tasks-list-wrap' }, [
            el('ul', { class: 'tasks-list' },
              filtered.length
                ? filtered.map((t) => renderTask(t, handleToggle, handleDelete))
                : [renderEmpty(state.filter)]
            ),
            hasDone
              ? el('button', {
                  class: 'tasks-clear-btn',
                  type: 'button',
                  on: { click: handleClearDone },
                }, '清除已完成')
              : null,
          ]),
        ])
      );
    }
    render();
  },
};
