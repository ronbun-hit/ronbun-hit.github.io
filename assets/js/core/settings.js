// 表示・書式の設定と、その既定値

export const PRESETS = ['A', 'B'];
export const DIGIT_MODES = ['half', 'full'];
export const PAGE_DASHES = ['–', '-', '～'];
export const SUBTITLE_MODES = ['dash', 'dash-enclose', 'colon', 'keep'];
export const SORT_MODES = ['input', 'author'];

export const DEFAULT_SETTINGS = Object.freeze({
  preset: 'A', // 和文の書式プリセット
  digits: 'half', // 和文の巻号・年・頁の数字：'half'（半角） | 'full'（全角）
  pageDash: '–', // 和文の頁範囲の記号
  period: true, // 和文の末尾に句点「。」を付けるか
  subtitle: 'dash', // 和文の「主題 : 副題」の区切りをどう書くか
  sort: 'input', // 'input'（入力順） | 'author'（和文→欧文、それぞれ著者名順）
});

function pick(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback;
}

/** 保存データなど、形の保証がない値から正しい設定を作る */
export function normalizeSettings(value) {
  const s = value && typeof value === 'object' ? value : {};
  return {
    preset: pick(s.preset, PRESETS, DEFAULT_SETTINGS.preset),
    digits: pick(s.digits, DIGIT_MODES, DEFAULT_SETTINGS.digits),
    pageDash: pick(s.pageDash, PAGE_DASHES, DEFAULT_SETTINGS.pageDash),
    period: typeof s.period === 'boolean' ? s.period : DEFAULT_SETTINGS.period,
    subtitle: pick(s.subtitle, SUBTITLE_MODES, DEFAULT_SETTINGS.subtitle),
    sort: pick(s.sort, SORT_MODES, DEFAULT_SETTINGS.sort),
  };
}
