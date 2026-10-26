// 手入力フォームの定義（資料の種類ごとに表示する項目）と、フォームの値 ⇔ 文献データの変換
// DOM には触れないので、Node.js のテストからも使える。

import { createEntry } from '../core/model.js';

const PEOPLE_HINT = '複数のときは1行に1人ずつ入力します。';

const CJK_AUTHOR = {
  key: 'authors',
  label: '著者',
  people: true,
  placeholder: '山田, 太郎',
  hint: `${PEOPLE_HINT}「山田, 太郎」「山田太郎」のどちらの書き方でも構いません。`,
};
const CJK_YEAR = { key: 'year', label: '刊行年', placeholder: '2011', inputmode: 'numeric', width: 'half' };
const CJK_PUBLISHER = { key: 'publisher', label: '出版社', placeholder: '吉川弘文館', width: 'half' };
const CJK_PAGES = { key: 'pages', label: '頁', placeholder: '1-20', width: 'half' };
const CJK_YOMI = {
  key: 'yomi',
  label: '著者名のよみ（任意）',
  placeholder: 'やまだ たろう',
  hint: '「和文→欧文、著者名順」で並べ替えるときに使います。空欄なら漢字の文字コード順になります。',
};

const WESTERN_AUTHOR = {
  key: 'authors',
  label: '著者（Author）',
  people: true,
  placeholder: 'Smith, John',
  hint: `${PEOPLE_HINT}「姓, 名」の順に入力してください。`,
};
const WESTERN_YEAR = { key: 'year', label: '年（Year）', placeholder: '2011', inputmode: 'numeric', width: 'half' };
const WESTERN_PLACE = {
  key: 'place',
  label: '出版地（Place・任意）',
  placeholder: 'Oxford',
  width: 'half',
  hint: '空欄なら出版地を省いた形になります（Chicago 第18版では省略可）。',
};
const WESTERN_PUBLISHER = { key: 'publisher', label: '出版社（Publisher）', placeholder: 'Oxford University Press', width: 'half' };
const WESTERN_PAGES = { key: 'pages', label: '頁（Pages）', placeholder: '1-20', width: 'half' };

export const FORM_TYPES = [
  {
    id: 'ja-article',
    label: '論文',
    kind: 'article',
    lang: 'cjk',
    fields: [
      CJK_AUTHOR,
      { key: 'title', label: '論文名', placeholder: '論文名', required: true },
      {
        key: 'containerTitle',
        label: '雑誌名',
        placeholder: '史学雑誌',
        hint: '巻・号に数字だけを入れると「120巻3号」のように単位を補います（史学雑誌は「120編」）。「第3期」のように単位まで入れることもできます。',
      },
      { key: 'volume', label: '巻', placeholder: '120', width: 'third' },
      { key: 'issue', label: '号', placeholder: '3', width: 'third' },
      { ...CJK_YEAR, width: 'third' },
      CJK_PAGES,
      CJK_YOMI,
    ],
  },
  {
    id: 'ja-book',
    label: '単行本',
    kind: 'book',
    lang: 'cjk',
    fields: [
      { ...CJK_AUTHOR, hint: `${CJK_AUTHOR.hint}編者だけの本は、著者を空けて編者に入力します。` },
      { key: 'editors', label: '編者（任意）', people: true, placeholder: '鈴木, 一郎' },
      { key: 'title', label: '書名', placeholder: '書名', required: true },
      CJK_PUBLISHER,
      CJK_YEAR,
      CJK_YOMI,
    ],
  },
  {
    id: 'ja-chapter',
    label: '編著所収論文',
    kind: 'chapter',
    lang: 'cjk',
    fields: [
      CJK_AUTHOR,
      { key: 'title', label: '論文名', placeholder: '論文名', required: true },
      { key: 'editors', label: '収録図書の編者', people: true, placeholder: '鈴木, 一郎' },
      { key: 'containerTitle', label: '収録図書名', placeholder: '書名' },
      CJK_PUBLISHER,
      CJK_YEAR,
      CJK_PAGES,
      CJK_YOMI,
    ],
  },
  {
    id: 'ja-translation',
    label: '翻訳書',
    kind: 'translation',
    lang: 'cjk',
    fields: [
      {
        ...CJK_AUTHOR,
        label: '原著者',
        placeholder: 'ブロック, マルク',
        hint: `${PEOPLE_HINT}カタカナで「姓, 名」と入れると「マルク・ブロック」の順で表示します。`,
      },
      { key: 'translators', label: '訳者', people: true, placeholder: '松村, 剛' },
      { key: 'title', label: '書名（訳書の書名）', placeholder: '歴史のための弁明', required: true },
      CJK_PUBLISHER,
      CJK_YEAR,
      {
        key: 'originalInfo',
        label: '原著の情報（任意）',
        placeholder: "Apologie pour l'histoire, 1949",
        hint: '入力すると末尾に「（原著：…）」として付きます。',
      },
      CJK_YOMI,
    ],
  },
  {
    id: 'en-article',
    label: '欧文論文',
    kind: 'article',
    lang: 'western',
    fields: [
      WESTERN_AUTHOR,
      { key: 'title', label: '論文名（Article title）', placeholder: 'Title of Article', required: true },
      { key: 'containerTitle', label: '雑誌名（Journal）', placeholder: 'Journal of Asian Studies' },
      { key: 'volume', label: '巻（Vol.）', placeholder: '70', width: 'third' },
      { key: 'issue', label: '号（No.）', placeholder: '2', width: 'third' },
      { ...WESTERN_YEAR, width: 'third' },
      WESTERN_PAGES,
    ],
  },
  {
    id: 'en-book',
    label: '欧文単行本',
    kind: 'book',
    lang: 'western',
    fields: [
      { ...WESTERN_AUTHOR, hint: `${WESTERN_AUTHOR.hint}編者だけの本は、著者を空けて編者に入力します。` },
      { key: 'editors', label: '編者（Editor・任意）', people: true, placeholder: 'Doe, Jane' },
      { key: 'translators', label: '訳者（Translator・任意）', people: true, placeholder: 'Peter Putnam' },
      { key: 'title', label: '書名（Title）', placeholder: 'Title of Book', required: true },
      WESTERN_PLACE,
      WESTERN_PUBLISHER,
      WESTERN_YEAR,
    ],
  },
  {
    id: 'en-chapter',
    label: '欧文編著所収論文',
    kind: 'chapter',
    lang: 'western',
    fields: [
      WESTERN_AUTHOR,
      { key: 'title', label: '論文名（Chapter title）', placeholder: 'Title of Chapter', required: true },
      { key: 'editors', label: '収録図書の編者（Editor）', people: true, placeholder: 'Doe, Jane' },
      { key: 'containerTitle', label: '収録図書名（Book title）', placeholder: 'Title of Book' },
      { ...WESTERN_PAGES, hint: '参考文献での頁範囲は、Chicago 第18版では省略できます。' },
      WESTERN_PLACE,
      WESTERN_PUBLISHER,
      WESTERN_YEAR,
    ],
  },
];

