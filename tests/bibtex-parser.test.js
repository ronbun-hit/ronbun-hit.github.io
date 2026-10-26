import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { parseBibtex, parseBibtexRecords, splitBibtexNames } from '../assets/js/parsers/bibtex.js';
import { decodeLatex } from '../assets/js/parsers/latex.js';
import { fixture } from './helpers.js';

describe('CiNii 想定サンプル（BibTeX）', () => {
  const { items, errors } = parseBibtex(fixture('cinii-sample.bib'));
  const entries = items.map((item) => item.entry);

  test('10 件を読み取り、@comment は読み飛ばす', () => {
    assert.equal(entries.length, 10);
    assert.deepEqual(errors, []);
  });

  test('和文の論文', () => {
    const e = entries[0];
    assert.equal(e.kind, 'article');
    assert.equal(e.lang, 'cjk');
    assert.deepEqual(e.authors, ['山田, 太郎', '鈴木, 一郎']);
    assert.equal(e.title, '近世村落における年貢収取と村請制 : 信濃国佐久郡を事例に');
    assert.equal(e.containerTitle, '史学雑誌');
    assert.equal(e.volume, '120');
    assert.equal(e.issue, '3');
    assert.equal(e.year, '2011');
    assert.equal(e.pages, '1-20');
    assert.equal(e.doi, '10.99999/example.2011.120.3_1');
    assert.equal(e.source, 'bibtex');
  });

  test('単行本：並列タイトルを除き、出版地を保持する', () => {
    const e = entries[1];
    assert.equal(e.kind, 'book');
    assert.equal(e.title, '中世荘園制の展開');
    assert.equal(e.publisher, '吉川弘文館');
    assert.equal(e.place, '東京');
  });

  test('編者だけの単行本', () => {
    const e = entries[2];
    assert.deepEqual(e.authors, []);
    assert.deepEqual(e.editors, ['鈴木, 一郎']);
  });

  test('編著所収論文', () => {
    const e = entries[3];
    assert.equal(e.kind, 'chapter');
    assert.equal(e.containerTitle, '日本近代史の再検討');
    assert.deepEqual(e.editors, ['鈴木, 一郎']);
    assert.equal(e.pages, '45-78');
  });

  test('「訳」の付いた名前は訳者に回し、翻訳書と判定する', () => {
    const e = entries[4];
    assert.equal(e.kind, 'translation');
    assert.deepEqual(e.authors, ['デュラン, ポール']);
    assert.deepEqual(e.translators, ['高橋, 三郎']);
  });

  test('中国語・韓国語の文献は和文（cjk）', () => {
    assert.equal(entries[5].lang, 'cjk');
    assert.equal(entries[5].containerTitle, '历史研究');
    assert.equal(entries[6].lang, 'cjk');
    assert.deepEqual(entries[6].authors, ['김, 민수']);
  });

  test('欧文の論文：引用符の値・裸の数字・-- の頁', () => {
    const e = entries[7];
    assert.equal(e.lang, 'western');
    assert.deepEqual(e.authors, ['Smith, John', 'Doe, Jane']);
    assert.equal(e.volume, '72');
    assert.equal(e.pages, '301-325');
  });

  test('LaTeX のアクセントと保護用の波括弧を戻す', () => {
    const e = entries[8];
    assert.deepEqual(e.authors, ['Müller, Hans']);
    assert.equal(e.title, 'Agrarian Change in Tokugawa Japan : A Regional Study');
    assert.equal(e.place, 'Cambridge');
  });

  test('最後のフィールドの後にカンマがなくても読める', () => {
    assert.equal(entries[9].pages, '2-15');
    assert.equal(entries[9].issue, '1000');
  });

  test('出現位置（offset）は昇順', () => {
    const offsets = items.map((item) => item.offset);
    assert.deepEqual(offsets, [...offsets].sort((a, b) => a - b));
  });
});

