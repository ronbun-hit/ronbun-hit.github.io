// 人名の表記
//
// 文献データでは、名前を「山田, 太郎」「Carr, Edward Hallett」のような文字列で持つ。
// カンマの前が姓、後ろが名。カンマがなければ、そのままの表記として扱う。
// 全体を {…} で囲んだ名前（{United Nations} など）は団体名とみなし、姓・名に分けない。

import { hasCjk, hasLatin, isKatakanaName } from '../core/script.js';
import { squash } from './text.js';

const COMMA_RE = /[,，]/;

/** 名前を { family, given, suffix } か { literal } に分ける */
export function parseName(raw) {
  const s = squash(raw);
  if (s === '') return null;
  if (/^\{[^{}]*\}$/.test(s)) return { literal: squash(s.slice(1, -1)), protected: true };
  const index = s.search(COMMA_RE);
  if (index > 0) {
    const family = s.slice(0, index).trim();
    const rest = s.slice(index + 1).trim();
    if (rest === '') return { literal: family };
    const index2 = rest.search(COMMA_RE);
    if (index2 > 0) {
      return { family, given: rest.slice(0, index2).trim(), suffix: rest.slice(index2 + 1).trim() };
    }
    return { family, given: rest };
  }
  return { literal: s };
}

function cjkLiteral(value) {
  if (!hasCjk(value) || hasLatin(value)) return value;
  if (isKatakanaName(value)) return value.replace(/[ 　]+/g, '・');
  return value.replace(/[ 　]+/g, '');
}

/**
 * 和文の文献での人名表記。
 * - 漢字・かな・ハングルの名前は、姓と名を詰めて書く（「山田, 太郎」→「山田太郎」）
 * - 姓・名ともカタカナなら、名・姓の順に中黒でつなぐ（「ブロック, マルク」→「マルク・ブロック」）
 * - 欧文（ラテン文字）の名前は、入力のまま
 */
export function formatCjkName(raw) {
  const name = parseName(raw);
  if (!name) return '';
  if (name.literal !== undefined) return cjkLiteral(name.literal);
  const { family, given } = name;
  if (isKatakanaName(family) && isKatakanaName(given)) {
    return `${cjkLiteral(given)}・${cjkLiteral(family)}`;
  }
  if (hasCjk(family) && hasCjk(given) && !hasLatin(family + given) && !name.suffix) {
    return `${family}${given}`.replace(/[ 　]+/g, '');
  }
  return squash(raw);
}

/**
 * 和文の文献での複数人の表記。ふつうは中黒「・」でつなぐ。
 * 名前自体に中黒がある（カタカナ名）か欧文の名前が含まれるときは、区切りが紛れないよう読点「、」にする。
 */
export function joinCjkNames(list) {
  const names = (list ?? []).map(formatCjkName).filter((n) => n !== '');
  const separator = names.some((n) => /[・･]/.test(n) || hasLatin(n)) ? '、' : '・';
  return names.join(separator);
}

/** 欧文の文献での名前の要素。カンマのない名前は、最後の語を姓とみなす */
function westernParts(raw) {
  const name = parseName(raw);
  if (!name) return null;
  if (name.literal !== undefined) {
    if (name.protected) return { literal: name.literal };
    if (hasCjk(name.literal)) return { literal: formatCjkName(name.literal) };
    const tokens = name.literal.split(' ');
    if (tokens.length < 2) return { literal: name.literal };
    return { family: tokens[tokens.length - 1], given: tokens.slice(0, -1).join(' ') };
  }
  if (hasCjk(name.family) || hasCjk(name.given)) return { literal: formatCjkName(raw) };
  return name;
}

/**
 * 欧文（Chicago）での人名表記。
 * inverted が true なら「姓, 名」（参考文献の筆頭著者）、false なら「名 姓」。
 */
export function formatWesternName(raw, inverted = false) {
  const p = westernParts(raw);
  if (!p) return '';
  if (p.literal !== undefined) return p.literal;
  if (inverted) return [p.family, p.given, p.suffix].filter(Boolean).join(', ');
  return [p.given, p.family, p.suffix].filter(Boolean).join(' ');
}

// Chicago 第18版：参考文献の著者が 7 人以上なら、最初の 3 人の後に et al. を付ける
const ET_AL_THRESHOLD = 7;
const ET_AL_SHOWN = 3;

/**
 * Chicago の参考文献での複数人の表記。
 * 筆頭者だけ「姓, 名」にする場合（invertFirst）：Carr, Edward Hallett, and John Smith
 * そうでない場合（edited by など）：Jane Doe and John Smith / A, B, and C
 */
export function joinWesternNames(list, { invertFirst = false } = {}) {
  const names = (list ?? [])
    .map((raw, i) => formatWesternName(raw, invertFirst && i === 0))
    .filter((n) => n !== '');
  if (invertFirst && names.length >= ET_AL_THRESHOLD) {
    return `${names.slice(0, ET_AL_SHOWN).join(', ')}, et al.`;
  }
  if (names.length <= 1) return names[0] ?? '';
  if (names.length === 2) {
    const firstIsInverted = invertFirst && names[0].includes(',');
    return firstIsInverted ? `${names[0]}, and ${names[1]}` : `${names[0]} and ${names[1]}`;
  }
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
}

/** 並べ替え用：欧文の名前の「姓 名」 */
export function westernSortKey(raw) {
  const p = westernParts(raw);
  if (!p) return '';
  if (p.literal !== undefined) return p.literal;
  return [p.family, p.given].filter(Boolean).join(' ');
}
