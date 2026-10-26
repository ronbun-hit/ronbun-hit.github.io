// 文献データ（core/model.js）を参考文献の表記にする入口
//
// 和文（lang: 'cjk'）は書式プリセット A・B と細かい設定に従い、欧文（lang: 'western'）は Chicago 形式にする。

import { formatChicago } from './chicago.js';
import { formatJapanese } from './japanese.js';
import { plain, runsToHtml, runsToText } from './text.js';

/**
 * 1 件を整形する。
 * 戻り値：{ runs: ランの配列, text: プレーンテキスト, html: イタリックを <i> にした HTML }
 */
export function formatEntry(entry, settings) {
  const runs = entry.lang === 'western' ? formatChicago(entry) : [plain(formatJapanese(entry, settings))];
  const visible = runs.filter((run) => run.text !== '');
  return { runs: visible, text: runsToText(visible), html: runsToHtml(visible) };
}
