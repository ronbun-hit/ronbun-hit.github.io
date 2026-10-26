// 和文（日本語・中国語・韓国語）の参考文献表記
//
// プリセット A：山田太郎「論文名」『史学雑誌』120編3号、2011年、1–20頁。
//               山田太郎『書名』吉川弘文館、2011年。
//               山田太郎「論文名」鈴木一郎編『書名』吉川弘文館、2011年、1–20頁。
// プリセット B：山田太郎「論文名」（『史学雑誌』120編3号、2011年）。
//               山田太郎『書名』（吉川弘文館、2011年）。
//               山田太郎「論文名」（鈴木一郎編『書名』吉川弘文館、2011年）。
// 翻訳書（両プリセット共通の形）：マルク・ブロック著、松村剛訳『書名』岩波書店、2004年。
//                               （B では出版事項を括弧に入れる。原著情報は末尾に「（原著：…）」）

import { normalizeSettings } from '../core/settings.js';
import { joinCjkNames } from './names.js';
import { formatPageRange, squash, toFullWidthDigits, toHalfWidthDigits } from './text.js';

// 巻を「巻」以外の単位で数える雑誌（数字だけの巻に付ける単位）
const VOLUME_UNITS = new Map([
  ['史学雑誌', '編'],
  ['史學雜誌', '編'],
]);

// すでに役割の語で終わっている名前には、「編」「訳」を重ねて付けない
const EDITOR_ROLE_RE = /(編|編著|編集|監修|編纂|編訳|責任編集)$/;
const TRANSLATOR_ROLE_RE = /(訳|訳注|訳註|訳・注|訳・註|訳・解説|訳解)$/;

// 数字（と区切り）だけの巻・号には単位を補う。「3・4」のような合併号も含む
const NUMBER_LIKE_RE = /^[0-9０-９]+(?:\s*[・\-–/／,，、=＝]\s*[0-9０-９]+)*$/;

// 書誌データでの「主題 : 副題」の区切り（前後どちらかに空白があるコロン）
const SUBTITLE_SEPARATOR_RE = /\s+[:：]\s*|\s*[:：]\s+/;

function join(parts, separator = '、') {
  return parts.filter((part) => part !== '').join(separator);
}

function paren(content) {
  return content === '' ? '' : `（${content}）`;
}

/** 論文名を「」で囲む。中にある「」は『』にする */
function kagi(title) {
  let t = squash(title);
  if (t === '') return '';
  if (/^「[^「」]*」$/.test(t)) t = t.slice(1, -1);
  return `「${t.replace(/「/g, '『').replace(/」/g, '』')}」`;
}

/** 書名・雑誌名を『』で囲む。中にある『』は「」にする */
function nijuKagi(title) {
  let t = squash(title);
  if (t === '') return '';
  if (/^『[^『』]*』$/.test(t)) t = t.slice(1, -1);
  return `『${t.replace(/『/g, '「').replace(/』/g, '」')}』`;
}

/** 「主題 : 副題」の区切りを、設定に合わせて書き換える */
export function convertSubtitle(title, mode) {
  const t = squash(title);
  if (mode === 'keep' || !SUBTITLE_SEPARATOR_RE.test(t)) return t;
  const [main, ...subs] = t.split(SUBTITLE_SEPARATOR_RE).map((part) => part.trim()).filter(Boolean);
  if (subs.length === 0) return main ?? '';
  if (mode === 'colon') return [main, ...subs].join('：');
  if (mode === 'dash-enclose') return `${main}――${subs.join('――')}――`;
  return [main, ...subs].join('――');
}

function withRole(names, role, roleRe) {
  if (names === '') return '';
  return roleRe.test(names) ? names : `${names}${role}`;
}

function volumeUnit(journal) {
  return VOLUME_UNITS.get(squash(journal).replace(/[\s　]/g, '')) ?? '巻';
}

function withUnit(value, unit) {
  const v = squash(value);
  if (v === '') return '';
  return NUMBER_LIKE_RE.test(v) ? `${v}${unit}` : v;
}

/** 和文の参考文献表記を文字列で返す */
export function formatJapanese(entry, settings) {
  const s = normalizeSettings(settings);
  const digits = (value) =>
    s.digits === 'full' ? toFullWidthDigits(toHalfWidthDigits(value)) : toHalfWidthDigits(value);

  const title = convertSubtitle(entry.title, s.subtitle);
  const container = convertSubtitle(entry.containerTitle, s.subtitle);
  const publisher = squash(entry.publisher);

  const yearRaw = digits(squash(entry.year));
  const year = yearRaw === '' ? '' : /[0-9０-９]$/.test(yearRaw) ? `${yearRaw}年` : yearRaw;

  let pages = '';
  if (squash(entry.pages) !== '') {
    const dash = s.digits === 'full' && s.pageDash === '-' ? '－' : s.pageDash;
    pages = `${digits(formatPageRange(entry.pages, dash))}頁`;
  }

  const volumeIssue = digits(
    withUnit(entry.volume, volumeUnit(entry.containerTitle)) + withUnit(entry.issue, '号'),
  );

  const authors = joinCjkNames(entry.authors);
  const editors = withRole(joinCjkNames(entry.editors), '編', EDITOR_ROLE_RE);
  const translators = withRole(joinCjkNames(entry.translators), '訳', TRANSLATOR_ROLE_RE);
  const isB = s.preset === 'B';

  let body;
  switch (entry.kind) {
    case 'book': {
      const who = authors && editors ? `${authors}著、${editors}` : authors || editors;
      const imprint = join([publisher, year]);
      body = who + nijuKagi(title) + (isB ? paren(imprint) : imprint);
      break;
    }
    case 'translation': {
      const who = join([authors ? `${authors}著` : '', translators]);
      const imprint = join([publisher, year]);
      body = who + nijuKagi(title) + (isB ? paren(imprint) : imprint);
      const original = squash(entry.originalInfo);
      if (original) body += `（原著：${original}）`;
      break;
    }
    case 'chapter': {
      const book = editors + nijuKagi(container);
      body =
        authors +
        kagi(title) +
        (isB ? paren(book + join([publisher, year])) : book + join([publisher, year, pages]));
      break;
    }
    case 'article':
    default: {
      const journal = nijuKagi(container);
      body =
        authors +
        kagi(title) +
        (isB ? paren(journal + join([volumeIssue, year])) : journal + join([volumeIssue, year, pages]));
      break;
    }
  }

  if (body === '') return '';
  return s.period && !/[。．]$/.test(body) ? `${body}。` : body;
}
