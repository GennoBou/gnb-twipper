[English Edition](./STORE_LISTING.md) / [日本語版](./STORE_LISTING_ja.md) / [Español](./STORE_LISTING_es.md) / [Português](./STORE_LISTING_pt-BR.md) / [Deutsch](./STORE_LISTING_de.md) / [Français](./STORE_LISTING_fr.md) / [繁體中文](./STORE_LISTING_zh-TW.md)

# ストア掲載情報・申請用ドキュメント (日本語版)

本ドキュメントは、Chrome Web Store、Firefox Add-ons (AMO)、Opera Addons、および Microsoft Edge Add-ons への申請時に使用する掲載テキスト、機能概要、説明文、権限申請理由、審査担当者向けテスト手順の定義書です。

---

## 基本情報

- **拡張機能名**: `GNB Twipper for Twitch`
- **バージョン**: `1.0.1`
- **主要カテゴリ**: ソーシャル ネットワーク (Social & Communication)
- **サブカテゴリ**: エンターテインメント (Entertainment)
- **デフォルト言語**: 英語 (`en`)
- **対応言語**: 英語 (`en`), 日本語 (`ja`), スペイン語 (`es`), ポルトガル語 (`pt_BR`), ドイツ語 (`de`), フランス語 (`fr`), 繁体字中国語 (`zh_TW`)
- **公式リポジトリ**: `https://github.com/GennoBou/gnb-twipper`
- **ホームページURL**: `https://github.com/GennoBou/gnb-twipper`
- **サポートURL**: `https://github.com/GennoBou/gnb-twipper/issues`
- **プライバシーポリシーURL**: `https://github.com/GennoBou/gnb-twipper/blob/main/docs/PRIVACY_POLICY.md` （日本語版: `https://github.com/GennoBou/gnb-twipper/blob/main/docs/PRIVACY_POLICY_ja.md`）
- **ライセンス**: `MIT License`

---

## 1. Chrome Web Store 掲載文

> [!NOTE]
> Chrome Web Store の説明文欄は **プレーンテキストのみ** 対応しています（MarkdownやHTMLタグは使用できません）。以下の整形済みテキストをそのままコピー＆ペーストして使用してください。

### パッケージのタイトル / アプリ名 (45文字以内)

`GNB Twipper for Twitch`

### パッケージの概要 / 短い説明 (132文字以内)

`Twitchでフォローしているライブ配信を自動巡回する機能をTwitch.tvに追加します`

### 説明 (ストア詳細画面の概要説明テキスト / 16,000文字まで / プレーンテキスト)

```text
GNB Twipper for Twitch は、Twitchのフォロー中ライブ配信を効率的に巡回・視聴するために開発されたミニマルなブラウザ拡張機能です。

【主な特長】
・🔄 フォロー配信の自動巡回 & スマート待機: フォロー中のライブ配信者を指定時間ごとに自動切替。配信者が1人のみの場合はページ遷移を一時停止して見続け、2人以上になると自動で巡回を再開します。
・🚫 巡回除外設定: 自動巡回から特定のチャンネル（24時間配信や公式音楽配信など）を簡単に除外登録できます。
・🔒 サブスク限定配信の自動スキップ: 未加入のサブスクライバー限定配信を自動で検知してスキップ（無料プレビュー期間の視聴設定にも対応）。
・🧭 ミニマルな操作ナビ: Twitch画面の上部バーに溶け込む統合ナビゲーション（AUTO開始/停止、スキップ、配信者リスト、待機中バッジ）を搭載。
・⚡ 履歴を汚さないスマート遷移: ブラウザの閲覧履歴を圧迫せずに上書き遷移するため、「戻る」ボタンが巡回履歴で埋まりません。
・🌐 多言語対応: 全7言語（日本語、英語、スペイン語、ポルトガル語、ドイツ語、フランス語、繁体字中国語）に完全対応。

----------------------------------------

【💬 フィードバック & サポート】
・公式リポジトリ / ソースコード:
https://github.com/GennoBou/gnb-twipper
・バグ報告 / 機能要望:
https://github.com/GennoBou/gnb-twipper/issues

----------------------------------------

※ 補足: 個人の視聴環境に合わせて、表示スタイルやカスタムスクリプトを安全に適用できる調整機能も搭載しています（ブラウザの仕様上、カスタムスクリプトをご利用の際は拡張機能の詳細設定から「ユーザースクリプトを許可する」を有効にしてください）。
```

---

## 2. Firefox Add-ons (AMO) 掲載文

> [!NOTE]
> Firefox Add-ons (AMO) の詳細説明欄は **Markdown** に対応しています（HTMLは非対応）。太字やリスト、リンクを活用した以下のテキストを使用してください。

