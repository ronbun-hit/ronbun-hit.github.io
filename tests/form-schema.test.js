import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  FORM_TYPES,
  entryFromValues,
  formTypeIdOf,
  splitPeople,
  typeLabelOf,
  validateValues,
  valuesFromEntry,
} from '../assets/js/ui/form-schema.js';
import { entry } from './helpers.js';

describe('フォームの定義', () => {
  test('依頼された 6 種類（＋欧文編著所収論文）がある', () => {
    const labels = FORM_TYPES.map((type) => type.label);
    for (const label of ['論文', '単行本', '編著所収論文', '翻訳書', '欧文論文', '欧文単行本']) {
      assert.ok(labels.includes(label), label);
    }
    assert.ok(labels.includes('欧文編著所収論文'));
  });

  test('ID は重複せず、どの種類にも必須のタイトル欄がある', () => {
    const ids = FORM_TYPES.map((type) => type.id);
    assert.equal(new Set(ids).size, ids.length);
    for (const type of FORM_TYPES) {
      const title = type.fields.find((field) => field.key === 'title');
      assert.ok(title?.required, type.id);
      const keys = type.fields.map((field) => field.key);
      assert.equal(new Set(keys).size, keys.length, `${type.id} の項目が重複`);
    }
  });

  test('種類ごとに必要な項目だけ：翻訳書だけに原著情報、欧文だけに出版地', () => {
    const keysOf = (id) => FORM_TYPES.find((type) => type.id === id).fields.map((field) => field.key);
    assert.ok(keysOf('ja-translation').includes('originalInfo'));
    assert.ok(!keysOf('ja-book').includes('originalInfo'));
    assert.ok(keysOf('en-book').includes('place'));
    assert.ok(!keysOf('ja-book').includes('place'));
    assert.ok(!keysOf('ja-book').includes('pages'));
    assert.ok(!keysOf('en-article').includes('yomi'));
  });
});

describe('値の変換', () => {
  test('名前欄は改行・読点・セミコロンで分ける', () => {
    assert.deepEqual(splitPeople('山田, 太郎\n鈴木一郎、佐藤花子; Smith, John\r\n\n'), ['山田, 太郎', '鈴木一郎', '佐藤花子', 'Smith, John']);
    assert.deepEqual(splitPeople(''), []);
  });

  test('フォームの値から文献データを作る', () => {
    const e = entryFromValues('ja-chapter', {
      authors: '山田, 太郎',
      title: ' 論文名 ',
      editors: '鈴木, 一郎\n佐藤, 花子',
      containerTitle: '書名',
      publisher: '吉川弘文館',
      year: '2011',
      pages: '1-20',
    });
    assert.equal(e.kind, 'chapter');
    assert.equal(e.lang, 'cjk');
    assert.equal(e.title, '論文名');
    assert.deepEqual(e.editors, ['鈴木, 一郎', '佐藤, 花子']);
    assert.equal(e.source, 'manual');
    assert.ok(e.id);
  });

  test('文献データ → フォーム → 文献データで内容が変わらない', () => {
    const original = entry({
      kind: 'book',
      lang: 'western',
      authors: ['Bloch, Marc'],
      translators: ['Putnam, Peter'],
      title: 'The Historian’s Craft',
      place: 'New York',
      publisher: 'Knopf',
      year: '1953',
      source: 'bibtex',
      doi: '10.1/x',
    });
    const roundTrip = entryFromValues(formTypeIdOf(original), valuesFromEntry(original), original);
    assert.deepEqual(roundTrip, original);
  });

  test('フォームにない項目は空にし、ID と DOI は引き継ぐ', () => {
    const base = entry({ id: 'keep-me', kind: 'chapter', lang: 'cjk', title: '旧', containerTitle: '収録図書', pages: '1-2', doi: '10.1/y' });
    const e = entryFromValues('ja-book', { title: '新しい書名' }, base);
    assert.equal(e.id, 'keep-me');
    assert.equal(e.kind, 'book');
    assert.equal(e.containerTitle, '');
    assert.equal(e.pages, '');
    assert.equal(e.doi, '10.1/y');
  });

  test('文献データに対応するフォームの種類とラベル', () => {
    assert.equal(formTypeIdOf(entry({ kind: 'article', lang: 'cjk' })), 'ja-article');
    assert.equal(formTypeIdOf(entry({ kind: 'translation', lang: 'cjk' })), 'ja-translation');
    assert.equal(formTypeIdOf(entry({ kind: 'chapter', lang: 'western' })), 'en-chapter');
    assert.equal(formTypeIdOf(entry({ kind: 'translation', lang: 'western' })), 'en-book');
    assert.equal(typeLabelOf(entry({ kind: 'article', lang: 'cjk' })), '和文・論文');
    assert.equal(typeLabelOf(entry({ kind: 'book', lang: 'western' })), '欧文・単行本');
  });

  test('タイトルが空なら入力を促す', () => {
    assert.deepEqual(validateValues('ja-article', { title: '論文名' }), []);
    assert.equal(validateValues('ja-article', { title: '  ' }).length, 1);
    assert.match(validateValues('en-book', {})[0], /書名/);
  });
});
