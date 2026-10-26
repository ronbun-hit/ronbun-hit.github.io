# CLAUDE.md — 歴史学 参考文献メーカー の開発方針

歴史学（人文系）の学生向けの参考文献表記ジェネレーター。GitHub Pages で公開し、のちに Google AdSense で広告を出す予定の静的サイト。
リポジトリは GitHub の組織 `ronbun-hit` の `ronbun-hit.github.io`（組織サイト）で、公開 URL は `https://ronbun-hit.github.io/`（ドメインの直下）。

## 絶対に守ること

- **素の HTML・CSS・JavaScript だけ**。フレームワーク、ビルド工程、外部ライブラリ（CDN の読み込みや Web フォントを含む）は使わない。リポジトリをそのまま GitHub Pages（`main` の `/ (root)`）で配信できる状態を保つ。
- **入力内容をサーバーに送らない**。`fetch` などで外部と通信する処理を、ツールに足さない。この方針はトップページとプライバシーポリシーに明記してあるので、変えるならページの記述も同時に直す（アクセス解析を入れる場合もプライバシーポリシーを更新する）。
- **localStorage の読み書きは必ず try/catch で囲む**（`core/storage.js` を経由する）。使えない環境でもツールが動くこと。
- **「入力の読み取り」と「書式への整形」を混ぜない**（下の「設計」を参照）。
- 整形のルールを変えたら、必ずテストを足して `node --test` が全部通ることを確かめる。

## コマンド

```sh
node --test                    # 単体テスト（Node.js 20 以上、依存なし）。npm test でも同じ
python3 -m http.server 8000    # ローカル確認 → http://localhost:8000/（file:// では ES モジュールが動かない）
```

## 設計

```text
assets/js/
  core/model.js       文献データの共通モデル（createEntry, detectLang）
  core/settings.js    表示設定と既定値（normalizeSettings）
  core/sort.js        並べ替え
  core/storage.js     localStorage への保存（try/catch）
  core/script.js      文字種の判定（漢字・かな・ハングル／ラテン文字／カタカナ名）
  parsers/            入力 → 文献データ。bibtex.js, ris.js, latex.js, normalize.js, index.js（形式の判定）
  formatters/         文献データ → 表記。japanese.js（A・B）, chicago.js, names.js, text.js, index.js
  ui/form-schema.js   手入力フォームの項目定義と、フォーム値 ⇔ 文献データの変換（DOM に触れない）
  ui/clipboard.js     コピー（HTML とプレーンテキスト）
  app.js              画面の動き。DOM を触るのはここと ui/clipboard.js だけ
```

- 文献データ（`core/model.js` の先頭コメントに定義）は `kind`（article / book / chapter / translation）と `lang`（cjk / western）を持つ。名前は「山田, 太郎」「Carr, Edward Hallett」のような文字列の配列で持ち、表記への変換（詰める・並べ替える）は formatters 側で行う。
- パーサーは形式ごとの項目を「生データ」にそろえ、`parsers/normalize.js` の `normalizeImported` で共通モデルにする。書誌データ特有の書き方（「山田太郎 編」→ 編者、「東京 : 吉川弘文館」→ 出版地と出版社、「書名 = English title」→ 並列タイトルを除く、生没年を除く）はここで整理する。
- **CiNii API などの入力を足すとき**：`parsers/`（または `sources/`）に、取得結果を生データに変換して `normalizeImported` に渡すモジュールを追加する。formatters・core・画面の整形部分は変えない。外部と通信する機能になるので、プライバシーの記述（トップ・プライバシーポリシー）も合わせて見直す。
- 整形結果は「ラン」（`[{ text, italic }]`）で返す。欧文のイタリックを HTML 表示とリッチテキストのコピーに引き継ぐため。

## 書式の仕様

和文（日本語・中国語・韓国語。タイトルに漢字・かな・ハングルがあれば和文と判定）:

```text
A 論文        山田太郎「論文名」『史学雑誌』120編3号、2011年、1–20頁。
A 単行本      山田太郎『書名』吉川弘文館、2011年。
A 編著所収    山田太郎「論文名」鈴木一郎編『書名』吉川弘文館、2011年、1–20頁。
B 論文        山田太郎「論文名」（『史学雑誌』120編3号、2011年）。
B 単行本      山田太郎『書名』（吉川弘文館、2011年）。
B 編著所収    山田太郎「論文名」（鈴木一郎編『書名』吉川弘文館、2011年）。
翻訳書        マルク・ブロック著、松村剛訳『書名』岩波書店、2004年（原著：…）。  ※B は出版事項を括弧に入れる
```

