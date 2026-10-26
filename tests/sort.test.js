import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { sortEntries } from '../assets/js/core/sort.js';
import { entry } from './helpers.js';

const titles = (list) => list.map((e) => e.title);

const items = [
  entry({ id: '1', lang: 'western', kind: 'book', authors: ['Smith, John'], title: 'S-book', year: '2010' }),
  entry({ id: '2', lang: 'cjk', kind: 'book', authors: ['鈴木, 一郎'], yomi: 'すずき いちろう', title: '鈴木の本' }),
  entry({ id: '3', lang: 'western', kind: 'book', authors: ['Anderson, Benedict'], title: 'A-book' }),
  entry({ id: '4', lang: 'cjk', kind: 'book', authors: ['山田, 太郎'], yomi: 'やまだ たろう', title: '山田の本' }),
  entry({ id: '5', lang: 'cjk', kind: 'book', authors: ['阿部, 三郎'], yomi: 'あべ さぶろう', title: '阿部の本' }),
];

describe('並べ替え', () => {
  test('入力順はそのまま（元の配列は変えない）', () => {
    const result = sortEntries(items, 'input');
    assert.deepEqual(titles(result), titles(items));
    assert.notEqual(result, items);
  });

  test('和文 → 欧文、それぞれ著者名順（和文は読みで五十音順）', () => {
    assert.deepEqual(titles(sortEntries(items, 'author')), ['阿部の本', '鈴木の本', '山田の本', 'A-book', 'S-book']);
  });

  test('元の配列は並べ替えない', () => {
    const before = titles(items);
    sortEntries(items, 'author');
    assert.deepEqual(titles(items), before);
  });

  test('読みがなければ漢字の並び（JIS 順）で、かなは漢字より前', () => {
    const list = [
      entry({ lang: 'cjk', authors: ['伊藤, 五郎'], title: '伊藤' }),
      entry({ lang: 'cjk', authors: ['阿部, 三郎'], title: '阿部' }),
      entry({ lang: 'cjk', authors: ['ブロック, マルク'], title: 'ブロック' }),
    ];
    assert.deepEqual(titles(sortEntries(list, 'author')), ['ブロック', '阿部', '伊藤']);
  });

  test('欧文は姓で並べ、大文字小文字・アクセントを区別しない', () => {
    const list = [
      entry({ lang: 'western', authors: ['Zola, Émile'], title: 'Z' }),
      entry({ lang: 'western', authors: ['émile, Étienne'], title: 'E' }),
      entry({ lang: 'western', authors: ['Bloch, Marc'], title: 'B' }),
    ];
    assert.deepEqual(titles(sortEntries(list, 'author')), ['B', 'E', 'Z']);
  });

  test('同じ著者は刊行年順', () => {
    const list = [
      entry({ lang: 'cjk', authors: ['山田, 太郎'], title: '新しい本', year: '2020' }),
      entry({ lang: 'cjk', authors: ['山田, 太郎'], title: '古い本', year: '1999' }),
    ];
    assert.deepEqual(titles(sortEntries(list, 'author')), ['古い本', '新しい本']);
  });

  test('著者がなければ編者、それもなければ書名（欧文は冠詞を除く）で並べる', () => {
    const list = [
      entry({ lang: 'western', title: 'The Zebra' }),
      entry({ lang: 'western', editors: ['Miller, Ann'], title: 'Edited' }),
      entry({ lang: 'western', title: 'An Apple' }),
    ];
    assert.deepEqual(titles(sortEntries(list, 'author')), ['An Apple', 'Edited', 'The Zebra']);
  });
});
