// RIS の読み取り
//
// parseRisRecords: RIS の文法（「TAG  - 値」の行、TY で始まり ER で終わる）だけを扱う
// parseRis:        読み取ったタグを、共通の文献モデルに変換する

import { normalizeImported } from './normalize.js';

// 「TY  - JOUR」。区切りの空白の数がずれた書き出しも受け付ける
const LINE_RE = /^([A-Z][A-Z0-9])[ \t]{1,3}-[ \t]?(.*)$/;

/** RIS テキストをレコード（タグ → 値の配列）に分ける */
export function parseRisRecords(input) {
  const text = String(input ?? '');
  const records = [];
  const errors = [];
  let current = null;
  let lastTag = null;

  const lineRe = /([^\r\n]*)(\r\n|\r|\n|$)/g;
  let lineNo = 0;
  let match;
  while ((match = lineRe.exec(text)) !== null) {
    const offset = match.index;
    const line = match[1].replace(/^﻿/, '');
    lineNo += 1;
    if (match[0] === '') break;

    const m = LINE_RE.exec(line);
    if (!m) {
      // タグのない行は、直前の値の続き（長い抄録の折り返しなど）とみなす
      if (current && lastTag && line.trim() !== '') {
        const values = current.fields[lastTag];
        values[values.length - 1] = `${values[values.length - 1]} ${line.trim()}`;
      }
      continue;
    }
    const tag = m[1];
    const value = m[2].trim();
    if (tag === 'TY') {
      if (current) {
        records.push(current);
        errors.push({ line: current.line, message: 'ER のないレコードがありました（次の TY までを 1 件として読み取りました）' });
      }
      current = { type: value.toUpperCase(), fields: Object.create(null), offset, line: lineNo };
      lastTag = null;
    } else if (tag === 'ER') {
      if (current) records.push(current);
      current = null;
      lastTag = null;
    } else if (current) {
      if (!current.fields[tag]) current.fields[tag] = [];
      current.fields[tag].push(value);
      lastTag = tag;
    }
  }
  if (current) {
    records.push(current);
    errors.push({ line: current.line, message: '最後のレコードに ER がありませんでした（末尾までを 1 件として読み取りました）' });
  }
  return { records, errors };
}

const KIND_BY_TYPE = {
  JOUR: 'article',
  JFULL: 'article',
  EJOUR: 'article',
  MGZN: 'article',
  NEWS: 'article',
  INPR: 'article',
  ABST: 'article',
  BOOK: 'book',
  EBOOK: 'book',
  EDBOOK: 'book',
  THES: 'book',
  RPRT: 'book',
  ANCIENT: 'book',
  CLSWK: 'book',
  GOVDOC: 'book',
  MANSCPT: 'book',
  SER: 'book',
  CHAP: 'chapter',
  ECHAP: 'chapter',
  CPAPER: 'chapter',
};

const JOURNAL_TAGS = ['T2', 'JF', 'JO', 'JA', 'J1', 'J2'];

function inferKind(type, has) {
  if (type === 'CONF') return has('T2') ? 'chapter' : 'book';
  if (KIND_BY_TYPE[type]) return KIND_BY_TYPE[type];
  if (JOURNAL_TAGS.slice(1).some(has)) return 'article';
  if (has('BT')) return 'chapter';
  if (has('T2')) return has('PB') ? 'chapter' : 'article';
  return 'book';
}

/** レコードを normalize.js の生データにする */
export function risRecordToRaw(record) {
  const f = record.fields;
  const first = (...tags) => {
    for (const tag of tags) {
      const value = f[tag]?.find((v) => v.trim() !== '');
      if (value) return value;
    }
    return '';
  };
  const all = (...tags) => tags.flatMap((tag) => f[tag] ?? []).filter((v) => v.trim() !== '');
  const has = (tag) => first(tag) !== '';

  const kind = inferKind(record.type, has);
  let authors = all('AU', 'A1');
  let editors = all('ED', ...(kind === 'article' ? [] : ['A2']));
  if (record.type === 'EDBOOK' && editors.length === 0) {
    editors = authors;
    authors = [];
  }

  let pages = first('SP');
  const end = first('EP');
  if (pages && end && !/[-–~～]/.test(pages)) pages = `${pages}-${end}`;
  else if (!pages && end) pages = end;

  return {
    kind,
    authors,
    editors,
    translators: all('A4'),
    title: first('TI', 'T1', ...(kind === 'book' ? ['BT'] : []), 'CT'),
    containerTitle:
      kind === 'article' ? first(...JOURNAL_TAGS) : kind === 'chapter' ? first('T2', 'BT') : '',
    volume: first('VL'),
    issue: first('IS'),
    year: first('PY', 'Y1', 'DA', 'Y2'),
    pages,
    publisher: first('PB'),
    place: first('CY', 'PP'),
    doi: first('DO'),
    url: first('UR'),
    languageHint: first('LA'),
    source: 'ris',
  };
}

/** RIS テキストを読み取り、文献データの配列にする */
export function parseRis(input) {
  const { records, errors } = parseRisRecords(input);
  const items = [];
  for (const record of records) {
    const entry = normalizeImported(risRecordToRaw(record));
    if (entry) items.push({ entry, offset: record.offset });
    else errors.push({ line: record.line, message: 'タイトルも著者もないレコードを読み飛ばしました' });
  }
  return { items, errors };
}
