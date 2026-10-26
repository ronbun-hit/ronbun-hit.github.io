import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { formatChicago } from '../assets/js/formatters/chicago.js';
import { formatEntry } from '../assets/js/formatters/index.js';
import { runsToText } from '../assets/js/formatters/text.js';
import { entry } from './helpers.js';

const text = (e) => runsToText(formatChicago(e));
const italics = (e) => formatChicago(e).filter((run) => run.italic).map((run) => run.text);

const article = entry({
  kind: 'article',
  lang: 'western',
  authors: ['Smith, John'],
  title: 'Village Society in Early Modern Japan',
  containerTitle: 'Journal of Asian Studies',
  volume: '72',
  issue: '2',
  year: '2013',
  pages: '301-325',
});

const book = entry({
  kind: 'book',
  lang: 'western',
  authors: ['Carr, Edward Hallett'],
  title: 'What Is History?',
  place: 'London',
  publisher: 'Macmillan',
  year: '1961',
});

const chapter = entry({
  kind: 'chapter',
  lang: 'western',
  authors: ['Smith, John'],
  title: 'Chapter Title',
  editors: ['Doe, Jane'],
  containerTitle: 'Book Title',
  place: 'Oxford',
  publisher: 'Oxford University Press',
  year: '2011',
  pages: '1-20',
});

describe('欧文論文', () => {
  test('基本形', () => {
    assert.equal(
      text(article),
      'Smith, John. “Village Society in Early Modern Japan.” Journal of Asian Studies 72, no. 2 (2013): 301–325.',
    );
  });
  test('雑誌名はイタリック', () => {
    assert.deepEqual(italics(article), ['Journal of Asian Studies']);
  });
  test('号がない', () => {
    assert.match(text({ ...article, issue: '' }), /Journal of Asian Studies 72 \(2013\): 301–325\.$/);
  });
  test('巻がない', () => {
    assert.match(text({ ...article, volume: '' }), /Journal of Asian Studies, no\. 2 \(2013\): 301–325\.$/);
  });
  test('頁がない', () => {
    assert.match(text({ ...article, pages: '' }), /Journal of Asian Studies 72, no\. 2 \(2013\)\.$/);
  });
  test('疑問符で終わるタイトルにはピリオドを足さない', () => {
    assert.match(text({ ...article, title: 'Was There a Meiji Revolution?' }), /“Was There a Meiji Revolution\?” Journal/);
  });
  test('タイトル中の二重引用符は一重引用符にする', () => {
    assert.match(text({ ...article, title: 'The "Closed Country" Reconsidered' }), /“The ‘Closed Country’ Reconsidered\.”/);
  });
  test('2 人の著者', () => {
    assert.match(text({ ...article, authors: ['Smith, John', 'Doe, Jane'] }), /^Smith, John, and Jane Doe\. “/);
  });
  test('3 人の著者', () => {
    assert.match(
      text({ ...article, authors: ['Smith, John', 'Doe, Jane', 'Roe, Richard'] }),
      /^Smith, John, Jane Doe, and Richard Roe\. “/,
    );
  });
  test('7 人以上は最初の 3 人と et al.（第18版）', () => {
    const authors = ['A, Alice', 'B, Bob', 'C, Carol', 'D, Dave', 'E, Eve', 'F, Frank', 'G, Grace'];
    assert.match(text({ ...article, authors }), /^A, Alice, Bob B, Carol C, et al\. “/);
  });
  test('6 人までは全員を書く', () => {
    const authors = ['A, Alice', 'B, Bob', 'C, Carol', 'D, Dave', 'E, Eve', 'F, Frank'];
    assert.match(text({ ...article, authors }), /^A, Alice, Bob B, Carol C, Dave D, Eve E, and Frank F\. “/);
  });
});

