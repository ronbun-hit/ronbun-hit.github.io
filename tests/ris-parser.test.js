import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { parseRis, parseRisRecords } from '../assets/js/parsers/ris.js';
import { fixture } from './helpers.js';

const strip = ({ id, ...rest }) => rest;

describe('CiNii 想定サンプル（RIS）', () => {
  const { items, errors } = parseRis(fixture('cinii-sample.ris'));
  const entries = items.map((item) => item.entry);

  test('7 件を読み取る', () => {
    assert.equal(entries.length, 7);
    assert.deepEqual(errors, []);
  });

  test('論文：複数の AU、SP と EP', () => {
    const e = entries[0];
    assert.equal(e.kind, 'article');
    assert.equal(e.lang, 'cjk');
    assert.deepEqual(e.authors, ['山田, 太郎', '鈴木, 一郎']);
    assert.equal(e.containerTitle, '史学雑誌');
    assert.equal(e.volume, '120');
    assert.equal(e.issue, '3');
    assert.equal(e.pages, '1-20');
    assert.equal(e.year, '2011');
    assert.equal(e.source, 'ris');
  });

  test('単行本：CY は出版地', () => {
    assert.equal(entries[1].kind, 'book');
    assert.equal(entries[1].place, '東京');
  });

  test('CHAP：T2 は収録図書名、A2 は編者', () => {
    const e = entries[2];
    assert.equal(e.kind, 'chapter');
    assert.equal(e.containerTitle, '日本近代史の再検討');
    assert.deepEqual(e.editors, ['鈴木, 一郎']);
    assert.equal(e.pages, '45-78');
  });

  test('A4（訳者）のある和文の BOOK は翻訳書、PY の「2004/03」は 2004', () => {
    const e = entries[3];
    assert.equal(e.kind, 'translation');
    assert.deepEqual(e.translators, ['高橋, 三郎']);
    assert.equal(e.year, '2004');
  });

  test('JO・JF も雑誌名として読む', () => {
    assert.equal(entries[4].containerTitle, '역사학보');
    assert.equal(entries[5].containerTitle, 'Journal of Asian Studies');
  });

  test('PY の「2013///」は 2013、欧文は western', () => {
    assert.equal(entries[5].year, '2013');
    assert.equal(entries[5].lang, 'western');
  });

  test('EDBOOK の AU は編者', () => {
    const e = entries[6];
    assert.equal(e.kind, 'book');
    assert.deepEqual(e.authors, []);
    assert.deepEqual(e.editors, ['Brown, Emily']);
  });

  test('改行コードが CRLF・CR でも、BOM 付きでも同じ結果', () => {
    const lf = fixture('cinii-sample.ris');
    const crlf = `﻿${lf.replace(/\n/g, '\r\n')}`;
    const cr = lf.replace(/\n/g, '\r');
    const expected = entries.map(strip);
    assert.deepEqual(parseRis(crlf).items.map((item) => strip(item.entry)), expected);
    assert.deepEqual(parseRis(cr).items.map((item) => strip(item.entry)), expected);
  });
});

describe('RIS の文法', () => {
  test('区切りの空白が 1 つの書き出しも読む', () => {
    const { records } = parseRisRecords('TY - JOUR\nTI - 題\nER -');
    assert.equal(records.length, 1);
    assert.deepEqual(records[0].fields.TI, ['題']);
  });

  test('最後の ER がなくても読み、知らせる', () => {
    const { items, errors } = parseRis('TY  - BOOK\nTI  - 題名\nPY  - 2000');
    assert.equal(items.length, 1);
    assert.equal(errors.length, 1);
  });

  test('ER なしで次の TY が始まっても 2 件として読む', () => {
    const { items } = parseRis('TY  - BOOK\nTI  - 一冊目\nTY  - BOOK\nTI  - 二冊目\nER  - ');
    assert.deepEqual(items.map((item) => item.entry.title), ['一冊目', '二冊目']);
  });

  test('タグのない行は直前の値の続き', () => {
    const { records } = parseRisRecords('TY  - JOUR\nAB  - 一行目\n二行目\nER  - ');
    assert.deepEqual(records[0].fields.AB, ['一行目 二行目']);
  });

  test('SP に範囲が入っていれば EP は使わない', () => {
    const { items } = parseRis('TY  - JOUR\nTI  - 題\nSP  - 10-20\nEP  - 20\nER  - ');
    assert.equal(items[0].entry.pages, '10-20');
  });

  test('レコードの外の行は無視する', () => {
    const { items } = parseRis('前置きの文章\n\nTY  - JOUR\nTI  - 題\nER  - \n後書き');
    assert.equal(items.length, 1);
  });

  test('GEN などは項目から種類を推定する', () => {
    const kinds = parseRis(
      ['TY  - GEN\nTI  - A\nJO  - 雑誌\nER  - ', 'TY  - GEN\nTI  - B\nBT  - 本\nER  - ', 'TY  - GEN\nTI  - C\nER  - ', 'TY  - CONF\nTI  - D\nT2  - 予稿集\nER  - '].join('\n'),
    ).items.map((item) => item.entry.kind);
    assert.deepEqual(kinds, ['article', 'chapter', 'book', 'chapter']);
  });
});
