# 歴史学 参考文献メーカー

歴史学（人文系）の学生向けの「参考文献表記ジェネレーター」です。
CiNii Research の書き出し（BibTeX・RIS）を貼り付けるか手入力するだけで、歴史学でよく使われる和文の表記（論文名は「」、書名・雑誌名は『』）や、欧文の Chicago 形式に整えます。

- 素の HTML・CSS・JavaScript だけで作っています（フレームワーク・ビルド工程・外部ライブラリなし）。GitHub Pages にそのまま置けます。
- 入力内容はすべてブラウザの中で処理し、サーバーには送りません。作ったリストはブラウザの localStorage に保存します。
- スマホを基準にしたレスポンシブデザインです。

## 主な機能

| 機能 | 内容 |
| --- | --- |
| 貼り付け入力 | CiNii Research の書き出し（BibTeX・RIS）を自動で読み取り。複数件・形式の混在にも対応 |
| 手入力 | 論文／単行本／編著所収論文／翻訳書／欧文論文／欧文単行本／欧文編著所収論文。種類ごとに必要な項目だけを表示 |
| 書式 | 和文はプリセット A・B を切り替え、欧文は Chicago 形式（注・参考文献方式の参考文献の形） |
| 細かい設定 | 数字の全角／半角、頁範囲の記号（–／-／～）、末尾の句点の有無、「主題 : 副題」の書き方 |
| 並べ替え | 入力順／和文→欧文の順で、それぞれ著者名順 |
| コピー・保存 | 1件ごと・全件のコピー、localStorage への自動保存、削除と「元に戻す」 |

書式の例（プリセット A と B）:

```text
A：山田太郎「論文名」『史学雑誌』120編3号、2011年、1–20頁。
B：山田太郎「論文名」（『史学雑誌』120編3号、2011年）。
欧文：Smith, John. “Title of Article.” Journal of Asian Studies 72, no. 2 (2013): 301–325.
```

## ファイル構成

```text
index.html                 トップ（ツール本体）
howto.html                 使い方
articles/
  history-report-bibliography.html   解説記事のひな形「歴史学レポートの参考文献の書き方」
privacy.html               プライバシーポリシー
contact.html               お問い合わせ（Google フォームへのリンク）
about.html                 運営者情報
404.html                   ページが見つからないとき
sitemap.xml / robots.txt   検索エンジン向け
.nojekyll                  GitHub Pages の Jekyll 処理を止める（ファイルをそのまま配信する）
assets/
  css/style.css            全ページ共通のスタイル
  img/                     OGP 画像・アイコン
  js/
    app.js                 ツール画面の動き（DOM 操作）
    core/                  文献データのモデル、設定、並べ替え、保存（localStorage）
    parsers/               入力の読み取り（BibTeX・RIS → 文献データ）
    formatters/            書式への整形（文献データ → 和文 A・B／Chicago）
    ui/                    手入力フォームの定義、クリップボード、サンプル
design/ogp-template.html   OGP 画像（assets/img/ogp.png）の元データ
tests/                     単体テスト（node:test）と、CiNii の書き出しを想定したサンプル
CLAUDE.md                  このプロジェクトの方針（開発メモ）
```

「入力の読み取り」（`parsers/`）と「書式への整形」（`formatters/`）は、共通の文献データ（`core/model.js`）だけを介してつながっています。CiNii の API などの入力手段を後から足すときは、取得したデータを文献データに変換するモジュールを追加すれば、整形と画面はそのまま使えます。

## ローカルでの確認方法

JavaScript を ES モジュールとして読み込んでいるため、`index.html` をダブルクリックして直接開く（`file://`）とツールが動きません。ローカルサーバーを起動して、`http://localhost` で開いてください。

**Python を使う場合**（macOS・Linux には多くの場合入っています）:

```sh
cd ronbun-hit
python3 -m http.server 8000
```

