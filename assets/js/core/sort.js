// 文献リストの並べ替え
//
// 'input'：入力順（リストに追加した順）
// 'author'：和文 → 欧文の順。和文は著者名（読みがあれば読み）、欧文は筆頭著者の姓で並べる。
//   和文の漢字は、読みがないと文字コード（JIS 順。おおむね最初の字の音読み順）で並ぶ。
//   五十音順に正しく並べたいときは、手入力フォームの「よみ」に読みを入れてもらう。

import { formatCjkName, westernSortKey } from '../formatters/names.js';

const jaCollator = new Intl.Collator('ja', { numeric: true });
const westernCollator = new Intl.Collator('en', { sensitivity: 'base', numeric: true });

function firstContributors(entry) {
  if (entry.authors.length > 0) return entry.authors;
  if (entry.editors.length > 0) return entry.editors;
  return entry.translators;
}

function cjkKey(entry) {
  const yomi = entry.yomi.trim();
  if (yomi) return yomi;
  const people = firstContributors(entry);
  return people.length > 0 ? people.map(formatCjkName).join(' ') : entry.title;
}

function westernKey(entry) {
  const people = firstContributors(entry);
  if (people.length > 0) return people.map(westernSortKey).join(' ');
  // 著者のない文献は、冒頭の冠詞を除いた書名で並べる
  return entry.title.replace(/^(?:the|a|an)\s+/i, '');
}

function compareWith(collator, keyOf) {
  return (a, b) =>
    collator.compare(keyOf(a.entry), keyOf(b.entry)) ||
    (parseInt(a.entry.year, 10) || 0) - (parseInt(b.entry.year, 10) || 0) ||
    collator.compare(a.entry.title, b.entry.title) ||
    a.index - b.index;
}

export function sortEntries(entries, mode) {
  if (mode !== 'author') return [...entries];
  const indexed = entries.map((entry, index) => ({ entry, index }));
  const cjk = indexed.filter((item) => item.entry.lang !== 'western').sort(compareWith(jaCollator, cjkKey));
  const western = indexed
    .filter((item) => item.entry.lang === 'western')
    .sort(compareWith(westernCollator, westernKey));
  return [...cjk, ...western].map((item) => item.entry);
}