### 概要 (250文字以内)

`Twitchでフォローしているライブ配信を自動巡回する機能をTwitch.tvに追加します`

### 詳細説明 (Markdown)

```markdown
**GNB Twipper for Twitch** は、Twitchのフォロー中ライブ配信を効率的に巡回・視聴するために開発されたミニマルなブラウザ拡張機能です。

### 主な特長

- 🔄 **フォロー配信の自動巡回 & スマート待機**: フォロー中のライブ配信者を指定時間ごとに自動切替。配信者が1人のみの場合はページ遷移を一時停止して見続け、2人以上になると自動で巡回を再開します。
- 🚫 **巡回除外設定**: 自動巡回から特定のチャンネル（24時間配信や公式音楽配信など）を簡単に除外登録できます。
- 🔒 **サブスク限定配信の自動スキップ**: 未加入のサブスクライバー限定配信を自動で検知してスキップ（無料プレビュー期間の視聴設定にも対応）。
- 🧭 **ミニマルな操作ナビ**: Twitch画面の上部バーに溶け込む統合ナビゲーション（AUTO開始/停止、スキップ、配信者リスト、待機中バッジ）を搭載。
- ⚡ **履歴を汚さないスマート遷移**: ブラウザの閲覧履歴を圧迫せずに上書き遷移するため、「戻る」ボタンが巡回履歴で埋まりません。
- 🌐 **多言語対応**: 全7言語（日本語、英語、スペイン語、ポルトガル語、ドイツ語、フランス語、繁体字中国語）に完全対応。

---

### 💬 フィードバック & サポート
- **公式リポジトリ / ソースコード**: [GitHub](https://github.com/GennoBou/gnb-twipper)
- **バグ報告 / 機能要望**: [Issues](https://github.com/GennoBou/gnb-twipper/issues)
*(作者は日本人ですが、翻訳ツールを通じて英語など他言語でのお問い合わせ・Issueも大歓迎です！)*

---

*補足*: 個人の視聴環境に合わせて、表示スタイルやカスタムスクリプトを安全に適用できる調整機能も搭載しています（※ブラウザの仕様上、カスタムスクリプトをご利用の際は拡張機能の詳細設定から「ユーザースクリプトを許可する」を有効にしてください）。
```

---

## 3. Opera Addons 掲載文

> [!NOTE]
> Opera Addons の詳細説明欄は **プレーンテキストのみ** 推奨です（MarkdownやHTMLはレンダリングされません）。Chrome Web Store 掲載文と同様のプレーンテキストを使用してください。

### キャッチコピー

`Twitchでフォローしているライブ配信を自動巡回する機能をTwitch.tvに追加します`

### 詳細説明

(上記 1. Chrome Web Store 掲載文（プレーンテキスト形式）と同様)

---

## 4. Microsoft Edge Add-ons 掲載文

> [!NOTE]
> Microsoft Partner Center (Microsoft Edge Add-ons) の詳細説明欄は **250〜10,000文字のプレーンテキスト** に対応しています（MarkdownやHTMLは非対応）。また、短い説明はパッケージ内の `_locales/*/messages.json` (`appDesc`) から自動反映されます。

### カテゴリ (Category / 単一カテゴリ選択)

`Entertainment`（エンターテインメント）または `Social`（ソーシャル）

### 短い説明 (Short Description / 132文字以内 / `_locales/ja/messages.json` より自動反映)

`Twitchでフォローしているライブ配信を自動巡回する機能をTwitch.tvに追加します`

### 詳細説明 (Detailed Description / 250〜10,000文字 / プレーンテキスト)

(上記 1. Chrome Web Store 掲載文（プレーンテキスト形式）と同様)

### 検索キーワード (Search Terms / 最大7個・各30文字以内・合計21単語以内)

```text
twitch
自動巡回
オートローテーション
配信視聴
twitch 拡張機能
ながら見
チャンネル切り替え
```

---

## 📷 ストア申請用スクリーンショット・プロモーション画像要件

公式ストア申請時にアップロードする画像仕様:

- **スクリーンショット必須解像度**: `1280x800` または `640x400` / `640x480`（最大5〜6枚）
- **画像形式**: `PNG` または `JPEG`

生成済みアセット構成 (`docs/images/`):

