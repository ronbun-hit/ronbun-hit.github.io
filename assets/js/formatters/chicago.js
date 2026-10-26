// 欧文の参考文献表記（Chicago Manual of Style の注・参考文献方式＝Notes and Bibliography の参考文献形）
//
// 論文：Smith, John. “Title of Article.” Journal Title 12, no. 3 (2011): 1–20.
// 単行本：Carr, Edward Hallett. What Is History? London: Macmillan, 1961.
// 編著所収論文：Smith, John. “Chapter Title.” In Book Title, edited by Jane Doe, 1–20. Oxford: Oxford University Press, 2011.
// 雑誌名・書名はイタリック。第18版に合わせて、出版地は入力があるときだけ書き、
// 著者が 7 人以上なら最初の 3 人＋et al. にする（names.js）。所収論文の頁も入力があるときだけ書く。

import { joinWesternNames } from './names.js';
import { formatPageRange, italic, mergeRuns, plain, squash, toHalfWidthDigits, withPeriod } from './text.js';

/** 欧文タイトルの「Title : subtitle」を Chicago の「Title: subtitle」にする */
function westernTitle(value) {
  return squash(value).replace(/\s+([:;])\s*/g, '$1 ');
}

/** 引用符で囲むタイトル：中の二重引用符は一重引用符にし、終止符は引用符の内側に置く */
function quotedTitle(value) {
  const t = westernTitle(value)
    .replace(/"([^"]*)"/g, '‘$1’')
    .replace(/“([^”]*)”/g, '‘$1’');
  if (t === '') return '';
  return `“${withPeriod(t)}”`;
}

function number(value) {
  return toHalfWidthDigits(squash(value));
}

function publication(entry) {
  const place = squash(entry.place);
  const publisher = squash(entry.publisher);
  const where = place && publisher ? `${place}: ${publisher}` : publisher || place;
  return [where, number(entry.year) || 'n.d.'].filter(Boolean).join(', ');
}

/**
 * 文（ランの配列）を並べる。文末にピリオドがなければ足し、文の間は半角スペース。
 * terminated が true の文（引用符で終わるタイトルなど）にはピリオドを足さない。
 */
function assemble(sentences) {
  const runs = [];
  const list = sentences.filter((sentence) => sentence.runs.some((run) => run.text !== ''));
  list.forEach((sentence, index) => {
    runs.push(...sentence.runs);
    const text = sentence.runs.map((run) => run.text).join('');
    if (!sentence.terminated && !/[.?!…]$/.test(text)) runs.push(plain('.'));
    if (index < list.length - 1) runs.push(plain(' '));
  });
  return mergeRuns(runs);
}

function sentence(runs, terminated = false) {
  return { runs, terminated };
}

/** Chicago の参考文献表記をランの配列で返す */
export function formatChicago(entry) {
  const authors = joinWesternNames(entry.authors, { invertFirst: true });
  const editors = entry.editors ?? [];
  const translators = entry.translators ?? [];
  const title = squash(entry.title);
  const container = westernTitle(entry.containerTitle);
  const pages = squash(entry.pages) ? toHalfWidthDigits(formatPageRange(entry.pages, '–')) : '';
  const sentences = [];

  if (authors) {
    sentences.push(sentence([plain(authors)]));
  } else if (entry.kind === 'book' && editors.length > 0) {
    const label = editors.length > 1 ? 'eds.' : 'ed.';
    sentences.push(sentence([plain(`${joinWesternNames(editors, { invertFirst: true })}, ${label}`)]));
  }

  switch (entry.kind) {
    case 'book':
    case 'translation': {
      if (title) sentences.push(sentence([italic(westernTitle(title))]));
      if (authors && editors.length > 0) {
        sentences.push(sentence([plain(`Edited by ${joinWesternNames(editors)}`)]));
      }
      if (translators.length > 0) {
        sentences.push(sentence([plain(`Translated by ${joinWesternNames(translators)}`)]));
      }
      sentences.push(sentence([plain(publication(entry))]));
      break;
    }
    case 'chapter': {
      if (title) sentences.push(sentence([plain(quotedTitle(title))], true));
      const inRuns = [];
      if (container) {
        inRuns.push(plain('In '), italic(container));
        if (editors.length > 0) inRuns.push(plain(`, edited by ${joinWesternNames(editors)}`));
        if (pages) inRuns.push(plain(`, ${pages}`));
      }
      sentences.push(sentence(inRuns));
      sentences.push(sentence([plain(publication(entry))]));
      break;
    }
    case 'article':
    default: {
      if (title) sentences.push(sentence([plain(quotedTitle(title))], true));
      const volume = number(entry.volume);
      const issue = number(entry.issue);
      const year = number(entry.year);
      let detail = '';
      if (volume) detail += ` ${volume}`;
      if (issue) detail += `${volume || container ? ',' : ''} no. ${issue}`;
      if (year) detail += ` (${year})`;
      if (pages) detail += `: ${pages}`;
      const runs = [];
      if (container) runs.push(italic(container));
      runs.push(plain(container ? detail : detail.trim()));
      sentences.push(sentence(runs));
      break;
    }
  }

  return assemble(sentences);
}
