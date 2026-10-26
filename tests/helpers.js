import { readFileSync } from 'node:fs';

import { createEntry } from '../assets/js/core/model.js';

/** tests/fixtures/ のファイルを文字列で読む */
export function fixture(name) {
  return readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');
}

/** テスト用の文献データ（ID を固定して比較しやすくする） */
export function entry(fields) {
  return createEntry({ id: 'test', ...fields });
}

/** Map で localStorage の代わりをするもの */
export function memoryStorage() {
  const map = new Map();
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: (key) => map.delete(key),
    map,
  };
}
