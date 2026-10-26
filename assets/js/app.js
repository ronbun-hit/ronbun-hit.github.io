// ツール画面の動き（DOM 操作だけを担当する）
// 読み取りは parsers/、整形は formatters/、並べ替え・保存は core/ に任せる。

import { DEFAULT_SETTINGS, normalizeSettings } from './core/settings.js';
import { sortEntries } from './core/sort.js';
import { STORAGE_KEY, loadState, saveState } from './core/storage.js';
import { formatEntry } from './formatters/index.js';
import { FORMAT_LABELS, parseReferences } from './parsers/index.js';
import { copyToClipboard } from './ui/clipboard.js';
import {
  DEFAULT_FORM_TYPE,
  entryFromValues,
  formTypeIdOf,
  getFormType,
  typeLabelOf,
  validateValues,
  valuesFromEntry,
} from './ui/form-schema.js';
import { SAMPLE_TEXT } from './ui/sample.js';

const $ = (selector) => document.querySelector(selector);

const els = {
  tabs: [...document.querySelectorAll('[role="tab"]')],
  pasteInput: $('#paste-input'),
  pasteSubmit: $('#paste-submit'),
  pasteSample: $('#paste-sample'),
  pasteClear: $('#paste-clear'),
  pasteStatus: $('#paste-status'),
  form: $('#manual-form'),
  typeSelect: $('#manual-type'),
  fields: $('#manual-fields'),
  preview: $('#manual-preview'),
  submit: $('#manual-submit'),
  reset: $('#manual-reset'),
  cancel: $('#manual-cancel'),
  manualStatus: $('#manual-status'),
  sort: $('#setting-sort'),
  subtitle: $('#setting-subtitle'),
  list: $('#entry-list'),
  empty: $('#list-empty'),
  count: $('#entry-count'),
  listStatus: $('#list-status'),
  copyAll: $('#copy-all'),
  deleteAll: $('#delete-all'),
  storageWarning: $('#storage-warning'),
};

const state = {
  entries: [],
  settings: { ...DEFAULT_SETTINGS },
  formType: DEFAULT_FORM_TYPE,
  editingId: null,
  removed: null, // 直前に削除したもの：[{ entry, index }]
};

let canSave = true;

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function scrollToElement(element) {
  element.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
}

// ---- 保存 -------------------------------------------------------------------

function persist() {
  const ok = saveState({ entries: state.entries, settings: state.settings });
  if (!ok && canSave) {
    canSave = false;
    els.storageWarning.hidden = false;
  }
}

// ---- メッセージ ---------------------------------------------------------------

/**
 * 状態メッセージを出す。
 * options.tone：'info' | 'success' | 'error'、details：補足の行、link：{ href, text }、action：{ label, onClick }
 */
function setStatus(element, message, { tone = 'info', details = [], link = null, action = null } = {}) {
  element.replaceChildren();
  if (!message) {
    delete element.dataset.tone;
    return;
  }
  element.dataset.tone = tone;
  const p = document.createElement('p');
  p.textContent = message;
  if (link) {
    const a = document.createElement('a');
    a.href = link.href;
    a.textContent = link.text;
    p.append(' ', a);
  }
  if (action) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'button button-small button-ghost';
    button.textContent = action.label;
    button.addEventListener('click', action.onClick);
    p.append(' ', button);
  }
  element.append(p);
  if (details.length > 0) {
    const ul = document.createElement('ul');
    for (const line of details) {
      const li = document.createElement('li');
      li.textContent = line;
      ul.append(li);
    }
    element.append(ul);
  }
}

// ---- タブ ---------------------------------------------------------------------

function selectTab(tab, { focus = false } = {}) {
  for (const t of els.tabs) {
    const selected = t === tab;
    t.setAttribute('aria-selected', String(selected));
    t.tabIndex = selected ? 0 : -1;
    document.getElementById(t.getAttribute('aria-controls')).hidden = !selected;
  }
  if (focus) tab.focus();
}

