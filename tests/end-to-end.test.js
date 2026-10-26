// 貼り付け → 読み取り → 整形 → 並べ替え の通しテスト（CiNii 想定サンプルを使う）

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { sortEntries } from '../assets/js/core/sort.js';
import { formatEntry } from '../assets/js/formatters/index.js';
import { parseReferences } from '../assets/js/parsers/index.js';
import { fixture } from './helpers.js';

const format = (entries, settings = {}) => entries.map((e) => formatEntry(e, settings).text);

describe('BibTeX サンプルから参考文献リストを作る', () => {
  const { entries, errors } = parseReferences(fixture('cinii-sample.bib'));

  test('プリセット A', () => {
    assert.deepEqual(errors, []);
    assert.deepEqual(format(entries, { preset: 'A' }), [
      '山田太郎・鈴木一郎「近世村落における年貢収取と村請制――信濃国佐久郡を事例に」『史学雑誌』120編3号、2011年、1–20頁。',
      '佐藤花子『中世荘園制の展開』吉川弘文館、2015年。',
      '鈴木一郎編『日本近代史の再検討』東京大学出版会、2018年。',
      '田中次郎「明治初期の地租改正と村落」鈴木一郎編『日本近代史の再検討』東京大学出版会、2018年、45–78頁。',
      'ポール・デュラン著、高橋三郎訳『近代ヨーロッパの農村社会』岩波書店、2004年。',
      '李大明「清代江南的市镇与地方社会」『历史研究』4号、2010年、12–30頁。',
      '김민수「조선 후기 향촌 사회의 변동」『역사학보』215巻、2012年、101–130頁。',
      'Smith, John, and Jane Doe. “Village Society in Early Modern Japan.” Journal of Asian Studies 72, no. 2 (2013): 301–325.',
      'Müller, Hans. Agrarian Change in Tokugawa Japan: A Regional Study. Cambridge: Cambridge University Press, 2016.',
      '伊藤五郎「戦後歴史学と民衆史研究」『歴史学研究』1000号、2020年、2–15頁。',
    ]);
  });

  test('プリセット B', () => {
    assert.deepEqual(format(entries, { preset: 'B' }).slice(0, 5), [
      '山田太郎・鈴木一郎「近世村落における年貢収取と村請制――信濃国佐久郡を事例に」（『史学雑誌』120編3号、2011年）。',
      '佐藤花子『中世荘園制の展開』（吉川弘文館、2015年）。',
      '鈴木一郎編『日本近代史の再検討』（東京大学出版会、2018年）。',
      '田中次郎「明治初期の地租改正と村落」（鈴木一郎編『日本近代史の再検討』東京大学出版会、2018年）。',
      'ポール・デュラン著、高橋三郎訳『近代ヨーロッパの農村社会』（岩波書店、2004年）。',
    ]);
  });

  test('全角数字・波ダッシュ・句点なし', () => {
    const [first] = format(entries, { digits: 'full', pageDash: '～', period: false, subtitle: 'colon' });
    assert.equal(
      first,
      '山田太郎・鈴木一郎「近世村落における年貢収取と村請制：信濃国佐久郡を事例に」『史学雑誌』１２０編３号、２０１１年、１～２０頁',
    );
  });

  test('和文 → 欧文、それぞれ著者名順', () => {
    const sorted = format(sortEntries(entries, 'author'));
    // 和文（カタカナ名が先頭、漢字は JIS 順、ハングルは最後）→ 欧文（姓のアルファベット順）
    const expectedStarts = ['ポール・デュラン', '伊藤五郎', '佐藤花子', '山田太郎', '田中次郎', '李大明', '鈴木一郎', '김민수', 'Müller', 'Smith'];
    assert.equal(sorted.length, expectedStarts.length);
    sorted.forEach((text, i) => assert.ok(text.startsWith(expectedStarts[i]), `${i}: ${text}`));
  });
});

describe('RIS サンプルから参考文献リストを作る', () => {
  const { entries, errors } = parseReferences(fixture('cinii-sample.ris'));

  test('プリセット A', () => {
    assert.deepEqual(errors, []);
    assert.deepEqual(format(entries), [
      '山田太郎・鈴木一郎「近世村落における年貢収取と村請制――信濃国佐久郡を事例に」『史学雑誌』120編3号、2011年、1–20頁。',
      '佐藤花子『中世荘園制の展開』吉川弘文館、2015年。',
      '田中次郎「明治初期の地租改正と村落」鈴木一郎編『日本近代史の再検討』東京大学出版会、2018年、45–78頁。',
      'ポール・デュラン著、高橋三郎訳『近代ヨーロッパの農村社会』岩波書店、2004年。',
      '김민수「조선 후기 향촌 사회의 변동」『역사학보』215巻、2012年、101–130頁。',
      'Smith, John, and Jane Doe. “Village Society in Early Modern Japan.” Journal of Asian Studies 72, no. 2 (2013): 301–325.',
      'Brown, Emily, ed. Rethinking Meiji Japan. Honolulu: University of Hawai‘i Press, 2019.',
    ]);
  });

  test('欧文の書名・雑誌名は HTML ではイタリック', () => {
    const html = entries.map((e) => formatEntry(e, {}).html);
    assert.match(html[5], /<i>Journal of Asian Studies<\/i>/);
    assert.match(html[6], /<i>Rethinking Meiji Japan<\/i>/);
    assert.doesNotMatch(html[0], /<i>/);
  });
});
