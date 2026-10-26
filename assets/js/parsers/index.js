// 貼り付けられたテキストの形式を見分けて、文献データの配列にする
//
// 新しい入力手段（CiNii API など）を足すときも、最終的に core/model.js の文献データを
// 返すようにすれば、整形（formatters/）や画面（ui/）はそのまま使える。

import { parseBibtex } from './bibtex.js';
import { parseRis } from './ris.js';

const PARSERS = {
  bibtex: parseBibtex,
  ris: parseRis,
};

export const FORMAT_LABELS = {
  bibtex: 'BibTeX',
  ris: 'RIS',
};

/** テキストに含まれる形式を返す（両方が混ざっていれば両方） */
export function detectFormats(text) {
  const s = String(text ?? '');
  const formats = [];
  if (/@[ \t\r\n]*[A-Za-z]+[ \t\r\n]*[{(]/.test(s)) formats.push('bibtex');
  if (/^[ \t﻿]*TY[ \t]{1,3}-/m.test(s)) formats.push('ris');
  return formats;
}

/**
 * 貼り付けられたテキストを読み取る。
 * 戻り値：{ entries: 文献データの配列（テキスト中の順）, formats: 見つかった形式, errors: [{ format, line, message }] }
 */
export function parseReferences(text) {
  const formats = detectFormats(text);
  const items = [];
  const errors = [];
  for (const format of formats) {
    const result = PARSERS[format](text);
    items.push(...result.items);
    errors.push(...result.errors.map((error) => ({ format, ...error })));
  }
  items.sort((a, b) => a.offset - b.offset);
  return { entries: items.map((item) => item.entry), formats, errors };
}
