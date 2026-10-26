// 文献データの共通モデル
//
// 入力側（parsers/、将来の CiNii API 取得など）は、読み取った内容をこの形に変換する。
// 出力側（formatters/）は、この形だけを見て参考文献の表記を組み立てる。
// 両者が直接やりとりしないので、入力手段を増やしても整形処理には手を入れずに済む。
//
// {
//   id:             一意の ID
//   kind:           'article'（論文） | 'book'（単行本） | 'chapter'（編著所収論文） | 'translation'（翻訳書）
//   lang:           'cjk'（和文：日本語・中国語・韓国語） | 'western'（欧文）
//   authors:        著者（原著者）の配列。1 要素 1 人で、「山田, 太郎」「Carr, Edward Hallett」のような文字列
//   editors:        編者の配列（単行本の編者、編著所収論文の収録図書の編者）
//   translators:    訳者の配列
//   title:          論文名・書名
//   containerTitle: 雑誌名（論文）、収録図書名（編著所収論文）
//   volume, issue:  巻・号
//   year:           刊行年
//   pages:          頁（"1-20" など）
//   publisher:      出版社
//   place:          出版地（欧文のみ表示）
//   originalInfo:   原著の情報（翻訳書のみ表示）
//   yomi:           並べ替え用の読み（和文のみ）
//   doi, url:       読み取り元にあれば保持する（現在は表示しない）
//   source:         'bibtex' | 'ris' | 'manual' など、どこから来たデータか
// }

import { hasCjk } from './script.js';

export const KINDS = ['article', 'book', 'chapter', 'translation'];
export const LANGS = ['cjk', 'western'];

export const NAME_FIELDS = ['authors', 'editors', 'translators'];
export const TEXT_FIELDS = [
  'title',
  'containerTitle',
  'volume',
  'issue',
  'year',
  'pages',
  'publisher',
  'place',
  'originalInfo',
  'yomi',
  'doi',
  'url',
  'source',
];

let idCounter = 0;

export function newId() {
  idCounter += 1;
  const random = Math.random().toString(36).slice(2, 8);
  return `e${Date.now().toString(36)}${idCounter.toString(36)}${random}`;
}

function toText(value) {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

function toNameList(value) {
  if (!Array.isArray(value)) return [];
  return value.map((name) => toText(name)).filter((name) => name !== '');
}

/**
 * 文献データを作る。足りない項目は空にし、型の合わない値は取り除く。
 * localStorage から読み戻したデータの検証にも使う。
 */
export function createEntry(fields = {}) {
  const source = fields && typeof fields === 'object' ? fields : {};
  const entry = {
    id: typeof source.id === 'string' && source.id ? source.id : newId(),
    kind: KINDS.includes(source.kind) ? source.kind : 'article',
    lang: LANGS.includes(source.lang) ? source.lang : 'cjk',
  };
  for (const key of NAME_FIELDS) entry[key] = toNameList(source[key]);
  for (const key of TEXT_FIELDS) entry[key] = toText(source[key]);
  return entry;
}

// 書誌データの「言語」欄に入りうる、和文として扱う言語の表記
const CJK_LANGUAGE_CODES = new Set([
  'ja', 'jpn', 'jp', 'japanese', '日本語',
  'zh', 'chi', 'zho', 'chinese', '中国語', '中文',
  'ko', 'kor', 'korean', '韓国語', '朝鮮語',
]);

function langFromHint(hint) {
  const code = toText(hint).toLowerCase().split(/[-_\s;,]/)[0];
  if (!code) return '';
  return CJK_LANGUAGE_CODES.has(code) ? 'cjk' : 'western';
}

/**
 * 和文か欧文かを判定する。
 * タイトルに漢字・かな・ハングルがあれば和文、文字があってそれらがなければ欧文。
 * タイトルで決まらないときは、言語欄 → 雑誌名・著者名の順に手がかりにする。
 */
export function detectLang(fields, languageHint = '') {
  const title = toText(fields?.title);
  if (hasCjk(title)) return 'cjk';
  if (/\p{L}/u.test(title)) return 'western';
  const fromHint = langFromHint(languageHint);
  if (fromHint) return fromHint;
  const other = [fields?.containerTitle, ...(fields?.authors ?? [])].map(toText).join(' ');
  if (hasCjk(other)) return 'cjk';
  if (/\p{L}/u.test(other)) return 'western';
  return 'cjk';
}