function bindTabs() {
  els.tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectTab(tab));
    tab.addEventListener('keydown', (event) => {
      const last = els.tabs.length - 1;
      const next = {
        ArrowRight: index === last ? 0 : index + 1,
        ArrowLeft: index === 0 ? last : index - 1,
        Home: 0,
        End: last,
      }[event.key];
      if (next === undefined) return;
      event.preventDefault();
      selectTab(els.tabs[next], { focus: true });
    });
  });
}

// ---- 設定 ---------------------------------------------------------------------

const RADIO_SETTINGS = ['preset', 'digits', 'pageDash', 'period'];

function reflectSettings() {
  for (const name of RADIO_SETTINGS) {
    const value = String(state.settings[name]);
    for (const input of document.querySelectorAll(`input[name="${name}"]`)) {
      input.checked = input.value === value;
    }
  }
  els.subtitle.value = state.settings.subtitle;
  els.sort.value = state.settings.sort;
}

function updateSettings(patch) {
  state.settings = normalizeSettings({ ...state.settings, ...patch });
  persist();
  renderList();
  renderPreview();
}

function bindSettings() {
  for (const name of RADIO_SETTINGS) {
    for (const input of document.querySelectorAll(`input[name="${name}"]`)) {
      input.addEventListener('change', () => {
        if (!input.checked) return;
        updateSettings({ [name]: name === 'period' ? input.value === 'true' : input.value });
      });
    }
  }
  els.subtitle.addEventListener('change', () => updateSettings({ subtitle: els.subtitle.value }));
  els.sort.addEventListener('change', () => updateSettings({ sort: els.sort.value }));
}

// ---- 貼り付け -----------------------------------------------------------------

/** 同じ文献を二重に追加しないための目印 */
function signature(entry) {
  return JSON.stringify([
    entry.kind,
    entry.lang,
    entry.authors,
    entry.editors,
    entry.title,
    entry.containerTitle,
    entry.volume,
    entry.issue,
    entry.year,
    entry.pages,
  ]).replace(/\s+/g, '');
}

function importText() {
  const text = els.pasteInput.value;
  if (text.trim() === '') {
    setStatus(els.pasteStatus, '貼り付け欄が空です。CiNii Research の書き出し（BibTeX または RIS）を貼り付けてください。', {
      tone: 'error',
    });
    els.pasteInput.focus();
    return;
  }

  const result = parseReferences(text);
  if (result.formats.length === 0) {
    setStatus(
      els.pasteStatus,
      'BibTeX・RIS の形式として読み取れませんでした。CiNii Research の「書き出し」で BibTeX か RIS を選び、表示された内容をそのまま貼り付けてください。',
      { tone: 'error' },
    );
    return;
  }

  const known = new Set(state.entries.map(signature));
  const added = [];
  let duplicates = 0;
  for (const entry of result.entries) {
    const key = signature(entry);
    if (known.has(key)) {
      duplicates += 1;
      continue;
    }
    known.add(key);
    added.push(entry);
  }

  if (added.length > 0) {
    state.entries.push(...added);
    persist();
    renderList();
    els.pasteInput.value = '';
  }

  const details = [];
  if (added.length > 0 && duplicates > 0) details.push(`リストにすでにある${duplicates}件は追加しませんでした。`);
  for (const error of result.errors) {
    const where = error.line ? `${error.line}行目付近` : '';
    details.push(`${FORMAT_LABELS[error.format]}${where ? `（${where}）` : ''}：${error.message}`);
  }

  const formats = result.formats.map((format) => FORMAT_LABELS[format]).join('・');
  if (added.length > 0) {
    setStatus(els.pasteStatus, `${added.length}件を読み取り、リストに追加しました（${formats}）。`, {
      tone: 'success',
      details,
      link: { href: '#list-heading', text: 'リストを見る' },
    });
  } else if (duplicates > 0) {
    setStatus(els.pasteStatus, 'リストにすでにある文献だけだったので、追加しませんでした。', { tone: 'info', details });
  } else {
    setStatus(els.pasteStatus, '文献を読み取れませんでした。', { tone: 'error', details });
  }
}

