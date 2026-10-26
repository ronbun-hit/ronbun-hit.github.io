import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { convertSubtitle, formatJapanese } from '../assets/js/formatters/japanese.js';
import { entry } from './helpers.js';

const article = entry({
  kind: 'article',
  lang: 'cjk',
  authors: ['山田, 太郎'],
  title: '論文名',
  containerTitle: '史学雑誌',
  volume: '120',
  issue: '3',
  year: '2011',
  pages: '1-20',
});

const book = entry({
  kind: 'book',
  lang: 'cjk',
  authors: ['山田, 太郎'],
  title: '書名',
  publisher: '吉川弘文館',
  year: '2011',
});

const chapter = entry({
  kind: 'chapter',
  lang: 'cjk',
  authors: ['山田, 太郎'],
  title: '論文名',
  editors: ['鈴木, 一郎'],
  containerTitle: '書名',
  publisher: '吉川弘文館',
  year: '2011',
  pages: '1-20',
});

const translation = entry({
  kind: 'translation',
  lang: 'cjk',
  authors: ['ブロック, マルク'],
  translators: ['松村, 剛'],
  title: '歴史のための弁明',
  publisher: '岩波書店',
  year: '2004',
});

describe('プリセット A（依頼の例と完全に一致する）', () => {
  test('論文', () => {
    assert.equal(formatJapanese(article, { preset: 'A' }), '山田太郎「論文名」『史学雑誌』120編3号、2011年、1–20頁。');
  });
  test('単行本', () => {
    assert.equal(formatJapanese(book, { preset: 'A' }), '山田太郎『書名』吉川弘文館、2011年。');
  });
  test('編著所収論文', () => {
    assert.equal(
      formatJapanese(chapter, { preset: 'A' }),
      '山田太郎「論文名」鈴木一郎編『書名』吉川弘文館、2011年、1–20頁。',
    );
  });
  test('翻訳書', () => {
    assert.equal(formatJapanese(translation, { preset: 'A' }), 'マルク・ブロック著、松村剛訳『歴史のための弁明』岩波書店、2004年。');
  });
  test('設定を省略すると A になる', () => {
    assert.equal(formatJapanese(article), '山田太郎「論文名」『史学雑誌』120編3号、2011年、1–20頁。');
  });
});

describe('プリセット B（依頼の例と完全に一致する）', () => {
  test('論文', () => {
    assert.equal(formatJapanese(article, { preset: 'B' }), '山田太郎「論文名」（『史学雑誌』120編3号、2011年）。');
  });
  test('単行本', () => {
    assert.equal(formatJapanese(book, { preset: 'B' }), '山田太郎『書名』（吉川弘文館、2011年）。');
  });
  test('編著所収論文', () => {
    assert.equal(formatJapanese(chapter, { preset: 'B' }), '山田太郎「論文名」（鈴木一郎編『書名』吉川弘文館、2011年）。');
  });
  test('翻訳書', () => {
    assert.equal(formatJapanese(translation, { preset: 'B' }), 'マルク・ブロック著、松村剛訳『歴史のための弁明』（岩波書店、2004年）。');
  });
  test('翻訳書の原著情報は末尾に付く', () => {
    const withOriginal = { ...translation, originalInfo: "Apologie pour l'histoire, 1949" };
    assert.equal(
      formatJapanese(withOriginal, { preset: 'A' }),
      "マルク・ブロック著、松村剛訳『歴史のための弁明』岩波書店、2004年（原著：Apologie pour l'histoire, 1949）。",
    );
    assert.equal(
      formatJapanese(withOriginal, { preset: 'B' }),
      "マルク・ブロック著、松村剛訳『歴史のための弁明』（岩波書店、2004年）（原著：Apologie pour l'histoire, 1949）。",
    );
  });
});