Windows では `py -m http.server 8000` です。起動したら、ブラウザで <http://localhost:8000/> を開きます。終了するときはターミナルで `Ctrl + C` を押します。

**ほかの方法**: Node.js があれば `npx serve .`、VS Code を使っているなら拡張機能「Live Server」でも確認できます（どちらもサイト自体の動作には不要です）。

### テストの実行

整形処理などの単体テストは、Node.js 標準のテスト機能（`node:test`）で書いています。Node.js 20 以上があれば、追加のインストールなしで実行できます。

```sh
node --test
```

`npm test` でも同じテストが動きます（依存パッケージはないので `npm install` は不要です）。テスト用のサンプルは `tests/fixtures/cinii-sample.bib` と `tests/fixtures/cinii-sample.ris` です。

## GitHub Pages での公開手順

1. 公開したい内容を `main` ブランチに入れます。
   - リポジトリに `main` がまだない場合は、リポジトリのページの **Branches**（ブランチ一覧）で **New branch** を押し、作業ブランチ（`claude/history-citation-generator-iv1gim`）をもとに `main` を作ります。続けて **Settings** → **General** の **Default branch** を `main` に切り替えておくと、管理しやすくなります。
   - すでに `main` がある場合は、作業ブランチから Pull Request を作って `main` にマージします。
2. GitHub のリポジトリのページで **Settings** → 左のメニューの **Pages** を開きます。
3. **Build and deployment** の **Source** で **Deploy from a branch** を選びます。
4. **Branch** で `main`、フォルダで `/ (root)` を選び、**Save** を押します。
5. 数分待つと、Pages の設定画面の上部に公開 URL が表示されます。このリポジトリなら <https://gazamidaiou-boop.github.io/ronbun-hit/> です。

補足:

