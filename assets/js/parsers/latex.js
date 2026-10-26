// BibTeX の値に含まれる LaTeX の記法を、ふつうの文字に戻す

import { hasCjk } from '../core/script.js';

// アクセント記号のコマンドと、対応する結合文字
const ACCENT_MARKS = {
  '`': '̀',
  "'": '́',
  '^': '̂',
  '~': '̃',
  '=': '̄',
  '.': '̇',
  '"': '̈',
  u: '̆',
  r: '̊',
  H: '̋',
  v: '̌',
  c: '̧',
  k: '̨',
  d: '̣',
  b: '̱',
  t: '͡',
};

// 引数をとらない文字のコマンド
const SYMBOLS = {
  ss: 'ß',
  ae: 'æ',
  AE: 'Æ',
  oe: 'œ',
  OE: 'Œ',
  o: 'ø',
  O: 'Ø',
  aa: 'å',
  AA: 'Å',
  l: 'ł',
  L: 'Ł',
  i: 'ı',
  j: 'ȷ',
  dh: 'ð',
  DH: 'Ð',
  th: 'þ',
  TH: 'Þ',
  ng: 'ŋ',
  NG: 'Ŋ',
  dj: 'đ',
  DJ: 'Đ',
  textendash: '–',
  textemdash: '—',
  textquoteleft: '‘',
  textquoteright: '’',
  textquotedblleft: '“',
  textquotedblright: '”',
  ldots: '…',
  dots: '…',
  textellipsis: '…',
  S: '§',
  P: '¶',
  copyright: '©',
  textsection: '§',
};

// \"u, \"{u}, \'{\i}, \c{c}, \v s など
const SYMBOL_ACCENT_RE = /\\([`'^~=."])\s*(?:\{\s*(\\?[A-Za-z]?)\s*\}|(\\?[A-Za-z]))/g;
const LETTER_ACCENT_RE = /\\([uvHcrkdbt])(?:\s*\{\s*(\\?[A-Za-z]?)\s*\}|\s+(\\?[A-Za-z]))/g;
const COMMAND_WITH_ARG_RE = /\\[A-Za-z]+\*?\s*\{([^{}]*)\}/g;

function compose(letter, mark) {
  const base = letter === '\\i' ? 'i' : letter === '\\j' ? 'j' : letter.replace('\\', '');
  if (!base) return '';
  return (base + ACCENT_MARKS[mark]).normalize('NFC');
}

/**
 * LaTeX の記法をふつうの文字にする。
 * CiNii の和文データは記法を含まない生の文字列のことが多いので、
 * 漢字・かな・ハングルを含む値では「--」や「~」を変換しない（元の表記を守る）。
 */
export function decodeLatex(input) {
  let s = String(input ?? '');
  if (s === '') return '';
  const cjk = hasCjk(s);

  s = s.replace(/\\\\/g, ' ');
  s = s.replace(SYMBOL_ACCENT_RE, (_, mark, braced, bare) => compose(braced ?? bare ?? '', mark));
  s = s.replace(LETTER_ACCENT_RE, (_, mark, braced, bare) => compose(braced ?? bare ?? '', mark));
  s = s.replace(/\\([A-Za-z]+)(?![A-Za-z])\s?(?:\{\})?/g, (match, name) =>
    Object.hasOwn(SYMBOLS, name) ? SYMBOLS[name] : match,
  );

  // \textit{...} などは中身だけ残す（入れ子に備えて繰り返す）
  let previous;
  do {
    previous = s;
    s = s.replace(COMMAND_WITH_ARG_RE, '$1');
  } while (s !== previous);

  s = s.replace(/\\([&%$#_])/g, '$1');
  s = s.replace(/\\\{/g, '').replace(/\\\}/g, '');
  s = s.replace(/[{}]/g, '');
  s = s.replace(//g, '{').replace(//g, '}');

  if (!cjk) {
    s = s.replace(/---/g, '—').replace(/--/g, '–').replace(/~/g, ' ');
  }

  // 残った未知のコマンドは、バックスラッシュだけ外す
  s = s.replace(/\\([A-Za-z]+)/g, '$1');

  // 全体を NFC 正規化すると旧字体の互換漢字まで置き換わるので、アクセント合成部分（compose）だけで正規化する
  return s.replace(/[ \t\r\n\f\v]+/g, ' ').trim();
}
