// 読み取ったデータ（BibTeX・RIS、将来は CiNii API など）を共通モデルに整える
//
// 各パーサーは、形式ごとの項目を次の「生データ」にそろえてから normalizeImported に渡す。
// {
//   kind, authors, editors, translators,          // 名前は文字列の配列
//   title, containerTitle, volume, issue, year, pages,
//   publisher, place, doi, url, languageHint, source
// }
// ここでは書誌データ特有の書き方（「山田太郎 編」「東京 : 吉川弘文館」「書名 = English title」など）を整理する。
// 表記の組み立て（「山田, 太郎」→「山田太郎」など）は formatters/ の仕事なので、ここではしない。

import { createEntry, detectLang } from '../core/model.js';
import { hasCjk } from '../core/script.js';

const HTML_ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

/** HTML タグや文字参照を取り除き、半角の空白類を 1 つにまとめる（全角スペースは残す） */
export function cleanText(value) {
  let s = String(value ?? '');
  s = s.replace(/<\/?[A-Za-z][A-Za-z0-9]*(?:\s[^<>]*)?\/?>/g, '');
  s = s.replace(/&(#[xX][0-9A-Fa-f]+|#\d+|[A-Za-z]+);/g, (match, code) => {
    if (code[0] === '#') {
      const n = code[1] === 'x' || code[1] === 'X' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isInteger(n) && n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : match;
    }
    return HTML_ENTITIES[code.toLowerCase()] ?? match;
  });
  return s.replace(/[ \t\r\n\f\v ]+/g, ' ').replace(/^[ 　]+|[ 　]+$/g, '');
}

function toHalfWidthDigits(s) {
  return s.replace(/[０-９]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 0xfee0));
}

// ---- 名前 ----------------------------------------------------------------

// [役割, 名前に役割の語を残すか]
// 「編著」「監修」「監訳」などは表記にもそのまま必要なので、名前の側に残す。
const ROLES = new Map([
  ['著', ['author', false]],
  ['著者', ['author', false]],
  ['共著', ['author', false]],
  ['原著', ['author', false]],
  ['原作', ['author', false]],
  ['作', ['author', false]],
  ['撰', ['author', false]],
  ['述', ['author', false]],
  ['編', ['editor', false]],
  ['編者', ['editor', false]],
  ['編集', ['editor', false]],
  ['共編', ['editor', false]],
  ['編纂', ['editor', false]],
  ['編著', ['keep', true]],
  ['監修', ['keep', true]],
  ['責任編集', ['keep', true]],
  ['編訳', ['keep', true]],
  ['訳', ['translator', false]],
  ['訳者', ['translator', false]],
  ['翻訳', ['translator', false]],
  ['共訳', ['translator', false]],
  ['監訳', ['translator', true]],
  ['訳注', ['translator', true]],
  ['訳註', ['translator', true]],
  ['訳・注', ['translator', true]],
  ['訳・解説', ['translator', true]],
]);

// 空白なしで名前の直後に付いていても役割と判断してよい語（人名の末尾に来にくいものだけ。長い順）
const ATTACHED_ROLES = [
  '訳・解説', '責任編集', '訳・注', '編著', '監修', '編訳', '監訳', '訳注', '訳註',
  '著者', '共著', '編者', '編集', '共編', '訳者', '翻訳', '共訳', '著', '編', '訳',
];

const BRACKETED_ROLE_RE = /[ 　]*[\[［(（〔]\s*([^\]］)）〕]{1,8}?)\s*[\]］)）〕]$/;
const SPACED_ROLE_RE = /^(.*\S)[ 　]+(\S+)$/;
// 生没年（「, 1950-」「(1886-1944)」など）
const LIFE_DATES_RE = /[,，\s]*[(（]?\s*(?:\d{3,4}\s*[-–?]\s*(?:\d{3,4})?|\d{3,4})\s*[)）]?\s*$/;

function withRole(name, roleWord) {
  const [role, keep] = ROLES.get(roleWord);
  return { name: keep ? `${name.trim()}${roleWord}` : name.trim(), role };
}

/** 名前の末尾の役割表示（「著」「編」「訳」など）を外し、どの役割かを返す */
export function splitRole(rawName) {
  const s = rawName.trim();
  let m = BRACKETED_ROLE_RE.exec(s);
  if (m && ROLES.has(m[1].trim()) && m.index > 0) return withRole(s.slice(0, m.index), m[1].trim());
  m = SPACED_ROLE_RE.exec(s);
  if (m && ROLES.has(m[2]) && hasCjk(m[1])) return withRole(m[1], m[2]);
  for (const word of ATTACHED_ROLES) {
    if (s.length > word.length && s.endsWith(word)) {
      const rest = s.slice(0, -word.length);
      if (hasCjk(rest.slice(-1))) return withRole(rest, word);
    }
  }
  return { name: s, role: 'author' };
}