- 以後は `main` に変更を push するたびに、自動で公開内容が更新されます（反映に数分かかります）。
- 無料プランで GitHub Pages を使うには、リポジトリを Public にする必要があります（Private のまま公開するには GitHub Pro などの有料プランが必要です）。
- 公開したら [Google Search Console](https://search.google.com/search-console) にサイトを登録し、`sitemap.xml` を送信しておくと、検索結果に載りやすくなります。

## 独自ドメインの設定手順

AdSense の申請や `robots.txt`・`ads.txt` の設置には、独自ドメインがあると便利です（後述）。

1. **ドメインを取得する**
   ドメイン登録サービス（レジストラ）で、使いたいドメインを取得します。以下では `example.com` を例にします。
2. **（推奨）GitHub でドメインを検証する**
   第三者にドメインを乗っ取られないよう、先に検証しておきます。GitHub 右上のアイコン → **Settings** → **Pages** → **Add a domain** でドメインを入力すると、`_github-pages-challenge-gazamidaiou-boop.example.com` のような名前の TXT レコードが表示されるので、これを DNS に追加して **Verify** を押します。
3. **DNS を設定する**（レジストラや DNS サービスの管理画面で）
   - `example.com`（サブドメインなし）で公開する場合は、A レコードを 4 つ作ります。

     ```text
     185.199.108.153
     185.199.109.153
     185.199.110.153
     185.199.111.153
     ```

     IPv6 にも対応させるなら、AAAA レコードも作ります。

     ```text
     2606:50c0:8000::153
     2606:50c0:8001::153
     2606:50c0:8002::153
     2606:50c0:8003::153
     ```

     あわせて `www` の CNAME レコードを `gazamidaiou-boop.github.io` に向けておくと、`www.example.com` からも転送されます。
   - `bunken.example.com` のようなサブドメインで公開する場合は、そのサブドメインの CNAME レコードを `gazamidaiou-boop.github.io` に向けます（リポジトリ名は付けません）。
4. **リポジトリにドメインを登録する**
   リポジトリの **Settings** → **Pages** → **Custom domain** にドメインを入力して **Save** を押します。リポジトリの直下に `CNAME` というファイルが作られるので、手元のリポジトリにも取り込んで（`git pull`）おいてください。
5. **HTTPS を有効にする**
   DNS の確認が終わると **Enforce HTTPS** にチェックできるようになるので、チェックを入れます。DNS の反映や証明書の発行には、数分から最大 24 時間ほどかかることがあります。
6. **サイト内の URL を書き換える**
   ページの canonical・OGP・サイトマップなどには、公開 URL を絶対 URL で書いています。`https://gazamidaiou-boop.github.io/ronbun-hit/` を新しい URL（例：`https://example.com/`）に、すべて置き換えてください。

   対象：`*.html`（各ページの canonical・`og:url`・`og:image`、`404.html` の `<base>`、`about.html` の URL 欄）、`sitemap.xml`、`robots.txt`

   VS Code なら「フォルダーを指定して置換」（`Ctrl + Shift + H`、macOS は `Cmd + Shift + H`）で一括置換できます。コマンドで置き換える場合の例：

   ```sh
   # Linux
   grep -rl "https://gazamidaiou-boop.github.io/ronbun-hit/" --include="*.html" --include="*.xml" --include="*.txt" . \
     | xargs sed -i 's#https://gazamidaiou-boop.github.io/ronbun-hit/#https://example.com/#g'
   # macOS（sed -i の後に '' が必要）
   grep -rl "https://gazamidaiou-boop.github.io/ronbun-hit/" --include="*.html" --include="*.xml" --include="*.txt" . \
     | xargs sed -i '' 's#https://gazamidaiou-boop.github.io/ronbun-hit/#https://example.com/#g'
   ```

   置き換えたら `git grep "gazamidaiou-boop.github.io"` で残りがないか確かめ、コミットして push します。

## Google AdSense に申し込む前のチェックリスト

広告を入れる位置は、各ページに `<!-- 広告枠：… -->` というコメントで確保してあります（広告コードはまだ入っていません）。

- [ ] **独自ドメインを設定する**：AdSense はサイトをドメイン単位で登録し、`ads.txt` もドメインの直下に置く必要があります。`ユーザー名.github.io/リポジトリ名/` のままでは申請が難しいため、先に独自ドメインを設定してください。
- [ ] **運営者情報**（`about.html`）の【】の部分を書き換える
- [x] **お問い合わせ**（`contact.html`）の Google フォームの URL を設定する（設定済み：https://forms.gle/7xYetTHFo9Wf4DUQ9）
- [ ] **解説記事**（`articles/history-report-bibliography.html`）の本文を書き、【本文】の枠（`todo-note`）を消す。記事は複数あるほうが審査に有利です
- [ ] **プライバシーポリシー**（`privacy.html`）の内容を確認する（アクセス解析などを追加したら追記する）
- [ ] 申請時：AdSense の管理画面に表示されるコード（`<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-…" crossorigin="anonymous"></script>`）を、各ページの `<head>` にある「広告：Google AdSense の審査用・自動広告用コード」のコメントの位置に貼る
- [ ] リポジトリの直下に `ads.txt` を作り、次の 1 行を書く（`pub-` の後は自分のサイト運営者 ID）

  ```text
  google.com, pub-0000000000000000, DIRECT, f08c47fec0942fa0
  ```

- [ ] 欧州経済領域（EEA）・英国・スイスからのアクセスに広告を出す場合は、AdSense の「プライバシーとメッセージ」で同意メッセージを設定する
- [ ] 承認後：広告ユニットのコードを `<!-- 広告枠：… -->` の位置に貼る（ボタンのすぐ近くは誤クリックを招くので避ける）

## サイト名を変えるとき

サイト名「歴史学 参考文献メーカー」は仮のものです。変えるときは、全ファイルを「歴史学 参考文献メーカー」で検索して置き換え、`design/ogp-template.html` の文字も直して OGP 画像（`assets/img/ogp.png`）を作り直してください（作り方はテンプレート内のコメントにあります）。