- 上の 6 例は依頼者が指定した形。`tests/japanese-formatter.test.js` で完全一致を確かめている。B では頁を出さない。
- 人名：漢字・かな・ハングルの「姓, 名」は詰める（山田太郎）。姓・名ともカタカナなら「名・姓」（マルク・ブロック）。欧文の名前は入力のまま。複数人は「・」でつなぎ、中黒を含む名前や欧文名があれば「、」でつなぐ。
- 巻・号：数字だけなら「巻」「号」を補う。『史学雑誌』（史學雜誌）だけは「編」（`VOLUME_UNITS`）。単位まで入力されていればそのまま。
- 論文名の中の「」は『』に、書名の中の『』は「」に替える。
- 設定（和文のみ）：数字の全角／半角は巻号・年・頁だけに適用し、タイトルは変えない。頁範囲の記号は – / - / ～（全角数字のときのハイフンは全角）。末尾の句点。「主題 : 副題」（前後に空白のあるコロン）の書き換え。
- 欧文は Chicago Manual of Style の注・参考文献方式（参考文献の形）。第18版に合わせ、出版地は入力があるときだけ、著者 7 人以上は最初の 3 人＋ et al.。雑誌名・書名はイタリック。和文向けの設定は欧文に適用しない。
- 並べ替え（著者名順）：和文 → 欧文。和文は「よみ」があればそれ、なければ Intl.Collator('ja')（漢字は JIS 順）。欧文は姓。同じ著者は刊行年順。

## テスト

- `tests/*.test.js`（node:test）。共通の補助関数は `tests/helpers.js`。
- `tests/fixtures/cinii-sample.bib` と `cinii-sample.ris` は、CiNii Research の書き出しを**想定して作った**架空のサンプル（開発時の環境から CiNii に接続できず、実物とは照合していない）。実際の書き出しで読み取りに問題が見つかったら、その形をサンプルに加えてからパーサーを直す。

## ページ・SEO・広告

- ページ：`index.html`（ツール）、`howto.html`、`articles/history-report-bibliography.html`（解説記事）、`privacy.html`、`contact.html`、`about.html`、`404.html`。ヘッダー・フッターは各ページに直接書いている（ビルドしないため）。ナビを変えるときは全ページを直す。
- **ページを追加するとき**：`<title>`、`meta description`、`canonical`、OGP（`og:title`・`og:description`・`og:url`・`og:image` など）、`twitter:card`、アイコン、ヘッダー・フッターのナビ（`aria-current`）、`sitemap.xml` への追加、広告枠のコメント。リンクとアセットは相対パスで書く（ローカルの確認用サーバーでも、独自ドメインに移っても、そのまま動くように）。
- canonical・OGP・sitemap・robots.txt には公開 URL `https://ronbun-hit.github.io/` を絶対 URL で書いている。独自ドメインに移ったら一括置換する（README 参照）。404.html はどの階層の URL でも表示されるため、`<base href="/">` でリンクの基準をサイトの一番上に固定している。
- 広告は `<!-- 広告枠：… -->` のコメントで位置だけ確保している。広告コードはまだ入れない。入れるときは、ボタンのすぐ近くなど誤クリックを招く位置を避ける。
- 解説記事は増やしていく予定。新しい記事は `articles/` に置き、既存の記事の作り（head の各種メタタグ、ヘッダー・フッター、目次、`example` の表記例）をひな形にする。書きかけの箇所は `todo-note` の枠で示し、公開前に消す。記事の本文は運営者が書いたもので、内容を変えるときは運営者に確認する。
- お問い合わせは Google フォーム（https://forms.gle/7xYetTHFo9Wf4DUQ9）へのリンク。フォームを作り直したら `contact.html` のリンクを差し替える。

## 文章とコードのスタイル

- 画面の文言は日本語の「です・ます」調で、短く具体的に。専門用語には説明を添える。
- コードのコメントは日本語。既存のコードの書き方（ES モジュール、`const`、小さな純粋関数、DOM 操作は app.js に集める）に合わせる。
- アクセシビリティ：ラベルの付いたフォーム、`role="status"` での結果通知、キーボードで操作できるタブ、タップしやすいボタン（高さ 44px 前後）、横スクロールの出ないレイアウト。

## 仮置きのもの（公開・申請前に差し替える）

- サイト名「歴史学 参考文献メーカー」（仮）。変えるなら全ページと `design/ogp-template.html` → `assets/img/ogp.png` を作り直す。
- 独自ドメイン、`ads.txt`（AdSense のサイト運営者 ID が決まってから作る）。
