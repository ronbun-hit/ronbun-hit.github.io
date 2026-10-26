// BibTeX の読み取り
//
// parseBibtexRecords: BibTeX の文法だけを扱い、エントリーごとのフィールド（生の文字列）を取り出す
// parseBibtex:        取り出したフィールドを、共通の文献モデルに変換する

import { hasCjk } from '../core/script.js';
import { decodeLatex } from './latex.js';
import { normalizeImported } from './normalize.js';

class BibtexSyntaxError extends Error {
  constructor(message, offset) {
    super(message);
    this.offset = offset;
  }
}

const MONTH_MACROS = [
  ['jan', '1'], ['feb', '2'], ['mar', '3'], ['apr', '4'], ['may', '5'], ['jun', '6'],
  ['jul', '7'], ['aug', '8'], ['sep', '9'], ['oct', '10'], ['nov', '11'], ['dec', '12'],
];

const HEADER_RE = /@[ \t\r\n]*([A-Za-z][\w:-]*)[ \t\r\n]*([{(])/y;
const KEY_RE = /[^\s,{}()"=#]+/y;
const FIELD_NAME_RE = /[^\s,{}()"=#]+/y;
const BARE_VALUE_RE = /[^\s,{}()"=#]+/y;

function skipSpace(text, pos) {
  while (pos < text.length && /\s/.test(text[pos])) pos += 1;
  return pos;
}

function lineOf(text, offset) {
  let line = 1;
  for (let i = 0; i < offset && i < text.length; i += 1) if (text[i] === '\n') line += 1;
  return line;
}

/** open の位置から、対応する close までを読む（波括弧の入れ子とバックスラッシュを考慮） */
function readDelimited(text, start, open, close) {
  let depth = 0;
  for (let i = start; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === '\\') {
      i += 1;
      continue;
    }
    if (ch === open) depth += 1;
    else if (ch === close) {
      depth -= 1;
      if (depth === 0) return { value: text.slice(start + 1, i), end: i + 1 };
    }
  }
  throw new BibtexSyntaxError(`「${open}」に対応する「${close}」がありません`, start);
}

function readQuoted(text, start) {
  let depth = 0;
  for (let i = start + 1; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === '\\') {
      i += 1;
      continue;
    }
    if (ch === '{') depth += 1;
    else if (ch === '}') depth = Math.max(0, depth - 1);
    else if (ch === '"' && depth === 0) return { value: text.slice(start + 1, i), end: i + 1 };
  }
  throw new BibtexSyntaxError('「"」が閉じていません', start);
}

/** フィールドの値を読む。{…}・"…"・数字・@string のマクロと、# による連結に対応 */
function readValue(text, pos, macros) {
  const parts = [];
  for (;;) {
    pos = skipSpace(text, pos);
    const ch = text[pos];
    let piece;
    if (ch === '{') piece = readDelimited(text, pos, '{', '}');
    else if (ch === '"') piece = readQuoted(text, pos);
    else {
      BARE_VALUE_RE.lastIndex = pos;
      const m = BARE_VALUE_RE.exec(text);
      if (!m) throw new BibtexSyntaxError('値を読み取れません', pos);
      piece = { value: macros.get(m[0].toLowerCase()) ?? m[0], end: BARE_VALUE_RE.lastIndex };
    }
    parts.push(piece.value);
    pos = skipSpace(text, piece.end);
    if (text[pos] === '#') {
      pos += 1;
      continue;
    }
    return { value: parts.join(''), end: pos };
  }
}

/** エントリーの中身（引用キーとフィールド）を読む */
function readEntryBody(text, pos, close, macros) {
  let key = '';
  pos = skipSpace(text, pos);
  KEY_RE.lastIndex = pos;
  const keyMatch = KEY_RE.exec(text);
  if (keyMatch) {
    const after = skipSpace(text, KEY_RE.lastIndex);
    if (text[after] === ',') {
      key = keyMatch[0];
      pos = after + 1;
    } else if (text[after] === close) {
      return { key: keyMatch[0], fields: Object.create(null), end: after + 1 };
    } else if (text[after] !== '=') {
      throw new BibtexSyntaxError('引用キーの後に「,」がありません', after);
    }
    // 「=」が続くならキーの省略。読んだのはフィールド名なので pos はそのまま
  }

  const fields = Object.create(null);
  for (;;) {
    pos = skipSpace(text, pos);
    if (pos >= text.length) throw new BibtexSyntaxError('エントリーが閉じていません', pos);
    if (text[pos] === ',') {
      pos += 1;
      continue;
    }
    if (text[pos] === close) return { key, fields, end: pos + 1 };

    FIELD_NAME_RE.lastIndex = pos;
    const nameMatch = FIELD_NAME_RE.exec(text);
    if (!nameMatch) throw new BibtexSyntaxError('フィールド名を読み取れません', pos);
    const name = nameMatch[0].toLowerCase();
    pos = skipSpace(text, FIELD_NAME_RE.lastIndex);
    if (text[pos] !== '=') throw new BibtexSyntaxError(`「${nameMatch[0]}」の後に「=」がありません`, pos);
    const { value, end } = readValue(text, pos + 1, macros);
    if (!(name in fields)) fields[name] = value;
    pos = end;
    if (text[pos] !== ',' && text[pos] !== close) {
      throw new BibtexSyntaxError(`「${nameMatch[0]}」の値の後に「,」がありません`, pos);
    }
  }
}

/** BibTeX テキストをエントリー（種類・キー・フィールド）に分ける */
export function parseBibtexRecords(input) {
  const text = String(input ?? '').replace(/^﻿/, '');
  const records = [];
  const errors = [];
  const macros = new Map(MONTH_MACROS);
  let pos = 0;

  while (pos < text.length) {
    const at = text.indexOf('@', pos);
    if (at === -1) break;
    HEADER_RE.lastIndex = at;
    const header = HEADER_RE.exec(text);
    if (!header) {
      pos = at + 1;
      continue;
    }
    const type = header[1].toLowerCase();
    const open = header[2];
    const close = open === '{' ? '}' : ')';
    const openPos = HEADER_RE.lastIndex - 1;

    try {
      if (type === 'comment' || type === 'preamble') {
        pos = readDelimited(text, openPos, open, close).end;
        continue;
      }
      const body = readEntryBody(text, openPos + 1, close, macros);
      pos = body.end;
      if (type === 'string') {
        for (const [name, value] of Object.entries(body.fields)) macros.set(name, value);
        continue;
      }
      records.push({ type, key: body.key, fields: body.fields, offset: at, line: lineOf(text, at) });
    } catch (error) {
      if (!(error instanceof BibtexSyntaxError)) throw error;
      errors.push({
        line: lineOf(text, error.offset ?? at),
        message: `@${header[1]} を読み取れませんでした（${error.message}）`,
      });
      pos = at + 1;
    }
  }
  return { records, errors };
}

// ---- 共通モデルへの変換 ------------------------------------------------------

const KIND_BY_TYPE = {
  article: 'article',
  periodical: 'article',
  book: 'book',
  mvbook: 'book',
  booklet: 'book',
  manual: 'book',
  collection: 'book',
  mvcollection: 'book',
  proceedings: 'book',
  reference: 'book',
  thesis: 'book',
  phdthesis: 'book',
  mastersthesis: 'book',
  report: 'book',
  techreport: 'book',
  incollection: 'chapter',
  inbook: 'chapter',
  inproceedings: 'chapter',
  conference: 'chapter',
  inreference: 'chapter',
  bookinbook: 'chapter',
};

function inferKind(type, f) {
  if (type === 'inbook' && !f.booktitle) return 'book';
  if (KIND_BY_TYPE[type]) return KIND_BY_TYPE[type];
  if (f.journal || f.journaltitle) return 'article';
  if (f.booktitle) return 'chapter';
  return 'book';
}

/** 全体が 1 組の波括弧で囲まれているか（{United Nations} のような団体名の保護） */
function isWrappedInBraces(s) {
  if (!s.startsWith('{') || !s.endsWith('}')) return false;
  let depth = 0;
  for (let i = 0; i < s.length; i += 1) {
    const ch = s[i];
    if (ch === '\\') {
      i += 1;
      continue;
    }
    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0 && i < s.length - 1) return false;
    }
  }
  return depth === 0;
}

function decodeName(raw) {
  const s = raw.trim();
  if (isWrappedInBraces(s)) {
    const inner = decodeLatex(s.slice(1, -1));
    // 欧文の団体名は姓・名に分けないよう、波括弧を目印として残す
    return hasCjk(inner) ? inner : `{${inner}}`;
  }
  return decodeLatex(s);
}

/** author などの値を、波括弧の外にある「and」で人ごとに分ける */
export function splitBibtexNames(value) {
  if (!value) return [];
  const s = value.replace(/\s+/g, ' ');
  const names = [];
  let depth = 0;
  let last = 0;
  for (let i = 0; i < s.length; i += 1) {
    const ch = s[i];
    if (ch === '\\') {
      i += 1;
      continue;
    }
    if (ch === '{') depth += 1;
    else if (ch === '}') depth -= 1;
    else if (depth === 0 && ch === ' ' && /^ and /i.test(s.slice(i, i + 5))) {
      names.push(s.slice(last, i));
      last = i + 5;
      i += 4;
    }
  }
  names.push(s.slice(last));
  return names
    .map((name) => name.trim())
    .filter((name) => name !== '' && name.toLowerCase() !== 'others')
    .map(decodeName);
}

/** エントリーを normalize.js の生データにする */
export function bibtexRecordToRaw(record) {
  const f = record.fields;
  const text = (...names) => {
    for (const name of names) {
      if (f[name] !== undefined && f[name].trim() !== '') return decodeLatex(f[name]);
    }
    return '';
  };
  const kind = inferKind(record.type, f);
  return {
    kind,
    authors: splitBibtexNames(f.author),
    editors: splitBibtexNames(f.editor),
    translators: splitBibtexNames(f.translator),
    title: kind === 'book' ? text('title', 'booktitle') : text('title'),
    containerTitle:
      kind === 'article'
        ? text('journal', 'journaltitle', 'booktitle')
        : kind === 'chapter'
          ? text('booktitle', 'journal')
          : '',
    volume: text('volume'),
    issue: text('number', 'issue'),
    year: text('year', 'date'),
    pages: text('pages'),
    publisher: text('publisher', 'school', 'institution', 'organization'),
    place: text('address', 'location'),
    doi: text('doi'),
    url: text('url'),
    languageHint: text('language', 'langid'),
    source: 'bibtex',
  };
}

/** BibTeX テキストを読み取り、文献データの配列にする */
export function parseBibtex(input) {
  const { records, errors } = parseBibtexRecords(input);
  const items = [];
  for (const record of records) {
    const entry = normalizeImported(bibtexRecordToRaw(record));
    if (entry) items.push({ entry, offset: record.offset });
    else errors.push({ line: record.line, message: `@${record.type}{${record.key}} にはタイトルも著者もないため読み飛ばしました` });
  }
  return { items, errors };
}
