import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { detectFormats, parseReferences } from '../assets/js/parsers/index.js';
import { fixture } from './helpers.js';

describe('形式の判定', () => {
  test('BibTeX', () => {
    assert.deepEqual(detectFormats(fixture('cinii-sample.bib')), ['bibtex']);
  });
  test('RIS', () => {
    assert.deepEqual(detectFormats(fixture('cinii-sample.ris')), ['ris']);
  });
  test('混在', () => {
    assert.deepEqual(detectFormats(`${fixture('cinii-sample.ris')}\n${fixture('cinii-sample.bib')}`), ['bibtex', 'ris']);
  });
  test('どちらでもない', () => {
    assert.deepEqual(detectFormats('山田太郎「論文名」『史学雑誌』'), []);
    assert.deepEqual(detectFormats(''), []);
    assert.deepEqual(detectFormats(undefined), []);
  });
});

describe('parseReferences', () => {
  test('BibTeX と RIS が混ざっていても、テキスト中の順に並べる', () => {
    const text = [
      'TY  - BOOK\nTI  - 一番目（RIS）\nER  - ',
      '@book{b, title = {二番目（BibTeX）}}',
      'TY  - BOOK\nTI  - 三番目（RIS）\nER  - ',
    ].join('\n\n');
    const result = parseReferences(text);
    assert.deepEqual(result.entries.map((e) => e.title), ['一番目（RIS）', '二番目（BibTeX）', '三番目（RIS）']);
    assert.deepEqual(result.formats, ['bibtex', 'ris']);
  });

  test('読み取れないテキスト', () => {
    const result = parseReferences('ただの文章です');
    assert.deepEqual(result.entries, []);
    assert.deepEqual(result.formats, []);
  });

  test('エラーにはどの形式のものかを付ける', () => {
    const result = parseReferences('@article{broken, title = {閉じていない\n');
    assert.equal(result.errors[0].format, 'bibtex');
  });

  test('読み取るたびに別の ID が付く', () => {
    const text = fixture('cinii-sample.bib');
    const ids = [...parseReferences(text).entries, ...parseReferences(text).entries].map((e) => e.id);
    assert.equal(new Set(ids).size, ids.length);
  });
});