describe('欧文単行本', () => {
  test('出版地あり、疑問符で終わる書名', () => {
    assert.equal(text(book), 'Carr, Edward Hallett. What Is History? London: Macmillan, 1961.');
    assert.deepEqual(italics(book), ['What Is History?']);
  });
  test('出版地なし（第18版の形）', () => {
    assert.equal(text({ ...book, place: '' }), 'Carr, Edward Hallett. What Is History? Macmillan, 1961.');
  });
  test('ふつうの書名のあとにはピリオド', () => {
    assert.equal(
      text({ ...book, title: 'The Historian’s Craft', authors: ['Bloch, Marc'], place: 'New York', publisher: 'Knopf', year: '1953' }),
      'Bloch, Marc. The Historian’s Craft. New York: Knopf, 1953.',
    );
  });
  test('訳者', () => {
    assert.equal(
      text({ ...book, title: 'The Historian’s Craft', authors: ['Bloch, Marc'], translators: ['Putnam, Peter'], place: 'New York', publisher: 'Knopf', year: '1953' }),
      'Bloch, Marc. The Historian’s Craft. Translated by Peter Putnam. New York: Knopf, 1953.',
    );
  });
  test('編者だけ（ed. / eds.）', () => {
    const edited = { ...book, authors: [], editors: ['Doe, Jane'], title: 'Edited Volume', place: '', publisher: 'Routledge', year: '2020' };
    assert.equal(text(edited), 'Doe, Jane, ed. Edited Volume. Routledge, 2020.');
    assert.equal(
      text({ ...edited, editors: ['Doe, Jane', 'Roe, Richard'] }),
      'Doe, Jane, and Richard Roe, eds. Edited Volume. Routledge, 2020.',
    );
  });
  test('著者と編者', () => {
    assert.equal(
      text({ ...book, editors: ['Doe, Jane'] }),
      'Carr, Edward Hallett. What Is History? Edited by Jane Doe. London: Macmillan, 1961.',
    );
  });
  test('刊行年がなければ n.d.', () => {
    assert.equal(text({ ...book, year: '' }), 'Carr, Edward Hallett. What Is History? London: Macmillan, n.d.');
  });
  test('「Title : subtitle」を「Title: subtitle」にする', () => {
    assert.match(text({ ...book, title: 'Agrarian Change : A Regional Study' }), /Agrarian Change: A Regional Study\. London/);
  });
  test('イニシャルで終わる著者名にピリオドを重ねない', () => {
    assert.match(text({ ...book, authors: ['Carr, E. H.'] }), /^Carr, E\. H\. What Is History\?/);
  });
});

describe('欧文編著所収論文', () => {
  test('基本形', () => {
    assert.equal(
      text(chapter),
      'Smith, John. “Chapter Title.” In Book Title, edited by Jane Doe, 1–20. Oxford: Oxford University Press, 2011.',
    );
    assert.deepEqual(italics(chapter), ['Book Title']);
  });
  test('編者が 2 人', () => {
    assert.match(text({ ...chapter, editors: ['Doe, Jane', 'Roe, Richard'] }), /edited by Jane Doe and Richard Roe, 1–20\./);
  });
  test('編者がない', () => {
    assert.match(text({ ...chapter, editors: [] }), /“Chapter Title\.” In Book Title, 1–20\. Oxford/);
  });
  test('頁がない（第18版では省略可）', () => {
    assert.match(text({ ...chapter, pages: '' }), /In Book Title, edited by Jane Doe\. Oxford/);
  });
});

describe('名前と数字の扱い', () => {
  test('カンマなしの名前は最後の語を姓とみなす', () => {
    assert.match(text({ ...article, authors: ['John Smith', 'Jane Doe'] }), /^Smith, John, and Jane Doe\./);
  });
  test('{ } で囲んだ団体名は分けない', () => {
    assert.match(text({ ...book, authors: ['{United Nations}'] }), /^United Nations\. What Is History\?/);
  });
  test('Jr. などの後置詞', () => {
    assert.match(text({ ...book, authors: ['King, Martin Luther, Jr.'] }), /^King, Martin Luther, Jr\. What/);
    assert.match(text({ ...book, authors: ['Doe, Jane', 'King, Martin Luther, Jr.'] }), /^Doe, Jane, and Martin Luther King Jr\. What/);
  });
  test('全角数字は半角にする', () => {
    assert.match(text({ ...article, volume: '７２', issue: '２', year: '２０１３', pages: '３０１－３２５' }), /72, no\. 2 \(2013\): 301–325\.$/);
  });
  test('和文向けの設定（全角・句点なしなど）は欧文に影響しない', () => {
    const result = formatEntry(article, { digits: 'full', pageDash: '～', period: false, preset: 'B' });
    assert.equal(
      result.text,
      'Smith, John. “Village Society in Early Modern Japan.” Journal of Asian Studies 72, no. 2 (2013): 301–325.',
    );
  });
});

describe('HTML 出力', () => {
  test('イタリックは <i>、特殊文字はエスケープ', () => {
    const result = formatEntry({ ...book, title: 'War & Peace <Revisited>' }, {});
    assert.equal(result.html, 'Carr, Edward Hallett. <i>War &amp; Peace &lt;Revisited&gt;</i>. London: Macmillan, 1961.');
  });
  test('和文は 1 つのランで、イタリックなし', () => {
    const result = formatEntry(entry({ kind: 'book', lang: 'cjk', authors: ['山田, 太郎'], title: '書名' }), {});
    assert.deepEqual(result.runs, [{ text: '山田太郎『書名』。', italic: false }]);
    assert.equal(result.html, '山田太郎『書名』。');
  });
});
