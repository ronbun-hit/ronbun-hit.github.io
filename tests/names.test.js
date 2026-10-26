import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  formatCjkName,
  formatWesternName,
  joinCjkNames,
  joinWesternNames,
  parseName,
  westernSortKey,
} from '../assets/js/formatters/names.js';

describe('parseName', () => {
  test('「姓, 名」を分ける', () => {
    assert.deepEqual(parseName('山田, 太郎'), { family: '山田', given: '太郎' });
    assert.deepEqual(parseName('Carr, Edward Hallett'), { family: 'Carr', given: 'Edward Hallett' });
  });
  test('全角カンマも区切りとみなす', () => {
    assert.deepEqual(parseName('山田，太郎'), { family: '山田', given: '太郎' });
  });
  test('後置詞', () => {
    assert.deepEqual(parseName('King, Martin Luther, Jr.'), { family: 'King', given: 'Martin Luther', suffix: 'Jr.' });
  });
  test('カンマがなければそのままの表記', () => {
    assert.deepEqual(parseName('山田太郎'), { literal: '山田太郎' });
  });
  test('{ } で囲めば団体名', () => {
    assert.deepEqual(parseName('{United Nations}'), { literal: 'United Nations', protected: true });
  });
  test('空なら null', () => {
    assert.equal(parseName('  '), null);
  });
});

describe('和文での人名（formatCjkName）', () => {
  test('日本人の「山田, 太郎」は「山田太郎」', () => {
    assert.equal(formatCjkName('山田, 太郎'), '山田太郎');
  });
  test('姓と名の間の空白（半角・全角）も詰める', () => {
    assert.equal(formatCjkName('山田 太郎'), '山田太郎');
    assert.equal(formatCjkName('山田　太郎'), '山田太郎');
    assert.equal(formatCjkName('山田 , 太郎'), '山田太郎');
  });
  test('中国人・韓国人の名前も詰める', () => {
    assert.equal(formatCjkName('李, 大明'), '李大明');
    assert.equal(formatCjkName('김, 민수'), '김민수');
    assert.equal(formatCjkName('김 민수'), '김민수');
  });
  test('名がカタカナの日本人名', () => {
    assert.equal(formatCjkName('山田, ハナ'), '山田ハナ');
  });
  test('カタカナの「姓, 名」は「名・姓」にする', () => {
    assert.equal(formatCjkName('ブロック, マルク'), 'マルク・ブロック');
    assert.equal(formatCjkName('レヴィ=ストロース, クロード'), 'クロード・レヴィ=ストロース');
  });
  test('空白で区切ったカタカナ名は中黒でつなぐ', () => {
    assert.equal(formatCjkName('マルク ブロック'), 'マルク・ブロック');
    assert.equal(formatCjkName('マルク・ブロック'), 'マルク・ブロック');
  });
  test('欧文の名前はそのまま', () => {
    assert.equal(formatCjkName('Carr, Edward Hallett'), 'Carr, Edward Hallett');
    assert.equal(formatCjkName('Yamada, Taro'), 'Yamada, Taro');
  });
  test('役割の語が付いた名前も詰める', () => {
    assert.equal(formatCjkName('松村, 剛監訳'), '松村剛監訳');
  });
});

describe('和文での複数人（joinCjkNames）', () => {
  test('中黒でつなぐ', () => {
    assert.equal(joinCjkNames(['山田, 太郎', '鈴木, 一郎', '佐藤, 花子']), '山田太郎・鈴木一郎・佐藤花子');
  });
  test('カタカナ名や欧文名があれば読点でつなぐ', () => {
    assert.equal(joinCjkNames(['ブロック, マルク', 'フェーヴル, リュシアン']), 'マルク・ブロック、リュシアン・フェーヴル');
    assert.equal(joinCjkNames(['山田, 太郎', 'Smith, John']), '山田太郎、Smith, John');
  });
  test('空の名前は無視する', () => {
    assert.equal(joinCjkNames(['', '山田, 太郎', ' ']), '山田太郎');
    assert.equal(joinCjkNames([]), '');
    assert.equal(joinCjkNames(undefined), '');
  });
});

describe('欧文での人名', () => {
  test('姓, 名 と 名 姓', () => {
    assert.equal(formatWesternName('Carr, Edward Hallett', true), 'Carr, Edward Hallett');
    assert.equal(formatWesternName('Carr, Edward Hallett', false), 'Edward Hallett Carr');
  });
  test('カンマなしの名前', () => {
    assert.equal(formatWesternName('Edward Hallett Carr', true), 'Carr, Edward Hallett');
    assert.equal(formatWesternName('Edward Hallett Carr', false), 'Edward Hallett Carr');
    assert.equal(formatWesternName('Plato', true), 'Plato');
  });
  test('漢字の名前は欧文の文献でも詰めて書く', () => {
    assert.equal(formatWesternName('山田, 太郎', true), '山田太郎');
  });
  test('複数人の並べ方', () => {
    assert.equal(joinWesternNames(['Smith, John'], { invertFirst: true }), 'Smith, John');
    assert.equal(joinWesternNames(['Smith, John', 'Doe, Jane'], { invertFirst: true }), 'Smith, John, and Jane Doe');
    assert.equal(joinWesternNames(['Smith, John', 'Doe, Jane']), 'John Smith and Jane Doe');
    assert.equal(joinWesternNames(['Smith, John', 'Doe, Jane', 'Roe, Richard']), 'John Smith, Jane Doe, and Richard Roe');
    assert.equal(joinWesternNames(['{United Nations}', 'Doe, Jane'], { invertFirst: true }), 'United Nations and Jane Doe');
  });
  test('並べ替え用のキーは「姓 名」', () => {
    assert.equal(westernSortKey('Carr, Edward Hallett'), 'Carr Edward Hallett');
    assert.equal(westernSortKey('John Smith'), 'Smith John');
  });
});
