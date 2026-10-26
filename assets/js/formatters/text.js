// 整形で共通に使う文字列処理と、「ラン」（書式付きの文字列片）の扱い
//
// 整形結果は [{ text, italic }] の配列（ラン）で表す。
// 欧文の書名・雑誌名のイタリックを、画面表示（HTML）とコピー（リッチテキスト）に引き継ぐため。

export function toFullWidthDigits(value) {
  return String(value ?? '').replace(/[0-9]/g, (d) => String.fromCharCode(d.charCodeAt(0) + 0xfee0));
}

export function toHalfWidthDigits(value) {
  return String(value ?? '').replace(/[０-９]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 0xfee0));
}

/** 前後の空白を除き、半角の空白類を 1 つにまとめる */
export function squash(value) {
  return String(value ?? '')
    .replace(/[ \t\r\n\f\v ]+/g, ' ')
    .replace(/^[ 　]+|[ 　]+$/g, '');
}

// 頁範囲の区切りとして受け付ける記号（ハイフン類・ダッシュ類・波ダッシュ類）
const RANGE_SEPARATOR_RE = /\s*(?:-{1,3}|[‐‑‒–—―−－~～〜])\s*/g;

/** 頁の値から「pp.」「頁」などを外す */
export function stripPageLabels(value) {
  return squash(value)
    .replace(/^(?:pp?\.?|ページ|頁)\s*/i, '')
    .replace(/\s*(?:頁|ページ|pp?\.?)$/i, '');
}

/** 頁範囲の区切り記号を dash にそろえる（"1-20" → "1–20"） */
export function formatPageRange(value, dash) {
  return stripPageLabels(value).replace(RANGE_SEPARATOR_RE, dash);
}

/** 末尾が終止符（. ? !）で終わっていなければ、ピリオドを付ける */
export function withPeriod(value) {
  const s = squash(value);
  if (s === '') return '';
  return /[.?!…]["”’)）]*$/.test(s) ? s : `${s}.`;
}

// ---- ラン ---------------------------------------------------------------------

export function plain(text) {
  return { text: String(text), italic: false };
}

export function italic(text) {
  return { text: String(text), italic: true };
}

/** 空のランを除き、同じ書式の隣り合うランをつなげる */
export function mergeRuns(runs) {
  const out = [];
  for (const run of runs) {
    if (!run || run.text === '') continue;
    const last = out[out.length - 1];
    if (last && last.italic === run.italic) last.text += run.text;
    else out.push({ text: run.text, italic: run.italic });
  }
  return out;
}

export function runsToText(runs) {
  return runs.map((run) => run.text).join('');
}

export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function runsToHtml(runs) {
  return runs.map((run) => (run.italic ? `<i>${escapeHtml(run.text)}</i>` : escapeHtml(run.text))).join('');
}
