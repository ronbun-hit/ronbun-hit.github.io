import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { DEFAULT_SETTINGS, normalizeSettings } from '../assets/js/core/settings.js';
import { STORAGE_KEY, clearState, loadState, saveState } from '../assets/js/core/storage.js';
import { entry, memoryStorage } from './helpers.js';

const throwing = {
  getItem() {
    throw new Error('SecurityError');
  },
  setItem() {
    throw new Error('QuotaExceededError');
  },
  removeItem() {
    throw new Error('SecurityError');
  },
};

describe('localStorage への保存', () => {
  test('保存して読み戻せる', () => {
    const storage = memoryStorage();
    const state = {
      entries: [entry({ id: 'a', kind: 'book', lang: 'cjk', authors: ['山田, 太郎'], title: '書名' })],
      settings: { ...DEFAULT_SETTINGS, preset: 'B', period: false },
    };
    assert.equal(saveState(state, storage), true);
    const loaded = loadState(storage);
    assert.deepEqual(loaded.entries, state.entries);
    assert.deepEqual(loaded.settings, state.settings);
  });

  test('保存データがなければ null', () => {
    assert.equal(loadState(memoryStorage()), null);
  });

  test('localStorage が使えない環境でも例外を出さない', () => {
    assert.equal(loadState(throwing), null);
    assert.equal(saveState({ entries: [], settings: DEFAULT_SETTINGS }, throwing), false);
    assert.equal(clearState(throwing), false);
    assert.equal(loadState(null), null);
    assert.equal(saveState({ entries: [], settings: DEFAULT_SETTINGS }, null), false);
  });

  test('壊れた JSON は null', () => {
    const storage = memoryStorage();
    storage.setItem(STORAGE_KEY, '{壊れたデータ');
    assert.equal(loadState(storage), null);
  });

  test('形のおかしいデータは直して読む', () => {
    const storage = memoryStorage();
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        entries: [null, 'x', { id: 'b', kind: 'unknown', lang: 'xx', authors: 'not-array', title: 42 }],
        settings: { preset: 'Q', digits: 'full' },
      }),
    );
    const loaded = loadState(storage);
    assert.equal(loaded.entries.length, 1);
    assert.equal(loaded.entries[0].kind, 'article');
    assert.equal(loaded.entries[0].lang, 'cjk');
    assert.deepEqual(loaded.entries[0].authors, []);
    assert.equal(loaded.entries[0].title, '42');
    assert.deepEqual(loaded.settings, { ...DEFAULT_SETTINGS, digits: 'full' });
  });

  test('消去できる', () => {
    const storage = memoryStorage();
    saveState({ entries: [], settings: DEFAULT_SETTINGS }, storage);
    assert.equal(clearState(storage), true);
    assert.equal(loadState(storage), null);
  });
});

describe('設定の正規化', () => {
  test('未知の値は既定値', () => {
    assert.deepEqual(normalizeSettings(undefined), { ...DEFAULT_SETTINGS });
    assert.deepEqual(normalizeSettings({ sort: 'author', pageDash: '～', subtitle: 'colon' }), {
      ...DEFAULT_SETTINGS,
      sort: 'author',
      pageDash: '～',
      subtitle: 'colon',
    });
  });
});