- `screenshot01_store_ja.png` (メイン画面: 1280x800 日本語版バナーカード)
- `screenshot02_store_ja.png` (設定画面: 1280x800 日本語版バナーカード)
- `screenshot01_store_en.png` (メイン画面: 1280x800 英語版バナーカード)
- `screenshot02_store_en.png` (設定画面: 1280x800 英語版バナーカード)
- `edge_logo_300x300.png` (Microsoft Edge Add-ons ストアロゴ: 300x300 必須・推奨規格)
- `edge_promo_440x280.png` (Edge Add-ons / Chrome Web Store 英語版小プロモーションタイル: 440x280)
- `edge_promo_440x280_ja.png` (Edge Add-ons / Chrome Web Store 日本語版小プロモーションタイル: 440x280)
- `edge_promo_1400x560.png` (Edge Add-ons 英語版大プロモーションタイル: 1400x560)
- `edge_promo_1400x560_ja.png` (Edge Add-ons 日本語版大プロモーションタイル: 1400x560)
- `opera_promo_300x188.png` (Opera Addons プロモーションタイル: 300x188 公式推奨規格)
- `banner_base_1280x800.png` (他言語作成用: テキストなしベーステンプレート)

---

## 📝 プロモーションバナー記載テキスト (多言語管理用)

バナー画像内に記載しているキャッチコピー定義です。オリジナルは**日本語**、主な多言語展開時の参照言語は**英語**として管理しています。
※テキスト定義は `docs/banner_texts.json` に保存されており、`python scripts/generate-banners.py` を実行することで全バナー画像を一括再生成できます。

### バナー 1: メイン操作画面 (`screenshot01_store_*.png`)

| 項目 | 日本語 (オリジナル) | 英語 (主な参照用) |
| :--- | :--- | :--- |
| **ヘッダー** | `GNB Twipper for Twitch` | `GNB Twipper for Twitch` |
| **メインコピー** | Twitchのフォロー配信を<br>スマートに自動巡回 | Auto-Rotate Followed<br>Twitch Streams |
| **サブコピー** | 推しの配信を快適ながら見でも ブラウザ履歴が増えません | Comfortable hands-free watching with zero history clutter |
| **カード 1** | **フォロー配信者をローテーション視聴**<br>視聴時間が短い新規配信は優先的に視聴します。 | **Rotate Followed Streamers**<br>Prioritizes newly live streams with shorter watch time. |
| **カード 2** | **オートのON/OFF、配信のスキップ**<br>Twitchのトップバーから全てのツールにアクセスできます。 | **Auto Toggle & Instant Skip**<br>Access all tools directly from the Twitch top bar. |
| **カード 3** | **履歴を増やさず自動巡回**<br>自動巡回し続けてもブラウザ履歴は増えません。 | **Clean Browser History**<br>Browser history never piles up, even during continuous rotation. |

### バナー 2: オプション設定画面 (`screenshot02_store_*.png`)

| 項目 | 日本語 (オリジナル) | 英語 (主な参照用) |
| :--- | :--- | :--- |
| **ヘッダー** | `GNB Twipper for Twitch` | `GNB Twipper for Twitch` |
| **メインコピー** | オプション画面で<br>カスタマイズもできます | Full Customization in<br>Options Page |
| **サブコピー** | 巡回間隔や除外チャンネルを あなたに合わせて調整しましょう | Tailor rotation timing and exclusions to your personal style |
| **カード 1** | **巡回間隔を変更できます**<br>巡回間隔(初期３分)をあなたの視聴スタイルに合わせて調整可能 | **Adjustable Rotation Interval**<br>Customize the interval (default 3 min) to match your rhythm. |
| **カード 2** | **とりあえずオート視聴？**<br>Twitch.tv視聴開始時にオートを開始するかを変更できます | **Auto-Start on Twitch Access?**<br>Choose whether to begin rotation automatically when opening Twitch. |
| **カード 3** | **サブスク限定配信は自動スキップ**<br>無料プレビューの間は視聴します。それともしません？ | **Skip Subscriber-Only Streams**<br>Watch during free previews, or skip immediately? You decide. |
| **カード 4** | **除外チャンネル登録**<br>24時間配信や音楽チャンネルなど巡回はしないチャンネルを除外リストに追加 | **Exclusion Channel List**<br>Exclude 24/7 loops, music bots, or specific channels from queue. |

---

## 🔒 限定公開 (Unlisted / Hidden) での公開設定手順

ストア上で**限定公開（URLを知っている人のみアクセス可能・検索結果に非表示）**として登録する場合:

### Chrome Web Store

1. Chrome Developer Dashboard の画面左メニュー **「公開 (Distribution)」 -> 「公開範囲 (Visibility)」** を開きます。
2. **「限定公開 (Unlisted)」** を選択します。
3. これにより、ストア検索一覧には掲載されず、直接URLを知っているユーザーだけがインストール可能な状態で安全に公開できます。

### Microsoft Edge Add-ons