function bindPaste() {
  els.pasteSubmit.addEventListener('click', importText);
  els.pasteSample.addEventListener('click', () => {
    els.pasteInput.value = SAMPLE_TEXT;
    setStatus(els.pasteStatus, 'サンプル（架空の書誌）を入れました。「読み取ってリストに追加」を押してください。');
    els.pasteInput.focus();
  });
  els.pasteClear.addEventListener('click', () => {
    els.pasteInput.value = '';
    setStatus(els.pasteStatus, '');
    els.pasteInput.focus();
  });
}

// ---- 手入力フォーム -------------------------------------------------------------

function buildField(field, value, type) {
  const id = `field-${field.key}`;
  const wrapper = document.createElement('div');
  wrapper.className = `field field-${field.width ?? 'full'}`;

  const label = document.createElement('label');
  label.className = 'field-label';
  label.htmlFor = id;
  label.textContent = field.label;
  if (field.required) {
    const mark = document.createElement('span');
    mark.className = 'required';
    mark.textContent = '必須';
    label.append(' ', mark);
  }

  const input = document.createElement(field.people ? 'textarea' : 'input');
  input.id = id;
  input.name = field.key;
  if (field.people) input.rows = 2;
  else input.type = 'text';
  input.value = value;
  input.autocomplete = 'off';
  if (field.placeholder) input.placeholder = `例：${field.placeholder}`;
  if (field.inputmode) input.inputMode = field.inputmode;
  if (field.required) input.required = true;
  if (field.people || field.key === 'yomi') input.spellcheck = false;
  if (type.lang === 'western') input.lang = 'en';

  wrapper.append(label, input);
  if (field.hint) {
    const hint = document.createElement('p');
    hint.className = 'hint';
    hint.id = `${id}-hint`;
    hint.textContent = field.hint;
    input.setAttribute('aria-describedby', hint.id);
    wrapper.append(hint);
  }
  return wrapper;
}

function renderFields(typeId, values = {}) {
  const type = getFormType(typeId);
  state.formType = type.id;
  els.typeSelect.value = type.id;
  els.fields.replaceChildren(...type.fields.map((field) => buildField(field, values[field.key] ?? '', type)));
  renderPreview();
}

function readValues() {
  const values = {};
  for (const field of getFormType(state.formType).fields) {
    const input = els.form.elements.namedItem(field.key);
    values[field.key] = input ? input.value : '';
  }
  return values;
}

function renderPreview() {
  const values = readValues();
  const hasInput = Object.values(values).some((value) => value.trim() !== '');
  els.preview.classList.toggle('is-placeholder', !hasInput);
  if (!hasInput) {
    els.preview.textContent = '入力すると、ここに表記の見本が出ます。';
    els.preview.lang = 'ja';
    return;
  }
  const entry = entryFromValues(state.formType, values);
  const { html } = formatEntry(entry, state.settings);
  els.preview.innerHTML = html;
  els.preview.lang = entry.lang === 'western' ? 'en' : 'ja';
}

function focusFirstField() {
  const first = els.fields.querySelector('input, textarea');
  if (first) first.focus({ preventScroll: true });
}

function clearForm() {
  renderFields(state.formType, {});
}

function finishEditing() {
  state.editingId = null;
  els.submit.textContent = 'リストに追加';
  els.cancel.hidden = true;
  els.reset.hidden = false;
}

function startEditing(id) {
  const entry = state.entries.find((item) => item.id === id);
  if (!entry) return;
  state.editingId = id;
  selectTab(document.getElementById('tab-manual'));
  renderFields(formTypeIdOf(entry), valuesFromEntry(entry));
  els.submit.textContent = '変更を保存';
  els.cancel.hidden = false;
  els.reset.hidden = true;
  setStatus(els.manualStatus, '選んだ文献を編集しています。直し終えたら「変更を保存」を押してください。');
  renderList();
  scrollToElement(els.form);
  focusFirstField();
}

