import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { detectLang } from '../assets/js/core/model.js';
import {
  cleanPages,
  cleanText,
  cleanTitle,
  cleanYear,
  normalizeImported,
  splitPublisher,
  splitRole,
} from '../assets/js/parsers/normalize.js';

describe('役割表示の扱い（splitRole）', () => {
  test('空白の後の「編」「訳」「著」', () => {
    assert.deepEqual(splitRole('鈴木一郎 編'), { name: '鈴木一郎', role: 'editor' });
    assert.deepEqual(splitRole('高橋, 三郎 訳'), { name: '高橋, 三郎', role: 'translator' });
    assert.deepEqual(splitRole('山田太郎 著'), { name: '山田太郎', role: 'author' });
  });
  test('名前に直接付いた役割', () => {
    assert.deepEqual(splitRole('鈴木一郎編'), { name: '鈴木一郎', role: 'editor' });
    assert.deepEqual(splitRole('東京大学史料編纂所編'), { name: '東京大学史料編纂所', role: 'editor' });
  });
  test('括弧付きの役割', () => {
    assert.deepEqual(splitRole('山田, 太郎 [著]'), { name: '山田, 太郎', role: 'author' });
    assert.deepEqual(splitRole('鈴木一郎（編）'), { name: '鈴木一郎', role: 'editor' });
  });
  test('「編著」「監修」「監訳」は表記に必要なので名前に残す', () => {
    assert.deepEqual(splitRole('鈴木一郎 編著'), { name: '鈴木一郎編著', role: 'keep' });
    assert.deepEqual(splitRole('鈴木一郎 監修'), { name: '鈴木一郎監修', role: 'keep' });
    assert.deepEqual(splitRole('高橋三郎 監訳'), { name: '高橋三郎監訳', role: 'translator' });
  });
  test('「作」「文」で終わる人名を役割と間違えない', () => {
    assert.deepEqual(splitRole('山田耕作'), { name: '山田耕作', role: 'author' });
    assert.deepEqual(splitRole('伊藤博文'), { name: '伊藤博文', role: 'author' });
  });
  test('欧文の名前はそのまま', () => {
    assert.deepEqual(splitRole('Carr, Edward Hallett'), { name: 'Carr, Edward Hallett', role: 'author' });
  });
});

describe('名前の整理（normalizeImported 経由）', () => {
  const base = { kind: 'book', title: '書名', source: 'test' };
  test('生没年を外す', () => {
    const e = normalizeImported({ ...base, title: 'Title', authors: ['Bloch, Marc, 1886-1944', '山田, 太郎 (1950-)'] });
    assert.deepEqual(e.authors, ['Bloch, Marc', '山田, 太郎']);
  });
  test('「;」で区切られた責任表示を人ごとに分けて振り分ける', () => {
    const e = normalizeImported({ ...base, authors: ['E.H.カー 著 ; 清水幾太郎 訳'] });
    assert.deepEqual(e.authors, ['E.H.カー']);
    assert.deepEqual(e.translators, ['清水幾太郎']);
    assert.equal(e.kind, 'translation');
  });
  test('役割「編」の著者は編者に回す', () => {
    const e = normalizeImported({ ...base, authors: ['鈴木, 一郎 編'] });
    assert.deepEqual(e.authors, []);
    assert.deepEqual(e.editors, ['鈴木, 一郎']);
  });
  test('同じ人の重複を除く', () => {
    const e = normalizeImported({ ...base, authors: ['山田, 太郎', '山田 , 太郎'] });
    assert.deepEqual(e.authors, ['山田, 太郎']);
  });
  test('欧文の訳書は翻訳書（和文の種類）にしない', () => {
    const e = normalizeImported({ ...base, title: 'The Historian’s Craft', authors: ['Bloch, Marc'], translators: ['Putnam, Peter'] });
    assert.equal(e.kind, 'book');
    assert.equal(e.lang, 'western');
  });
  test('タイトルも著者もなければ null', () => {
    assert.equal(normalizeImported({ kind: 'article', year: '2000' }), null);
  });
  test('論文・所収論文以外では収録誌名を持たない', () => {
    const e = normalizeImported({ ...base, containerTitle: 'シリーズ名' });
    assert.equal(e.containerTitle, '');
  });
});

describe('タイトルの整理（cleanTitle）', () => {
  test('並列タイトルを除く', () => {
    assert.equal(cleanTitle('中世荘園制の展開 = The development of the shoen system'), '中世荘園制の展開');
  });
  test('漢字を含む並列タイトルは残す', () => {
    assert.equal(cleanTitle('日本語題 = 中文題'), '日本語題 = 中文題');
  });
  test('責任表示を除く', () => {
    assert.equal(cleanTitle('中世荘園制の展開 / 佐藤花子著'), '中世荘園制の展開');
  });
  test('欧文のタイトルには手を加えない', () => {
    assert.equal(cleanTitle('War = Peace / Orwell ed.'), 'War = Peace / Orwell ed.');
  });
  test('HTML タグと文字参照を除く', () => {
    assert.equal(cleanText('<i>Homo sapiens</i> &amp; 人類史'), 'Homo sapiens & 人類史');
    assert.equal(cleanText('A&#x2013;B &#8212; C'), 'A–B — C');
  });
});

describe('出版事項・頁・年', () => {
  test('「東京 : 吉川弘文館」を出版地と出版社に分ける', () => {
    assert.deepEqual(splitPublisher('東京 : 吉川弘文館', ''), { publisher: '吉川弘文館', place: '東京' });
    assert.deepEqual(splitPublisher('London: Macmillan', ''), { publisher: 'Macmillan', place: 'London' });
  });
  test('出版地が別にあれば分けない', () => {
    assert.deepEqual(splitPublisher('吉川弘文館', '[東京]'), { publisher: '吉川弘文館', place: '東京' });
  });
  test('頁の表記ゆれ', () => {
    assert.equal(cleanPages('p. 1-20'), '1-20');
    assert.equal(cleanPages('pp.1--20'), '1-20');
    assert.equal(cleanPages('１～２０頁'), '1-20');
    assert.equal(cleanPages('12'), '12');
  });
  test('年は 4 桁を取り出す', () => {
    assert.equal(cleanYear('2011/03/25/'), '2011');
    assert.equal(cleanYear('２０１１年３月'), '2011');
    assert.equal(cleanYear('n.d.'), 'n.d.');
  });
});

describe('和文・欧文の判定（detectLang）', () => {
  test('タイトルの文字で決める', () => {
    assert.equal(detectLang({ title: '近世村落の研究' }), 'cjk');
    assert.equal(detectLang({ title: '清代江南的市镇' }), 'cjk');
    assert.equal(detectLang({ title: '조선 후기' }), 'cjk');
    assert.equal(detectLang({ title: 'What Is History?' }), 'western');
  });
  test('タイトルが欧文なら言語欄より優先する', () => {
    assert.equal(detectLang({ title: 'Village Society' }, 'jpn'), 'western');
  });
  test('タイトルで決まらなければ言語欄、次に雑誌名・著者名', () => {
    assert.equal(detectLang({ title: '1968' }, 'ja'), 'cjk');
    assert.equal(detectLang({ title: '' }, 'eng'), 'western');
    assert.equal(detectLang({ title: '', containerTitle: '史学雑誌' }), 'cjk');
    assert.equal(detectLang({ title: '', authors: ['Smith, John'] }), 'western');
    assert.equal(detectLang({}), 'cjk');
  });
});