function cleanName(rawName) {
  let s = cleanText(rawName).replace(LIFE_DATES_RE, '');
  const { name, role } = splitRole(s);
  s = name.replace(LIFE_DATES_RE, '').replace(/[,，]\s*$/, '').trim();
  return { name: s, role };
}

/** 著者・編者・訳者を、役割表示に従って振り分け直す */
function sortPeople(raw) {
  const people = { authors: [], editors: [], translators: [] };
  const sources = [
    ['authors', raw.authors],
    ['editors', raw.editors],
    ['translators', raw.translators],
  ];
  for (const [field, list] of sources) {
    for (const item of list ?? []) {
      // 「山田太郎 著 ; 鈴木一郎 訳」のように 1 つの値に複数人が入っている場合に備える
      for (const piece of String(item ?? '').split(/[;；]/)) {
        const { name, role } = cleanName(piece);
        if (!name) continue;
        const target =
          role === 'editor' ? 'editors' : role === 'translator' ? 'translators' : field;
        people[target].push(name);
      }
    }
  }
  for (const key of Object.keys(people)) {
    const seen = new Set();
    people[key] = people[key].filter((name) => {
      const k = name.replace(/[\s　]/g, '');
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }
  return people;
}

// ---- タイトルなど ----------------------------------------------------------

/**
 * 和文のタイトルから、書誌データ特有の付け足しを取り除く。
 * 「書名 / 山田太郎著」の責任表示、「書名 = English title」の並列タイトル、末尾の区切り記号。
 */
export function cleanTitle(value) {
  let t = cleanText(value);
  if (!hasCjk(t)) return t;
  const responsibility = /\s+\/\s+(.+)$/.exec(t);
  if (responsibility && /(著|編|訳|編著|監修|編集|ほか|他)\s*$/.test(responsibility[1])) {
    t = t.slice(0, responsibility.index);
  }
  const parallel = /^(.*?\S)\s+=\s+(.+)$/.exec(t);
  if (parallel && hasCjk(parallel[1]) && !hasCjk(parallel[2])) t = parallel[1];
  return t.replace(/\s+[/:;=]\s*$/, '').trim();
}

export function cleanPages(value) {
  let s = toHalfWidthDigits(cleanText(value));
  s = s.replace(/^(?:pp?\.?|ページ|頁)\s*/i, '').replace(/\s*(?:頁|ページ|pp?\.?)$/i, '');
  return s.replace(/\s*(?:-{1,3}|[‐‑‒–—―−－~～〜])\s*/g, '-');
}

export function cleanYear(value) {
  const s = toHalfWidthDigits(cleanText(value));
  const m = /\d{4}/.exec(s);
  return m ? m[0] : s;
}

function cleanNumberLike(value) {
  return cleanText(value).replace(/^(?:vol(?:ume)?|no|num(?:ber)?|issue)\.?\s*/i, '');
}

function stripBrackets(value) {
  return value.replace(/^[[［]\s*(.*?)\s*[\]］]$/, '$1').trim();
}

/** 「東京 : 吉川弘文館」のように出版地と出版社がまとめて入っていたら分ける */
export function splitPublisher(publisher, place) {
  let pub = cleanText(publisher);
  let where = cleanText(place);
  if (!where) {
    const m = /^([^:：]{1,40}?)\s*[:：]\s+(.+)$/.exec(pub) || /^([^:：]{1,40}?)\s+[:：]\s*(.+)$/.exec(pub);
    if (m) {
      where = m[1];
      pub = m[2].trim();
    }
  }
  return { publisher: pub, place: stripBrackets(where) };
}

// ---- まとめ -----------------------------------------------------------------

/** 生データを共通モデルにする。タイトルも著者・編者もないものは null を返す */
export function normalizeImported(raw) {
  const people = sortPeople(raw);
  const title = cleanTitle(raw.title);
  const containerTitle = cleanTitle(raw.containerTitle);
  if (!title && people.authors.length === 0 && people.editors.length === 0) return null;

  const lang = detectLang({ title, containerTitle, authors: people.authors }, raw.languageHint);
  let kind = raw.kind;
  if (kind === 'book' && lang === 'cjk' && people.translators.length > 0) kind = 'translation';
  if (kind === 'translation' && lang === 'western') kind = 'book';

  const { publisher, place } = splitPublisher(raw.publisher, raw.place);

  return createEntry({
    kind,
    lang,
    ...people,
    title,
    containerTitle: kind === 'article' || kind === 'chapter' ? containerTitle : '',
    volume: cleanNumberLike(raw.volume),
    issue: cleanNumberLike(raw.issue),
    year: cleanYear(raw.year),
    pages: cleanPages(raw.pages),
    publisher,
    place,
    doi: cleanText(raw.doi),
    url: cleanText(raw.url),
    source: raw.source,
  });
}