function submitForm(event) {
  event.preventDefault();
  const values = readValues();
  const problems = validateValues(state.formType, values);
  if (problems.length > 0) {
    setStatus(els.manualStatus, problems.join(' '), { tone: 'error' });
    const missing = getFormType(state.formType).fields.find(
      (field) => field.required && values[field.key].trim() === '',
    );
    const input = missing && els.form.elements.namedItem(missing.key);
    if (input) {
      input.setAttribute('aria-invalid', 'true');
      input.focus();
    }
    return;
  }

  const index = state.editingId ? state.entries.findIndex((item) => item.id === state.editingId) : -1;
  let message;
  if (index >= 0) {
    state.entries[index] = entryFromValues(state.formType, values, state.entries[index]);
    message = 'リストの文献を更新しました。';
  } else {
    state.entries.push(entryFromValues(state.formType, values));
    message = 'リストに追加しました。続けて入力できます。';
  }
  finishEditing();
  persist();
  renderList();
  clearForm();
  setStatus(els.manualStatus, message, { tone: 'success', link: { href: '#list-heading', text: 'リストを見る' } });
  focusFirstField();
}

function bindForm() {
  els.typeSelect.addEventListener('change', () => {
    const values = readValues();
    renderFields(els.typeSelect.value, values);
  });
  els.form.addEventListener('input', (event) => {
    if (event.target === els.typeSelect) return;
    event.target.removeAttribute('aria-invalid');
    renderPreview();
  });
  els.form.addEventListener('submit', submitForm);
  els.reset.addEventListener('click', () => {
    clearForm();
    setStatus(els.manualStatus, '');
    focusFirstField();
  });
  els.cancel.addEventListener('click', () => {
    finishEditing();
    clearForm();
    renderList();
    setStatus(els.manualStatus, '編集をやめました（リストは変わっていません）。');
  });
}

// ---- リスト -------------------------------------------------------------------

function sortedEntries() {
  return sortEntries(state.entries, state.settings.sort);
}

function buildEntryItem(entry) {
  const { html } = formatEntry(entry, state.settings);
  const li = document.createElement('li');
  li.className = 'entry';
  li.dataset.id = entry.id;
  if (entry.id === state.editingId) li.classList.add('is-editing');

  const text = document.createElement('p');
  text.className = 'entry-text';
  text.id = `entry-${entry.id}`;
  text.lang = entry.lang === 'western' ? 'en' : 'ja';
  if (html) text.innerHTML = html;
  else text.textContent = '（表示できる項目がありません。「編集」から入力してください）';

  const meta = document.createElement('p');
  meta.className = 'entry-meta';
  meta.textContent = typeLabelOf(entry) + (entry.id === state.editingId ? '（編集中）' : '');

  const actions = document.createElement('div');
  actions.className = 'entry-actions';
  for (const [action, label, variant] of [
    ['copy', 'コピー', 'button-soft'],
    ['edit', '編集', 'button-ghost'],
    ['delete', '削除', 'button-ghost'],
  ]) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `button button-small ${variant}`;
    button.dataset.action = action;
    button.textContent = label;
    button.setAttribute('aria-describedby', text.id);
    actions.append(button);
  }

  li.append(text, meta, actions);
  return li;
}

function renderList() {
  const entries = sortedEntries();
  els.list.replaceChildren(...entries.map(buildEntryItem));
  const count = state.entries.length;
  els.count.textContent = count > 0 ? `（${count}件）` : '';
  els.empty.hidden = count > 0;
  els.copyAll.disabled = count === 0;
  els.deleteAll.disabled = count === 0;
}

function flashButton(button, label) {
  const original = button.dataset.label ?? button.textContent;
  button.dataset.label = original;
  button.textContent = label;
  clearTimeout(Number(button.dataset.timer));
  button.dataset.timer = String(
    setTimeout(() => {
      button.textContent = original;
    }, 1800),
  );
}

async function copyEntry(id, button) {
  const entry = state.entries.find((item) => item.id === id);
  if (!entry) return;
  const { text, html, runs } = formatEntry(entry, state.settings);
  const hasItalic = runs.some((run) => run.italic);
  const ok = await copyToClipboard({ text, html: hasItalic ? html : null });
  if (ok) {
    flashButton(button, 'コピーしました');
    setStatus(els.listStatus, '1件をコピーしました。', { tone: 'success' });
  } else {
    setStatus(els.listStatus, 'コピーできませんでした。文献の文字を選択（長押し）してコピーしてください。', { tone: 'error' });
  }
}