export const DEFAULT_FORM_TYPE = 'ja-article';

export function getFormType(id) {
  return FORM_TYPES.find((type) => type.id === id) ?? FORM_TYPES[0];
}

/** 文献データに対応するフォームの種類 */
export function formTypeIdOf(entry) {
  const prefix = entry.lang === 'western' ? 'en' : 'ja';
  const kind = entry.lang === 'western' && entry.kind === 'translation' ? 'book' : entry.kind;
  const id = `${prefix}-${kind}`;
  return FORM_TYPES.some((type) => type.id === id) ? id : DEFAULT_FORM_TYPE;
}

/** 一覧に出す種類のラベル（例：「和文・論文」「欧文・単行本」） */
export function typeLabelOf(entry) {
  const type = getFormType(formTypeIdOf(entry));
  const lang = entry.lang === 'western' ? '欧文' : '和文';
  return `${lang}・${type.label.replace(/^欧文/, '')}`;
}

/** 名前欄の入力を 1 人ずつに分ける（改行・「;」「、」区切り） */
export function splitPeople(value) {
  return String(value ?? '')
    .split(/\r?\n|[;；、]/)
    .map((name) => name.trim())
    .filter((name) => name !== '');
}

/** 文献データ → フォームの値 */
export function valuesFromEntry(entry) {
  const type = getFormType(formTypeIdOf(entry));
  const values = {};
  for (const field of type.fields) {
    values[field.key] = field.people ? (entry[field.key] ?? []).join('\n') : (entry[field.key] ?? '');
  }
  return values;
}

/**
 * フォームの値 → 文献データ。
 * base（編集前のデータ）があれば ID と、フォームにない付帯情報（DOI など）を引き継ぐ。
 * フォームに表示していない項目は空にする（見えない値が表記に混ざらないように）。
 */
export function entryFromValues(typeId, values, base = null) {
  const type = getFormType(typeId);
  const data = {
    id: base?.id,
    kind: type.kind,
    lang: type.lang,
    doi: base?.doi,
    url: base?.url,
    source: base?.source || 'manual',
  };
  for (const field of type.fields) {
    const value = values?.[field.key];
    data[field.key] = field.people ? splitPeople(value) : String(value ?? '').trim();
  }
  return createEntry(data);
}

/** 入力の不足を調べる。問題がなければ空の配列 */
export function validateValues(typeId, values) {
  const type = getFormType(typeId);
  return type.fields
    .filter((field) => field.required && String(values?.[field.key] ?? '').trim() === '')
    .map((field) => `「${field.label}」を入力してください。`);
}
