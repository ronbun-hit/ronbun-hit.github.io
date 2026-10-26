// 文字種の判定（和文・欧文の振り分けや、著者名の処理に使う）

// 漢字・かな・ハングル（中国語・韓国語の文献も和文と同じ扱いにするため、まとめて判定する）
const CJK_RE =
  /[々-〇〻぀-ゟ゠-ヿㇰ-ㇿ㐀-䶿一-鿿豈-﫿ｦ-ﾟᄀ-ᇿ㄰-㆏가-힯]|[\u{20000}-\u{3134F}]/u;

// ラテン文字（アクセント付きを含む）
const LATIN_RE = /[A-Za-zÀ-ɏḀ-ỿ]/;

// カタカナ表記の人名に使われる文字（中黒・長音・ダブルハイフン・等号を含む）
const KATAKANA_NAME_RE = /^[゠-ヿㇰ-ㇿ･-ﾟ=＝\s]+$/;
const KATAKANA_LETTER_RE = /[ァ-ヺㇰ-ㇿｦ-ﾝ]/;

export function hasCjk(value) {
  return CJK_RE.test(String(value ?? ''));
}

export function hasLatin(value) {
  return LATIN_RE.test(String(value ?? ''));
}

/** カタカナだけで書かれた名前か（例：「ブロック」「レヴィ=ストロース」） */
export function isKatakanaName(value) {
  const s = String(value ?? '').trim();
  return s !== '' && KATAKANA_NAME_RE.test(s) && KATAKANA_LETTER_RE.test(s);
}