async function copyAll() {
  const formatted = sortedEntries()
    .map((entry) => formatEntry(entry, state.settings))
    .filter((item) => item.text !== '');
  if (formatted.length === 0) return;
  const text = formatted.map((item) => item.text).join('\n');
  const hasItalic = formatted.some((item) => item.runs.some((run) => run.italic));
  const html = formatted.map((item) => `<p style="margin:0">${item.html}</p>`).join('');
  const ok = await copyToClipboard({ text, html: hasItalic ? html : null });
  if (ok) {
    flashButton(els.copyAll, 'コピーしました');
    setStatus(els.listStatus, `${formatted.length}件をまとめてコピーしました。`, { tone: 'success' });
  } else {
    setStatus(els.listStatus, 'コピーできませんでした。リストの文字を選択してコピーしてください。', { tone: 'error' });
  }
}

function undoRemove() {
  if (!state.removed) return;
  const items = [...state.removed].sort((a, b) => a.index - b.index);
  for (const { entry, index } of items) {
    state.entries.splice(Math.min(index, state.entries.length), 0, entry);
  }
  state.removed = null;
  persist();
  renderList();
  setStatus(els.listStatus, '元に戻しました。', { tone: 'success' });
}

function removeEntry(id) {
  const index = state.entries.findIndex((item) => item.id === id);
  if (index === -1) return;
  const position = sortedEntries().findIndex((item) => item.id === id);
  const [entry] = state.entries.splice(index, 1);
  state.removed = [{ entry, index }];
  if (state.editingId === id) {
    finishEditing();
    clearForm();
    setStatus(els.manualStatus, '');
  }
  persist();
  renderList();
  setStatus(els.listStatus, '1件を削除しました。', { action: { label: '元に戻す', onClick: undoRemove } });

  // 削除したボタンの代わりに、同じ位置（なければ直前）の文献へフォーカスを移す
  const items = els.list.querySelectorAll('.entry');
  const target = items[Math.min(position, items.length - 1)];
  if (target) target.querySelector('[data-action="delete"]').focus();
  else els.listStatus.querySelector('button')?.focus();
}

function removeAll() {
  const count = state.entries.length;
  if (count === 0) return;
  if (!window.confirm(`リストの${count}件をすべて削除しますか？`)) return;
  state.removed = state.entries.map((entry, index) => ({ entry, index }));
  state.entries = [];
  if (state.editingId) {
    finishEditing();
    clearForm();
    setStatus(els.manualStatus, '');
  }
  persist();
  renderList();
  setStatus(els.listStatus, `${count}件をすべて削除しました。`, { action: { label: '元に戻す', onClick: undoRemove } });
  els.listStatus.querySelector('button')?.focus();
}

function bindList() {
  els.list.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const id = button.closest('.entry').dataset.id;
    if (button.dataset.action === 'copy') copyEntry(id, button);
    else if (button.dataset.action === 'edit') startEditing(id);
    else if (button.dataset.action === 'delete') removeEntry(id);
  });
  els.copyAll.addEventListener('click', copyAll);
  els.deleteAll.addEventListener('click', removeAll);

  // 別のタブで内容が変わったら、表示をそろえる
  window.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEY) return;
    const saved = loadState();
    if (!saved) return;
    state.entries = saved.entries;
    state.settings = saved.settings;
    if (state.editingId && !state.entries.some((item) => item.id === state.editingId)) finishEditing();
    reflectSettings();
    renderList();
    renderPreview();
  });
}

// ---- 起動 ---------------------------------------------------------------------

function init() {
  const saved = loadState();
  if (saved) {
    state.entries = saved.entries;
    state.settings = saved.settings;
  }
  persist(); // 保存できる環境かどうかを、ここで確かめる

  bindTabs();
  bindSettings();
  bindPaste();
  bindForm();
  bindList();
  reflectSettings();
  renderFields(DEFAULT_FORM_TYPE);
  renderList();
  document.documentElement.classList.add('is-ready');
}

init();