describe('細かい設定', () => {
  test('数字を全角にする（巻号・年・頁）', () => {
    assert.equal(
      formatJapanese(article, { digits: 'full' }),
      '山田太郎「論文名」『史学雑誌』１２０編３号、２０１１年、１–２０頁。',
    );
  });
  test('全角のときハイフンは全角ハイフンにする', () => {
    assert.equal(
      formatJapanese(article, { digits: 'full', pageDash: '-' }),
      '山田太郎「論文名」『史学雑誌』１２０編３号、２０１１年、１－２０頁。',
    );
  });
  test('全角で入力された数字も半角設定なら半角にそろえる', () => {
    const fullWidth = { ...article, volume: '１２０', issue: '３', year: '２０１１', pages: '１－２０' };
    assert.equal(formatJapanese(fullWidth), '山田太郎「論文名」『史学雑誌』120編3号、2011年、1–20頁。');
  });
  test('数字の設定は書名・論文名の表記を変えない', () => {
    const titled = { ...article, title: '1920年代の農村' };
    assert.equal(
      formatJapanese(titled, { digits: 'full' }),
      '山田太郎「1920年代の農村」『史学雑誌』１２０編３号、２０１１年、１–２０頁。',
    );
  });
  test('頁範囲の記号を切り替える', () => {
    assert.match(formatJapanese(article, { pageDash: '-' }), /、1-20頁。$/);
    assert.match(formatJapanese(article, { pageDash: '～' }), /、1～20頁。$/);
    assert.match(formatJapanese(article, { pageDash: '–' }), /、1–20頁。$/);
  });
  test('入力の区切り記号がなんであってもそろえる', () => {
    for (const pages of ['1-20', '1--20', '1–20', '1〜20', '1～20', '1 - 20', 'pp. 1-20', '1-20頁']) {
      assert.match(formatJapanese({ ...article, pages }), /、1–20頁。$/, pages);
    }
  });
  test('末尾の句点をなくす', () => {
    assert.equal(formatJapanese(article, { period: false }), '山田太郎「論文名」『史学雑誌』120編3号、2011年、1–20頁');
    assert.equal(formatJapanese(book, { preset: 'B', period: false }), '山田太郎『書名』（吉川弘文館、2011年）');
  });
  test('おかしな設定値は既定値に戻す', () => {
    assert.equal(
      formatJapanese(article, { preset: 'Z', digits: 'x', pageDash: '*', period: 'yes' }),
      '山田太郎「論文名」『史学雑誌』120編3号、2011年、1–20頁。',
    );
  });
});

describe('副題の区切り', () => {
  const titled = { ...article, title: '近世村落の研究 : 信濃国を中心に' };
  test('既定では「――」でつなぐ', () => {
    assert.equal(formatJapanese(titled), '山田太郎「近世村落の研究――信濃国を中心に」『史学雑誌』120編3号、2011年、1–20頁。');
  });
  test('各モード', () => {
    assert.equal(convertSubtitle('主題 : 副題', 'dash'), '主題――副題');
    assert.equal(convertSubtitle('主題 : 副題', 'dash-enclose'), '主題――副題――');
    assert.equal(convertSubtitle('主題 : 副題', 'colon'), '主題：副題');
    assert.equal(convertSubtitle('主題 : 副題', 'keep'), '主題 : 副題');
  });
  test('全角コロンや片側だけの空白も区切りとみなす', () => {
    assert.equal(convertSubtitle('主題　：　副題', 'dash'), '主題――副題');
    assert.equal(convertSubtitle('主題: 副題', 'dash'), '主題――副題');
  });
  test('空白のないコロンは元の表記とみなして変えない', () => {
    assert.equal(convertSubtitle('主題：副題', 'dash'), '主題：副題');
    assert.equal(convertSubtitle('時刻10:30の記録', 'dash'), '時刻10:30の記録');
  });
  test('収録図書名の副題も変換する', () => {
    const ch = { ...chapter, containerTitle: '書名 : 副題' };
    assert.match(formatJapanese(ch), /『書名――副題』/);
  });
});

describe('巻・号の単位', () => {
  test('史学雑誌以外は「巻」', () => {
    assert.match(formatJapanese({ ...article, containerTitle: '日本史研究' }), /『日本史研究』120巻3号、/);
  });
  test('旧字体の「史學雜誌」も「編」', () => {
    assert.match(formatJapanese({ ...article, containerTitle: '史學雜誌' }), /『史學雜誌』120編3号、/);
  });
  test('号だけの雑誌', () => {
    assert.match(formatJapanese({ ...article, containerTitle: '歴史学研究', volume: '', issue: '1000' }), /『歴史学研究』1000号、2011年/);
  });
  test('巻だけの雑誌', () => {
    assert.match(formatJapanese({ ...article, containerTitle: '東洋史研究', issue: '' }), /『東洋史研究』120巻、2011年/);
  });
  test('単位まで入力されていればそのまま', () => {
    assert.match(formatJapanese({ ...article, containerTitle: '历史研究', volume: '', issue: '第3期' }), /『历史研究』第3期、/);
    assert.match(formatJapanese({ ...article, containerTitle: '雑誌', volume: '第12巻', issue: '' }), /『雑誌』第12巻、/);
  });
  test('合併号にも「号」を補う', () => {
    assert.match(formatJapanese({ ...article, containerTitle: '雑誌', issue: '3・4' }), /『雑誌』120巻3・4号、/);
  });
});