1. Microsoft Partner Center の対象拡張機能ページから **「Availability (利用可能状況)」 -> 「Visibility (表示設定)」** を開きます。
2. **「Hidden (ストアでこの製品を非表示にする / ダイレクトリンクのみでアクセス可能)」** を選択します。
3. これにより、Edge Add-ons の検索一覧には表示されず、直接のストアURLを知っているユーザーのみがインストール可能になります。

---

## 🧪 審査担当者向けテスト手順・認定ノート (Notes for certification)

Microsoft Edge Add-ons（および Chrome Web Store / Firefox AMO）の審査提出時、**Notes for certification** 欄に以下の英文テンプレートをそのまま貼り付けてください。

### 提出用英文テンプレート

```text
Extension Overview:
GNB Twipper for Twitch injects a minimalist control bar next to the search bar on Twitch (https://www.twitch.tv/) and provides a browser action popup and options page so users can automatically rotate through live channels they follow.

How to Test:
1. Install the extension and open https://www.twitch.tv/.
2. Observe the injected GNB Twipper control bar next to the top search bar (or click the extension toolbar icon to open the popup).
3. To test live stream rotation, sign in with any standard Twitch account that follows at least 2 currently live channels, then click the "AUTO" button or the "Skip" button in the control bar/popup. The extension fetches live status via Twitch's official GraphQL API (or falls back to the sidebar DOM) and navigates smoothly between live followed streams without cluttering browser history.
4. Even without signing in to a Twitch account, you can verify the injected header control bar on Twitch.tv, open the toolbar popup, and open the Options page to configure rotation intervals, excluded channels, display language, and optional custom CSS.

Notes on Credentials & Permissions:
- No dedicated test account is provided because the extension works with any standard user Twitch account and stores all settings strictly locally in browser storage without any external backend server or third-party tracking.
- The optional "userScripts" permission is only used for advanced users who explicitly configure custom JavaScript for Twitch.tv and enable "Allow user scripts" in the browser's extension details page. Core rotation features work completely without enabling user scripts.
```

### 参考日本語訳（内容確認用）

- **概要**: Twitch.tv 上の検索バー横に操作バーを注入し、ツールバーポップアップおよびオプション画面を通じてフォロー中ライブ配信の自動巡回機能を提供します。
- **テスト手順**:
  1. 拡張機能をインストールして `https://www.twitch.tv/` を開きます。
  2. 上部検索バー横に注入された操作バー（またはツールバーの拡張機能ポップアップ）を確認します。
  3. ライブ配信中のチャンネルを2つ以上フォローしている任意のTwitchアカウントでログインし、`AUTO` または `スキップ` をクリックすると、GQL API（またはサイドバーDOMフォールバック）で配信状態を取得し、閲覧履歴を汚さずに次の配信へ切り替わります。
  4. ログインしていない状態でも、Twitch.tv 上のヘッダーUI表示、ポップアップ開閉、オプション画面での巡回間隔・除外リスト・表示言語・カスタムCSS設定の保存をテストできます。
- **認証情報および権限に関する補足**:
  - 通常の個人Twitchアカウントで動作し、外部サーバーやサードパーティトラッキングを持たず全設定をローカル保存するため、専用テストアカウントは不要です。
  - `userScripts` 権限は拡張機能詳細ページで「ユーザースクリプトを許可する」を有効にした上級者の任意機能でのみ使用され、通常の自動巡回機能には不要です。

---

## 申請時に使用する使用権限 (Permissions) の理由説明書

ストア審査提出時、`manifest.json` で要求している各権限の用途について以下の通り説明を入力してください:

**単一用途**: Twitchでフォローしているライブ配信を自動巡回・視聴制御します。

| 権限 (Permission) | 申請理由・使用目的 |
| :--- | :--- |
| `storage` | ユーザーの設定（巡回間隔、除外チャンネル一覧など）をブラウザ内にローカル保存するため。 |
| `alarms` | CPU負荷をかけずに高精度な自動巡回タイマー処理を実行するため。 |
| `userScripts` | ユーザーが設定したカスタム JavaScript ロジックをブラウザのセキュリティ規格に準拠して安全に実行するため。 |
| `cookies` | タブ切り替え時やセッション修復時にTwitchログイン状態を維持するため。 |
| `tabs` | 自動巡回の切り替え操作、およびチャット・プレイヤーの連携制御のため。 |
| `webRequest` | TwitchのGraphQL通信ヘッダーからClient-IDを自動検出し、認証と配信中リスト取得の安定性を確保するため。 |
| ホスト権限: `https://www.twitch.tv/*`, `https://gql.twitch.tv/*` | TwitchのウェブUIおよびFollow一覧取得API/GQLと通信を行うため。 |
