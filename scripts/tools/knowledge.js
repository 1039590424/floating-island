// knowledge.js
// 知识库模块 — 工具层
// 个人笔记与书签收藏，数据存 localStorage，不上传
// 支持：添加、搜索、分类筛选、删除

import { el, clear, $ } from '../utils/dom.js';
import { uid, relativeTime } from '../utils/helpers.js';
import * as storage from '../utils/storage.js';

const NOTES_KEY = 'kb:notes';
const CATEGORIES = ['笔记', '书签', '灵感', '代码片段', '待查'];

/** 读取所有笔记 */
function loadNotes() {
  return storage.get(NOTES_KEY, []);
}
function saveNotes(notes) {
  storage.set(NOTES_KEY, notes);
}

/* ============ 添加表单 ============ */
function renderForm(onSubmit) {
  return el('form', {
    class: 'kb-form',
    on: { submit: (e) => { e.preventDefault(); onSubmit(e); } },
  }, [
    el('div', { class: 'kb-form__row' }, [
      el('input', {
        class: 'kb-form__input',
        type: 'text',
        id: 'kb-title',
        attrs: { placeholder: '标题（必填）', 'aria-label': '标题' },
      }),
      el('select', {
        class: 'kb-form__select',
        id: 'kb-category',
        attrs: { 'aria-label': '分类' },
      }, CATEGORIES.map((c) => el('option', { value: c }, c))),
    ]),
    el('textarea', {
      class: 'kb-form__input kb-form__input--content',
      id: 'kb-content',
      attrs: { placeholder: '内容、链接或代码片段…（选填）', 'aria-label': '内容', rows: '2' },
    }),
    el('div', { class: 'kb-form__actions' }, [
      el('button', { class: 'kb-btn kb-btn--primary', type: 'submit' }, [el('span', {}, '+'), '添加']),
    ]),
  ]);
}

/* ============ 搜索与筛选 ============ */
function renderToolbar(state, onChange) {
  return el('div', { class: 'kb-toolbar' }, [
    el('input', {
      class: 'kb-search',
      type: 'search',
      attrs: { placeholder: '🔍 搜索标题或内容…', 'aria-label': '搜索笔记' },
      on: { input: (e) => { state.query = e.target.value; onChange(); } },
    }),
    el('div', { class: 'kb-filters' },
      ['全部', ...CATEGORIES].map((cat) =>
        el('button', {
          class: `kb-filter ${state.category === cat ? 'is-active' : ''}`,
          type: 'button',
          on: { click: () => { state.category = cat; onChange(); } },
        }, cat)
      )
    ),
  ]);
}

/* ============ 笔记卡片 ============ */
function renderNote(note, onDelete) {
  const isLink = /^https?:\/\//.test(note.content || '');
  return el('article', { class: 'kb-note', dataset: { id: note.id } }, [
    el('div', { class: 'kb-note__head' }, [
      el('span', { class: 'kb-note__category' }, note.category || '笔记'),
      el('span', { class: 'kb-note__time' }, relativeTime(note.createdAt)),
      el('button', {
        class: 'kb-note__delete',
        type: 'button',
        attrs: { 'aria-label': '删除笔记' },
        on: { click: () => onDelete(note.id) },
      }, '×'),
    ]),
    el('h4', { class: 'kb-note__title' }, note.title),
    note.content
      ? (isLink
          ? el('a', { class: 'kb-note__link', href: note.content, attrs: { target: '_blank', rel: 'noopener noreferrer' } }, note.content)
          : el('p', { class: 'kb-note__content' }, note.content))
      : null,
  ]);
}

/* ============ 空状态 ============ */
function renderEmpty() {
  return el('div', { class: 'kb-empty' }, [
    el('div', { class: 'kb-empty__icon' }, '📭'),
    el('p', {}, '还没有笔记，用上方表单添加第一条吧'),
  ]);
}

/* ============ 模块导出 ============ */
export const knowledgeModule = {
  mount(container, app) {
    const state = { query: '', category: '全部' };

    function getFiltered() {
      let notes = loadNotes();
      if (state.category !== '全部') {
        notes = notes.filter((n) => n.category === state.category);
      }
      if (state.query) {
        const q = state.query.toLowerCase();
        notes = notes.filter((n) =>
          (n.title || '').toLowerCase().includes(q) ||
          (n.content || '').toLowerCase().includes(q)
        );
      }
      return notes.sort((a, b) => b.createdAt - a.createdAt);
    }

    function handleAdd() {
      const titleEl = $('#kb-title');
      const catEl = $('#kb-category');
      const contentEl = $('#kb-content');
      if (!titleEl || !titleEl.value.trim()) {
        titleEl?.classList.add('anim-shake');
        setTimeout(() => titleEl?.classList.remove('anim-shake'), 400);
        app.toast?.('请填写标题', 'warning');
        return;
      }
      const note = {
        id: uid('note'),
        title: titleEl.value.trim(),
        category: catEl?.value || '笔记',
        content: contentEl?.value.trim() || '',
        createdAt: Date.now(),
      };
      const notes = loadNotes();
      notes.push(note);
      saveNotes(notes);

      titleEl.value = '';
      if (contentEl) contentEl.value = '';
      app.toast?.('已添加', 'success');
      render();
    }

    function handleDelete(id) {
      const notes = loadNotes().filter((n) => n.id !== id);
      saveNotes(notes);
      app.toast?.('已删除', 'info');
      render();
    }

    function render() {
      clear(container);
      const notes = getFiltered();
      container.append(
        el('div', { class: 'knowledge-module' }, [
          renderForm(handleAdd),
          renderToolbar(state, render),
          el('div', { class: 'kb-list' },
            notes.length
              ? notes.map((n) => renderNote(n, handleDelete))
              : [renderEmpty()]
          ),
          notes.length
            ? el('p', { class: 'kb-count' }, `共 ${notes.length} 条 · 数据存于本地浏览器`)
            : null,
        ])
      );
    }
    render();
  },
};
