// 文献リストと設定を、ブラウザの localStorage に保存する
//
// 保存先は利用者の端末の中だけで、サーバーには送らない。
// プライベートブラウズや容量超過、Cookie の拒否などで localStorage が使えない環境でも
// ツール自体は動くように、読み書きはすべて try/catch で囲み、失敗しても例外を外に出さない。

import { createEntry } from './model.js';
import { normalizeSettings } from './settings.js';

export const STORAGE_KEY = 'rekishi-bunken-maker/v1';

function defaultStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

/** 保存データを読む。ない・壊れている・読めないときは null */
export function loadState(storage = defaultStorage()) {
  try {
    if (!storage) return null;
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object') return null;
    const entries = Array.isArray(data.entries)
      ? data.entries.filter((item) => item && typeof item === 'object').map((item) => createEntry(item))
      : [];
    return { entries, settings: normalizeSettings(data.settings) };
  } catch {
    return null;
  }
}

/** 保存する。成功したら true、できなかったら false */
export function saveState(state, storage = defaultStorage()) {
  try {
    if (!storage) return false;
    const data = { version: 1, entries: state.entries, settings: state.settings };
    storage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

/** 保存データを消す。成功したら true */
export function clearState(storage = defaultStorage()) {
  try {
    if (!storage) return false;
    storage.removeItem(STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}