describe('項目が欠けているとき', () => {
  test('頁がない論文', () => {
    assert.equal(formatJapanese({ ...article, pages: '' }), '山田太郎「論文名」『史学雑誌』120編3号、2011年。');
  });
  test('巻号がない論文', () => {
    assert.equal(formatJapanese({ ...article, volume: '', issue: '' }), '山田太郎「論文名」『史学雑誌』2011年、1–20頁。');
  });
  test('刊行年がない単行本', () => {
    assert.equal(formatJapanese({ ...book, year: '' }), '山田太郎『書名』吉川弘文館。');
    assert.equal(formatJapanese({ ...book, year: '' }, { preset: 'B' }), '山田太郎『書名』（吉川弘文館）。');
  });
  test('出版事項がまったくなければ B でも空の括弧を出さない', () => {
    assert.equal(formatJapanese({ ...book, year: '', publisher: '' }, { preset: 'B' }), '山田太郎『書名』。');
  });
  test('著者がない', () => {
    assert.equal(formatJapanese({ ...book, authors: [] }), '『書名』吉川弘文館、2011年。');
  });
  test('編者がない編著所収論文', () => {
    assert.equal(formatJapanese({ ...chapter, editors: [] }), '山田太郎「論文名」『書名』吉川弘文館、2011年、1–20頁。');
  });
  test('すでに「年」が付いた刊行年に「年」を重ねない', () => {
    assert.match(formatJapanese({ ...book, year: '2011年' }), /、2011年。$/);
  });
  test('数字で終わらない刊行年はそのまま', () => {
    assert.match(formatJapanese({ ...book, year: '刊行年不明' }), /、刊行年不明。$/);
  });
  test('何もなければ空文字', () => {
    assert.equal(formatJapanese(entry({ kind: 'book', lang: 'cjk' })), '');
  });
});

describe('人名', () => {
  test('複数の著者は中黒でつなぐ', () => {
    assert.match(formatJapanese({ ...article, authors: ['山田, 太郎', '鈴木, 一郎'] }), /^山田太郎・鈴木一郎「/);
  });
  test('カタカナ名が含まれるときは読点でつなぐ', () => {
    assert.match(
      formatJapanese({ ...translation, authors: ['ブロック, マルク', 'フェーヴル, リュシアン'] }),
      /^マルク・ブロック、リュシアン・フェーヴル著、松村剛訳『/,
    );
  });
  test('欧文の名前は入力のまま', () => {
    assert.match(formatJapanese({ ...article, authors: ['Carr, Edward Hallett'] }), /^Carr, Edward Hallett「論文名」/);
  });
  test('編者だけの単行本は「編」を付ける', () => {
    assert.equal(formatJapanese({ ...book, authors: [], editors: ['鈴木, 一郎'] }), '鈴木一郎編『書名』吉川弘文館、2011年。');
  });
  test('著者と編者がある単行本', () => {
    assert.equal(
      formatJapanese({ ...book, editors: ['鈴木, 一郎'] }),
      '山田太郎著、鈴木一郎編『書名』吉川弘文館、2011年。',
    );
  });
  test('役割の語で終わる編者・訳者には「編」「訳」を重ねない', () => {
    assert.match(formatJapanese({ ...chapter, editors: ['鈴木一郎監修'] }), /鈴木一郎監修『書名』/);
    assert.match(formatJapanese({ ...translation, translators: ['松村, 剛監訳'] }), /著、松村剛監訳『/);
  });
  test('複数の編者', () => {
    assert.match(formatJapanese({ ...chapter, editors: ['鈴木, 一郎', '佐藤, 花子'] }), /鈴木一郎・佐藤花子編『書名』/);
  });
});

describe('かぎ括弧', () => {
  test('論文名の中の「」は『』にする', () => {
    assert.match(formatJapanese({ ...article, title: '「近代」とは何か' }), /「『近代』とは何か」/);
  });
  test('書名の中の『』は「」にする', () => {
    assert.match(formatJapanese({ ...book, title: '『源氏物語』の世界' }), /『「源氏物語」の世界』/);
  });
  test('論文名の中の書名『』はそのまま', () => {
    assert.match(formatJapanese({ ...article, title: '『古事記』の成立' }), /「『古事記』の成立」/);
  });
  test('かぎ括弧付きで入力されていても二重にしない', () => {
    assert.match(formatJapanese({ ...article, title: '「論文名」' }), /^山田太郎「論文名」『/);
    assert.match(formatJapanese({ ...book, title: '『書名』' }), /^山田太郎『書名』吉川/);
  });
});

describe('中国語・韓国語の文献も和文と同じく「」『』で扱う', () => {
  test('中国語の論文', () => {
    const zh = entry({
      kind: 'article',
      lang: 'cjk',
      authors: ['李, 大明'],
      title: '清代江南的市镇与地方社会',
      containerTitle: '历史研究',
      issue: '4',
      year: '2010',
      pages: '12-30',
    });
    assert.equal(formatJapanese(zh), '李大明「清代江南的市镇与地方社会」『历史研究』4号、2010年、12–30頁。');
  });
  test('韓国語の論文', () => {
    const ko = entry({
      kind: 'article',
      lang: 'cjk',
      authors: ['김, 민수'],
      title: '조선 후기 향촌 사회의 변동',
      containerTitle: '역사학보',
      volume: '215',
      year: '2012',
      pages: '101-130',
    });
    assert.equal(formatJapanese(ko), '김민수「조선 후기 향촌 사회의 변동」『역사학보』215巻、2012年、101–130頁。');
  });
});