describe('BibTeX の文法', () => {
  test('@string のマクロと # による連結', () => {
    const { records } = parseBibtexRecords(`
      @string{ jas = "Journal of " }
      @article{k, journal = jas # {Asian Studies}, month = mar, year = 2000}
    `);
    assert.equal(records.length, 1);
    assert.equal(records[0].fields.journal, 'Journal of Asian Studies');
    assert.equal(records[0].fields.month, '3');
  });

  test('丸括弧で囲んだエントリーと、大文字のフィールド名', () => {
    const { records } = parseBibtexRecords('@Book(key, TITLE = {T}, Author = {A, B})');
    assert.equal(records[0].type, 'book');
    assert.equal(records[0].fields.title, 'T');
    assert.equal(records[0].fields.author, 'A, B');
  });

  test('入れ子の波括弧と値の中の閉じ丸括弧', () => {
    const { records } = parseBibtexRecords('@article(k, title = {A {B} (C) D})');
    assert.equal(records[0].fields.title, 'A {B} (C) D');
  });

  test('引用キーがないエントリー', () => {
    const { records } = parseBibtexRecords('@misc{title = {T}, year = {2000}}');
    assert.equal(records.length, 1);
    assert.equal(records[0].key, '');
    assert.equal(records[0].fields.title, 'T');
  });

  test('壊れたエントリーがあっても次のエントリーは読む', () => {
    const { items, errors } = parseBibtex(`
      @article{broken, title = {閉じていない
      @article{ok, title = {正しいエントリー}, year = {2000}}
    `);
    assert.equal(items.length, 1);
    assert.equal(items[0].entry.title, '正しいエントリー');
    assert.equal(errors.length, 1);
    assert.match(errors[0].message, /article/);
    assert.equal(typeof errors[0].line, 'number');
  });

  test('メールアドレスなどの @ は無視する', () => {
    const { records, errors } = parseBibtexRecords('連絡先 foo@example.com\n@book{k, title={T}}');
    assert.equal(records.length, 1);
    assert.deepEqual(errors, []);
  });

  test('BOM 付きでも読める', () => {
    const { records } = parseBibtexRecords('﻿@book{k, title={T}}');
    assert.equal(records.length, 1);
  });

  test('@book の kind 判定（@misc は項目から推定）', () => {
    const kinds = parseBibtex(`
      @misc{a, title={A}, journal={J}}
      @misc{b, title={B}, booktitle={BT}}
      @misc{c, title={C}}
      @inbook{d, title={D}}
      @phdthesis{e, title={E}, school={某大学}}
    `).items.map((item) => item.entry.kind);
    assert.deepEqual(kinds, ['article', 'chapter', 'book', 'book', 'book']);
  });

  test('学位論文の school は出版者として扱う', () => {
    const { items } = parseBibtex('@phdthesis{e, author={山田, 太郎}, title={博士論文の題}, school={某大学}, year={2020}}');
    assert.equal(items[0].entry.publisher, '某大学');
  });

  test('タイトルも著者もないエントリーは読み飛ばして知らせる', () => {
    const { items, errors } = parseBibtex('@article{empty, year = {2000}}');
    assert.equal(items.length, 0);
    assert.equal(errors.length, 1);
  });
});

describe('splitBibtexNames', () => {
  test('and で分ける（大文字小文字・改行を問わない）', () => {
    assert.deepEqual(splitBibtexNames('山田, 太郎 and 鈴木, 一郎\n AND Smith, John'), ['山田, 太郎', '鈴木, 一郎', 'Smith, John']);
  });
  test('波括弧の中の and では分けない', () => {
    assert.deepEqual(splitBibtexNames('{Smith and Sons} and Doe, Jane'), ['{Smith and Sons}', 'Doe, Jane']);
  });
  test('漢字の団体名の波括弧は外す', () => {
    assert.deepEqual(splitBibtexNames('{東京大学史料編纂所}'), ['東京大学史料編纂所']);
  });
  test('and others は除く', () => {
    assert.deepEqual(splitBibtexNames('Smith, John and others'), ['Smith, John']);
  });
  test('Anderson のような名前の中の and では分けない', () => {
    assert.deepEqual(splitBibtexNames('Anderson, Benedict and Brandon, Alex'), ['Anderson, Benedict', 'Brandon, Alex']);
  });
});

describe('decodeLatex', () => {
  test('アクセント', () => {
    assert.equal(decodeLatex('M{\\"u}ller'), 'Müller');
    assert.equal(decodeLatex('Fran\\c{c}ois'), 'François');
    assert.equal(decodeLatex("Jos\\'{e}"), 'José');
    assert.equal(decodeLatex("\\'{\\i}"), 'í');
    assert.equal(decodeLatex('\\v{S}koda'), 'Škoda');
  });
  test('記号と特殊文字', () => {
    assert.equal(decodeLatex('Stra{\\ss}e'), 'Straße');
    assert.equal(decodeLatex('Smith \\& Sons'), 'Smith & Sons');
    assert.equal(decodeLatex('100\\%'), '100%');
  });
  test('書式コマンドは中身だけ残す', () => {
    assert.equal(decodeLatex('The \\textit{Tale of Genji}'), 'The Tale of Genji');
  });
  test('欧文のダッシュとチルダ', () => {
    assert.equal(decodeLatex('1--20'), '1–20');
    assert.equal(decodeLatex('A---B'), 'A—B');
    assert.equal(decodeLatex('E.~H. Carr'), 'E. H. Carr');
  });
  test('和文の -- や ~ は元の表記を守る', () => {
    assert.equal(decodeLatex('近世--近代'), '近世--近代');
    assert.equal(decodeLatex('江戸~明治'), '江戸~明治');
  });
  test('互換漢字を別の字に置き換えない', () => {
    // U+FA19（神の互換漢字）は NFC 正規化すると U+795E になってしまう
    assert.equal(decodeLatex('神社'), '神社');
  });
});
