# 0) 設計の前提（1行で方針）

**「契約（contract）」を中心に、請求（invoice）と入金（payment）を分離し、外部連携（route / monthlypay）は“参照ID＋イベントログ”で保持する。**

→ これで「後追い」「監査」「復旧」ができます。

---

# 1) コアER（リレーション骨格）

## テーブル一覧（最小で強い構成）

* **orgs** （自社組織 / あなたの会社）※将来マルチテナントなら必須
* **users** （Supabase Auth）
* **stores** （店舗）
* **contracts** （契約：中心）
* **plans** （プラン定義）
* **invoices** （請求：請求書払いを含む）
* **payments** （入金：月額ペイ結果もここ）
* **integrations_route** （ルート連携の“現在状態”）
* **integration_events** （外部イベントのログ：月額ペイWebhook、ルート稼働/削除など）
* **notifications** （送信ログ：督促/請求書送付）
* **ops_logs** （人間がやった操作ログ：ステータス変更、手動対応）

---

# 2) リレーション定義（実務で効く形）

## orgs 1 - N stores

* orgs.id → stores.org_id

## stores 1 - N contracts

* stores.id → contracts.store_id

## plans 1 - N contracts

* plans.id → contracts.plan_id

  （プランは“契約時点のスナップショット価格”も contracts に持つのが重要）

## contracts 1 - N invoices

* contracts.id → invoices.contract_id

  （請求書払いは invoice を起点に運用する）

## invoices 1 - N payments

* invoices.id → payments.invoice_id（nullable）

  （月額ペイは invoice なしで payment を立てる設計も可能。後述の方針で統一する）

## contracts 1 - N payments

* contracts.id → payments.contract_id（必須）

  （payment は必ず契約に紐づく）

## contracts 1 - 1 integrations_route（基本は1つ）

* contracts.id → integrations_route.contract_id（unique）

## contracts 1 - N notifications / ops_logs / integration_events

* 監査・運用ログ類は全部 contracts に寄せると検索が爆速

---

# 3) 状態（ステータス）をどう持つか：重要ポイント

「契約ステータス」と「入金ステータス」と「ルート稼働」を混ぜると死にます。

* **contracts.status** ：契約のライフサイクル
* lead（見込み）
* closed_won（契約成立）
* active（稼働中）
* cancel_pending（解約予定）
* cancelled（解約完了）
* **payments.status** ：入金の結果
* pending / succeeded / failed / refunded / chargeback
* **integrations_route.status** ：ルート側状態
* preparing / running / paused / deleting / deleted / error

そして「active なのに未入金」みたいな矛盾を許す（現実に起きる）代わりに、

**UIで“危険シグナル”として炙り出す**のが強い。

---

# 4) Postgres（Supabase）想定のテーブル設計（フィールド例）

※カラムは要点だけ。UUID前提。

## stores

* id, org_id
* name, name_kana, legal_name
* phone, address, prefecture, city
* industry
* created_at, updated_at

 **検索用** ：

* `search_text`（name / kana / phone / address を連結してGIN index）

## plans

* id, org_id
* name
* monthly_price
* setup_fee (optional)
* is_active

## contracts（中心）

* id, org_id, store_id, plan_id
* status
* start_date, end_date (nullable)
* billing_method（monthlypay / invoice）
* contract_monthly_price_snapshot（契約時の価格固定）
* sales_owner_user_id（塗装部隊の担当）
* ops_owner_user_id（運用担当）
* cancellation_requested_at, cancellation_effective_date
* notes
* created_at, updated_at

## invoices（請求書）

* id, org_id, contract_id
* billing_month（YYYY-MM-01みたいに月初日で固定すると楽）
* amount
* status（draft / sent / paid / overdue / void）
* due_date
* pdf_url（DriveなどのURL）
* sent_at

## payments（入金）

* id, org_id, contract_id, invoice_id (nullable)
* provider（monthlypay / bank_transfer / manual）
* provider_payment_id（外部決済ID）
* amount
* currency
* status
* paid_at (nullable)
* failure_reason (nullable)
* created_at

## integrations_route（ルートの現在）

* id, org_id, contract_id (unique)
* route_customer_id / route_store_id（外部ID）
* status
* running_started_at, stopped_at
* last_error
* updated_at

## integration_events（外部イベントログ）

* id, org_id, contract_id
* source（monthlypay / route）
* event_type（payment_succeeded 等）
* external_id（イベントID）
* payload jsonb（生データ保持）
* received_at

## notifications（送信ログ）

* id, org_id, contract_id, invoice_id (nullable), payment_id (nullable)
* type（invoice_sent / payment_failed / reminder_1 / reminder_2 / cancel_confirm etc）
* channel（email）
* to_email
* subject
* status（queued / sent / failed）
* error_message
* sent_at

## ops_logs（人間の操作ログ）

* id, org_id, contract_id
* actor_user_id
* action（status_changed / note_added / route_manual_updated etc）
* before jsonb / after jsonb（差分を入れると監査強い）
* created_at

---

# 5) “月額ペイ vs 請求書”を統一する現実的ルール

ここ、曖昧だと毎月バグる。

おすすめは **「毎月必ず invoice を作る」**統一方式です。

* 月額ペイでも `invoices` を毎月自動生成（status = paid まで行く）
* 月額ペイWebhookで `payments` 作成 → 対応する `invoice.status = paid` 更新
* 請求書払いは invoice を sent → 入金が来たら payment を作り invoice を paid

メリット：

* **「今月の売上・未収・遅延」が1クエリ**で取れる
* 検索画面が単純になる
* 監査と数字がズレにくい

デメリット：

* invoice生成バッチが必要（でもこれは普通にやる）

---

# 6) 検索（カラム検索）をDB設計で勝たせる

Supabase(Postgres)なら、これで“FileMaker的な快感”が出ます。

* stores.search_text に `to_tsvector` を入れて **全文検索（FTS）**
* contracts に index
  * (org_id, status)
  * (org_id, billing_method)
  * (org_id, plan_id)
  * (org_id, sales_owner_user_id)
* invoices に index
  * (org_id, billing_month, status)
  * (org_id, due_date, status)

**UI側は**

* 左：フィルタ（status / plan / billing / 担当 / 月）
* 上：フリーワード（店舗名・電話・住所）

  で、DB側のindexに乗せる。

---

# 7) 自動化の実装ポイント（Supabaseでの現実解）

* Webhook受信： **Supabase Edge Functions** （月額ペイ / ルート）
* 月次バッチ（invoice自動生成、督促判定）：
  * Edge Functions +  **cron** （Supabase Scheduled Functionsが使えるならそれ）
  * もしくは外部のGitHub ActionsでもOK（堅い）

---

# 8) セキュリティ（RLS）を最初に決める

多分あなたは将来、複数チーム/担当で使う。なのでRLSは必須。

* 全テーブルに org_id
* `auth.uid()` が属する org を `org_members` テーブルで管理
* RLSポリシーは基本「org_id一致のみ可」
* ops_logs / integration_events は読み取り権限を絞る（改ざん防止）

---

# 9) 次にやるべきこと（順番を間違えると手戻りする）

1. **ステータス一覧（contracts / invoices / payments / route）を確定**
2. **月額ペイ・ルートの“取得できるIDとイベント”を箇条書き** （API前提か手動前提か）
3. その前提で **ERDを確定→DDL（SQL）に落とす**
4. 画面（Tailwind）
   * 契約詳細（中心）
   * 店舗検索
   * 今月の請求/未入金
   * 解約待ち
   * ルートエラー一覧

---

このままいくと次は、僕が **DDL（Supabase用SQL）** を“そのまま貼って動く形”で出せます。

ただし、月額ペイとルートについて **「Webhookがあるのか／ないのか」「取得できる外部IDは何か」**だけは、仕様の分岐点なので、あなたが今知ってる範囲で“事実だけ”箇条書きにしてくれれば、そこから確定させます。

次にこのシステムの文面での要検定気を作成してください。

了解。

ここでは **「実装者・意思決定者・将来の自分」**の全員が同じ絵を見られるように、

**文面だけで成立する要件定義（＝要検定義書レベル）**を作る。

※営業資料でも仕様書でもなく、「基幹システムの憲法」だと思って読める構造にする。

---

# お任せAI管理システム

## 要件定義書（文面版・v1.0）

---

## 1. システムの目的

本システムは、MEO特化型ツール事業における

**営業 → 契約 → 初回決済 → 稼働 → 継続課金 → 解約**

までの一連の業務を、一気通貫で管理・可視化・自動化することを目的とする。

外部サービス（月額ペイ、MEOツールのルート）に依存しつつも、

**契約・請求・入金・稼働状態の正本データは常に自社が保持**する設計とする。

---

## 2. システムの基本思想（非機能要件の前提）

* 本システムは **基幹システム（Single Source of Truth）** である
* 外部サービスは「参照・実行先」であり、「正本」ではない
* 状態の不整合（例：稼働中だが未入金）は**現実として許容**し、

  それを**検知・警告できる設計**とする
* 検索性・一覧性を最重要視し、

  **FileMaker的な“条件検索の快感”をWebで再現**する

---

## 3. 対象ユーザーと権限

### 3.1 想定ユーザー

* 管理者（経営・全体管理）
* 営業担当（塗装部隊）
* 運用担当（MEO運用・請求管理）

### 3.2 権限の基本方針

* 自組織（org）に属するデータのみ閲覧・操作可能
* ステータス変更・請求確定などは権限を制御
* 操作履歴はすべてログとして保存される

---

## 4. 業務フロー要件

### 4.1 営業〜契約フェーズ

1. 営業担当は店舗情報を登録する
2. 契約条件（プラン、支払い方法、開始月）を入力する
3. 契約が成立した時点で、契約ステータスを「契約成立」に変更する

※この時点では、MEOツールの稼働は開始されない

---

### 4.2 初回決済フェーズ（月額ペイ）

1. 契約成立後、初回決済を月額ペイで実施する
2. 月額ペイの決済成功をもって「初回入金完了」とする
3. 初回入金が確認された場合、以下を自動で実行する
   * 契約ステータスを「稼働中」に変更
   * MEOツール（ルート）側のステータスを「稼働」に変更

---

### 4.3 MEOツール稼働管理

* 契約ごとに、MEOツールの稼働状態を管理する
* 稼働状態は以下を持つ
  * 準備中
  * 稼働中
  * 停止中
  * 削除中
  * 削除済
  * エラー
* 稼働状態は契約ステータスとは独立して管理される

---

### 4.4 継続課金・請求管理

#### 共通方針

* **すべての契約は毎月1件の請求データを持つ**
* 支払い方法にかかわらず、月次請求を正として管理する

#### 月額ペイの場合

* 毎月、請求データを自動生成する
* 月額ペイからの決済結果を受信し、入金ステータスを更新する
* 決済失敗時は、自動で通知・督促対象とする

#### 請求書払いの場合

* 毎月、請求書PDFを自動生成する
* メールにて請求書を送付する
* 入金確認後、入金ステータスを更新する

---

### 4.5 未入金・督促管理

* 未入金状態は以下を管理対象とする
  * 未入金日数
  * 督促回数
  * 最終督促日
* 督促は段階的に行い、送信履歴を必ず保存する
* 未入金状態でも、即時に稼働停止は行わない（手動判断）

---

### 4.6 解約管理

1. 解約申請を受けた場合、契約ステータスを「解約予定」に変更する
2. 最終請求・最終入金の確認を行う
3. **夜勤入金ステータスをON**にし、最終入金を監視する
4. 最終入金が確認された時点で以下を実行する
   * MEOツール（ルート）を削除または停止
   * 契約ステータスを「解約完了」に変更

---

## 5. データ管理要件

### 5.1 管理対象データ

* 店舗情報
* 契約情報
* プラン情報
* 請求情報
* 入金情報
* MEOツール連携情報
* 通知履歴
* 操作ログ

### 5.2 正本性

* 本システム上のデータを正とする
* 外部システムのデータは参照情報として保持する

---

## 6. 検索・一覧要件（重要）

以下の条件で高速に検索・一覧表示ができること。

* 店舗名（部分一致）
* 法人名
* プラン
* 契約ステータス
* 支払い方法
* 請求月
* 入金ステータス
* 営業担当
* 運用担当
* 稼働状態（MEO）

また、以下の定型一覧を常に表示可能とする。

* 稼働中一覧
* 未入金一覧
* 決済失敗一覧
* 解約予定一覧
* ルートエラー一覧

---

## 7. 通知要件

* 以下の通知を自動送信可能とする
  * 請求書送付
  * 決済失敗通知
  * 督促通知
  * 解約確認通知
* 通知はすべてログとして保存される
* 送信失敗時は再送可能とする

---

## 8. バックアップ要件

* データは毎日19時に自動バックアップされること
* バックアップは世代管理されること
* バックアップデータは別ストレージに保管されること
* 監査・参照用として、Excel形式でのデータ出力を可能とする

---

## 9. 技術要件（確定事項）

* フロントエンド
  * TypeScript
  * Tailwind CSS
* バックエンド
  * Supabase（PostgreSQL）
  * Supabase Auth
  * Supabase Edge Functions
* 外部連携
  * 月額ペイ
  * MEOツール（ルート）

---

## 10. 将来拡張を考慮した前提

* マルチ組織対応を前提とする
* プラン・料金体系は将来変更可能である
* 他の決済手段・他のMEOツール追加を阻害しない設計とする

---

## 11. この要件定義のゴール

本要件定義は、

**「誰が読んでも、どんなシステムを作るかがズレない」**

ことをゴールとする。

---

ここまでが  **文面としての要件定義（検定義レベル）** 。

次の一手として正解なのはどちらかです：

* **A. この要件定義を元に画面構成（UI）を決める**
* **B. この要件定義を元にDDL（SQL）を確定させる**

どちらから行くかで開発スピードが変わる。

あなたの今のフェーズ的には **B → A** が最短だが、判断は任せる。

Aを進めよう！こだわりたいです

了解。UIから詰めるのはアリ。ただし先に釘を刺すと、 **UIにこだわる人ほど「何を最短で判断できる画面か」を決めずに装飾に溺れて遅れる** 。

だから、こだわるなら“美しさ”じゃなくて **判断の速さ**にこだわれ。そこに全振りでいく。

---

# UI設計（A）— 画面構成・導線・コンポーネント要件（v1）

## 1) UIのゴール（このシステムで毎日やること）

毎日・毎分の運用で本当にやるのはこの4つだけ：

1. **検索して1件を開く** （店舗/契約）
2. **危険な案件を見つける** （未入金、決済失敗、ルートエラー、解約待ち）
3. **状態を進める** （請求送付、督促、入金反映、稼働開始、停止/削除）
4. **履歴を残す** （ログ/証跡）

UIはこの4つの速度を最大化する。

---

## 2) 情報設計（IA：画面一覧）

左サイドバー想定（モバイルはドロワー）で最小7画面。

1. **ダッシュボード**
2. **店舗検索**
3. **契約一覧**
4. **請求（今月）**
5. **未入金/督促**
6. **解約管理**
7. **設定（プラン/テンプレ/権限）**

詳細は「店舗詳細」「契約詳細」「請求詳細」を右に深掘る。

---

## 3) 最重要：上部グローバル検索（FileMakerの快感を再現）

全画面共通ヘッダーに **1本の検索バー**を置く。

* 入力：店舗名/カナ/電話/住所の断片
* Enterで検索結果モーダル（10件）
* 上下キーで選択、Enterで遷移
* ここが遅いと全部遅い

 **検索結果カード表示** （1行で判断できる）

* 店舗名（太字） / 都道府県
* 契約状態バッジ（active / overdue / cancel_pending 等）
* 支払い方法（monthlypay / invoice）
* 今月請求ステータス（paid / overdue）

---

## 4) ダッシュボード（最初に開く画面）

「美しいだけ」ではなく、**危険の優先順位**が見えること。

### 4.1 上段：KPIカード（4〜6枚）

* 稼働中（active）
* 今月売上見込み（invoice合計）
* 未入金（overdue件数）
* 決済失敗（failed）
* 解約予定（cancel_pending）
* ルートエラー（route error）

クリックで該当一覧にドリルダウン。

### 4.2 中段：アラートテーブル（優先順）

1. 決済失敗（今日発生）
2. 請求期限超過（7日以上）
3. ルートエラー（稼働に影響）
4. 解約：最終入金待ち

テーブル列（固定）

* 店舗名 / プラン / 支払い / 状態 / “次にやること” / 担当 / 最終更新

### 4.3 右側：今日のタスク（自動生成）

* 請求書送付待ち
* 督促1回目対象
* 解約確認が必要
* ルート削除待ち

---

## 5) 一覧画面の共通UIルール（ここを統一すると“基幹っぽく”なる）

全一覧は共通レイアウト：

* 左： **フィルタパネル** （折りたたみ可）
* 右：**結果テーブル**
* 上： **クイックフィルタチップ** （active / overdue / failed / cancel_pending）
* 右上：エクスポート（CSV）・一括アクション（権限ありのみ）

### 5.1 フィルタ項目（共通）

* ステータス（複数）
* プラン（複数）
* 支払い方法
* 担当（営業/運用）
* 月（請求月）
* 都道府県

### 5.2 テーブルの固定列（おすすめ）

* 店舗名（リンク）
* 契約ステータス（バッジ）
* 今月請求（バッジ）
* 入金状況
* ルート状態
* 次アクション（ボタン/リンク）
* 担当
* 最終更新

**「次アクション」列がこのシステムの魂。**

ここがあると運用が速くなる。

---

## 6) 店舗詳細（CRMの顔）

### 6.1 上部ヘッダー（1スクリーンで把握）

* 店舗名 / 住所 / 電話
* 現在の契約ステータス（最大1つを“現在”として表示）
* 連絡先
* ルート稼働バッジ

### 6.2 タブ構成

* 概要
* 契約
* 請求/入金
* 通知
* 操作ログ

---

## 7) 契約詳細（このシステムの“司令室”）

契約詳細は **3カラム**が理想（広い画面）。

* 左：契約要約（状態・プラン・支払い）
* 中央：請求/入金タイムライン
* 右：次アクション＋外部連携状態＋ログ

### 7.1 重要コンポーネント：状態遷移バー

* lead → closed_won → active → cancel_pending → cancelled
* クリックで変更できるのは権限者のみ
* 変更時は必ず理由入力（短文）→ ops_log保存

### 7.2 重要：請求/入金タイムライン

月ごとのカードを縦に並べる（一覧性）

* 2026/01 請求：sent / paid / overdue
* 入金：succeeded / failed
* アクション：再送 / 入金記録 / 督促送信

---

## 8) 請求（今月）画面

「今月何を送るべきか」が一瞬でわかる。

* タブ：未送付 / 送付済 / 入金済 / 期限超過
* 一括：請求書生成 → 送付（※権限者のみ）
* 行アクション：PDF再生成、送付履歴、送付先変更

---

## 9) 未入金/督促 画面

ここは“戦場”。余計な装飾禁止。

* overdue日数で自動ソート（長い順）
* 督促ステージ（0/1/2/最終）
* 送信テンプレ選択→送信→ログ保存
* 「督促したのに反応ない」案件に **架電タスク**を作れる（ops_log）

---

## 10) 解約管理 画面（夜勤入金ステータス）

* cancel_pending一覧
* 最終請求/最終入金の状況
* 夜勤入金ステータス（ON/OFF）
* 入金確認後： **ルート削除/停止ボタン** （実行前に確認モーダル＋理由）

---

## 11) UIデザイン原則（Tailwindで統一すべきルール）

こだわりポイントはここ。**“統一感”は設計で出る。色じゃない。**

* バッジ（status）は4色カテゴリだけに制限
  * success / warning / danger / neutral

    ※ステータスが増えても破綻しない
* 1画面1主役（主ボタンは常に1つ）
* 表は「行間」「固定列」「行ホバー」で読ませる
* モーダルは2種類だけ
  * 変更確認
  * 詳細編集

    （増やすほど混乱する）

---

# 次：あなたに決めてほしい“こだわりの核”（質問じゃなく選択肢）

UIにこだわるなら、まずどれを最優先にするかを固定する。選べ。

1. **爆速検索** （FileMaker超え）
2. **督促・請求のオペ速度** （毎月の戦闘力）
3. **監査ログの強さ** （揉めない・証跡で勝つ）
4. **エラー運用** （ルート/決済失敗の復旧速度）

全部やるのは当然として、**最初に魂を入れる1つ**を決めるとUIの全判断がブレなくなる。

---

ここから先は、上の画面を **ワイヤーフレーム（文章で）→ コンポーネント分解 → ルーティング設計（Next.js想定）** まで落としていける。

次の出力は「各画面の具体レイアウト（セクション単位）＋表示項目一覧＋ボタンと権限＋状態遷移のUI仕様」まで一気に書く。

次にOpen ai apiをどこに組み込むか。精査して

了解。ここは“AIを入れれば良くなる”じゃなくて、**どこに入れると運用が速くなり、ミスが減り、売上が守れるか**で精査する。

結論から言うと、この基幹にOpenAI APIを入れる場所は  **3つだけ本命** 。他は趣味枠（後回し）です。

---

# まず前提：OpenAIを入れる目的を3つに限定する

1. **入力の品質を上げる（表記ゆれ/欠損/誤りを減らす）**
2. **判断を速くする（次にやることを自動提示）**
3. **連絡を速くする（請求/督促/解約の文章生成）**

これ以外にAIを入れると、たいてい「コストと複雑性だけ増えて終わり」。

---

# 本命①：請求・督促・解約の「文章生成エンジン」

### なぜここが本命か

* 毎月必ず発生する運用で、**人が時間を吸われる**
* ミスると回収率が落ち、解約やクレームが増える
* テンプレはあっても、状況ごとの微調整がだるい

### 何をAIにやらせるか（現実的に効く範囲）

* 入金失敗理由/延滞日数/督促回数/契約条件を踏まえた **メール文の自動作成**
* 「丁寧」「強め」「最終通告」など **トーン選択**
* **件名最適化** （開封率に直結）
* 解約時の **確認文・最終請求案内・停止予定通知** の生成

### 実装ポイント（TS + Supabase）

* `notifications` に `template_id` と `ai_draft`（下書き）を持たせる
* 送信前に  **必ず人間が確認** （誤送信リスク対策）
* Edge Function：`POST /ai/draft-notification`
  * 入力：contract_id / invoice_id / type / tone
  * 出力：subject/body（＋差し込み済みの確定文章）

**ここは費用対効果が最強。** 真面目に“人件費を削る”より“回収率を上げる”方が効く。

---

# 本命②：「次アクション」自動提案（運用の司令塔）

UI設計で言ってた魂の列「次アクション」。ここにAIを入れると運用が速くなる。

### やること

* 契約・請求・入金・ルート状態・ログを見て
  * 「請求書未送付 → 送付」
  * 「決済失敗 → 再決済依頼テンプレ＋架電タスク」
  * 「解約予定かつ最終入金待ち → 夜勤入金ON維持」
  * 「ルート error → ルート再同期/手動確認」

    みたいな **推奨アクションを1〜3個**出す。

### 重要：AIに“決定”はさせない

* AIは提案だけ。実行はボタンで人間が押す。
* 監査上も安全。

### 実装ポイント

* Edge Function：`POST /ai/next-actions`
* `contracts`を中心に最新の `invoice/payment/route/ops_logs` を集約して投げる
* 出力は  **構造化JSON** （UIでそのままボタンにできる）
  * `[{action_key, label, reason, priority, suggested_template_id}]`

---

# 本命③：データの「表記ゆれ正規化」「不足検知」

基幹は検索が命。検索が死ぬ原因は表記ゆれと欠損。

### やること

* 店舗名/法人名/住所の正規化（全角半角、カナ、株式会社表記）
* 電話番号フォーマット統一
* 住所から都道府県/市区町村を推定（検索フィルタで超効く）
* 入力内容の不足検知（請求書払いなのにメールが無い等）

### 実装ポイント

* `stores` 保存時に同期実行してもいいが、
  * 重いなら「保存→非同期正規化→上書き」でもOK
* Edge Function：`POST /ai/normalize-store`
* 出力は必ず  **差分形式** （before/after）で ops_logs に保存

※ここはAIじゃなくてもルールベースで大半いける。

でも、住所の揺れ・法人名の揺れはLLMが強い。

---

# 準本命（やるなら後で）：問い合わせ・社内ナレッジのRAG

「この店舗の経緯どうだっけ？」をチャットで答えるやつ。便利だけど、優先順位は本命3つより下。

### どうやる

* `ops_logs / notifications / integration_events` を embeddings 化して
* Supabase（pgvector）に保存
* 「契約詳細ページの右側にAIコパイロット」

**注意：** 初期は作っても使われないことが多い。運用が回り始めてから。

---

# やらない方がいい（今は）

* ルート削除/停止をAIが自動実行（事故る）
* 自動で督促を送信（誤送信・炎上リスク）
* “全部の文章をAIに任せる”全面自動（運用が不透明になり責任が死ぬ）

---

# セキュリティ/運用の設計（ここを外すと終わる）

OpenAI API組み込みで守るべきルール：

* **PII最小化** ：必要な項目だけ送る（電話/住所は原則送らない設計で回す）
* **ログに生プロンプトを残さない** （残すならマスク）
* 送るデータは `org_id` と紐づく範囲だけ（RLSの思想を維持）
* 生成物は必ず `notifications` に保存して監査できるようにする
* モデル切替・プロンプトはDBでバージョニング（テンプレIDで管理）

---

# 組み込み場所（アーキテクチャ的に）

* フロント（Next.js/TS/Tailwind）
  * AIは直接呼ばない（鍵漏洩・権限事故）
* **Supabase Edge Functions** 経由でOpenAI APIを呼ぶ
  * 認可：JWT → org_id確認 → 実行
* 非同期処理（正規化/embedding）は
  * Edge Function + Queue的運用（なければ cron + 再試行設計）
* 

# 1) 実装対象：/ai/draft-notification（Edge Function）

## 1.1 目的

契約・請求・入金・督促履歴などの状況に応じて、

**メール件名＋本文の下書き**を生成し、`notifications` に保存する。

* 自動送信はしない（必ず人間が確認）
* 生成物は監査できる（いつ・誰が・何を生成したか）

---

# 2) エンドポイント仕様（入出力JSON）

## 2.1 Request

<pre class="overflow-visible! px-0!" data-start="308" data-end="730"><div class="contain-inline-size rounded-2xl corner-superellipse/1.1 relative bg-token-sidebar-surface-primary"><div class="sticky top-[calc(--spacing(9)+var(--header-height))] @w-xl/main:top-9"><div class="absolute end-0 bottom-0 flex h-9 items-center pe-2"><div class="bg-token-bg-elevated-secondary text-token-text-secondary flex items-center gap-4 rounded-sm px-2 font-sans text-xs"></div></div></div><div class="overflow-y-auto p-4" dir="ltr"><code class="whitespace-pre! language-json"><span><span>{</span><span>
  </span><span>"org_id"</span><span>:</span><span></span><span>"uuid"</span><span>,</span><span>
  </span><span>"contract_id"</span><span>:</span><span></span><span>"uuid"</span><span>,</span><span>
  </span><span>"invoice_id"</span><span>:</span><span></span><span>"uuid|null"</span><span>,</span><span>
  </span><span>"notification_type"</span><span>:</span><span></span><span>"invoice_send|payment_failed|reminder_1|reminder_2|final_notice|cancel_confirm|cancel_final_payment|route_error"</span><span>,</span><span>
  </span><span>"tone"</span><span>:</span><span></span><span>"polite|firm|final"</span><span>,</span><span>
  </span><span>"channel"</span><span>:</span><span></span><span>"email"</span><span>,</span><span>
  </span><span>"language"</span><span>:</span><span></span><span>"ja"</span><span>,</span><span>
  </span><span>"constraints"</span><span>:</span><span></span><span>{</span><span>
    </span><span>"max_length_body"</span><span>:</span><span></span><span>1200</span><span>,</span><span>
    </span><span>"include_payment_link"</span><span>:</span><span></span><span>true</span><span></span><span>,</span><span>
    </span><span>"include_invoice_pdf_link"</span><span>:</span><span></span><span>true</span><span>
  </span><span>}</span><span>
</span><span>}</span><span>
</span></span></code></div></div></pre>

## 2.2 Response

<pre class="overflow-visible! px-0!" data-start="748" data-end="1092"><div class="contain-inline-size rounded-2xl corner-superellipse/1.1 relative bg-token-sidebar-surface-primary"><div class="sticky top-[calc(--spacing(9)+var(--header-height))] @w-xl/main:top-9"><div class="absolute end-0 bottom-0 flex h-9 items-center pe-2"><div class="bg-token-bg-elevated-secondary text-token-text-secondary flex items-center gap-4 rounded-sm px-2 font-sans text-xs"></div></div></div><div class="overflow-y-auto p-4" dir="ltr"><code class="whitespace-pre! language-json"><span><span>{</span><span>
  </span><span>"notification_id"</span><span>:</span><span></span><span>"uuid"</span><span>,</span><span>
  </span><span>"subject"</span><span>:</span><span></span><span>"string"</span><span>,</span><span>
  </span><span>"body"</span><span>:</span><span></span><span>"string"</span><span>,</span><span>
  </span><span>"placeholders_used"</span><span>:</span><span></span><span>[</span><span>"{{store_name}}"</span><span>,</span><span></span><span>"{{amount}}"</span><span>,</span><span></span><span>"..."</span><span>]</span><span>,</span><span>
  </span><span>"risk_flags"</span><span>:</span><span></span><span>[</span><span>
    </span><span>{</span><span>"code"</span><span>:</span><span>"MISSING_EMAIL"</span><span>,</span><span></span><span>"message"</span><span>:</span><span>"送付先メールが未登録です"</span><span>}</span><span>,</span><span>
    </span><span>{</span><span>"code"</span><span>:</span><span>"OVERDUE_DAYS_HIGH"</span><span>,</span><span></span><span>"message"</span><span>:</span><span>"延滞が14日以上です"</span><span>}</span><span>
  </span><span>]</span><span>,</span><span>
  </span><span>"model_info"</span><span>:</span><span></span><span>{</span><span>"model"</span><span>:</span><span>"..."</span><span>,</span><span></span><span>"prompt_version"</span><span>:</span><span>"v1.2"</span><span>}</span><span>
</span><span>}</span><span>
</span></span></code></div></div></pre>

---

# 3) DB（notifications）の最低フィールド

`notifications` テーブルにこれを持たせると運用が崩れない。

* `id, org_id, contract_id, invoice_id, payment_id`
* `type`（notification_type）
* `channel`（email）
* `to_email`
* `subject`
* `body`
* `status`（draft|queued|sent|failed）※まずはdraftでOK
* `created_by`（auth.uid）
* `created_at`
* `ai_meta jsonb`（model / prompt_version / tokens / cost_estimate）
* `risk_flags jsonb`

 **ポイント** ：生成→保存→UIで編集→送信（送信ログ更新）という順にする。

---

# 4) “差し込み変数”の設計（テンプレ崩壊を防ぐ）

文章生成を安定させるには、AIに丸投げせず **変数を先に確定**させる。

## 4.1 代表的な差し込み（最小セット）

* `store_name`
* `contract_plan_name`
* `billing_month`
* `amount`
* `due_date`
* `overdue_days`
* `payment_method`
* `invoice_pdf_url`（請求書払いのみ）
* `payment_link`（月額ペイ再決済リンクなどがあるなら）
* `support_contact`（あなたの会社の連絡先）
* `operator_name`（署名）

この変数は **Edge Function側でDBから集めて確定**し、AIには「文章に埋め込む」だけさせる。

（AIに金額や日付を計算させるのは事故る）

---

# 5) “AIプロンプト”の方針（テンプレID方式）

プロンプトは1枚岩にしない。

**notification_typeごとにテンプレ骨格**を分けて、モデルには「言い回し最適化」をやらせる。

## 5.1 System（固定）

* あなたの会社として送る
* 誇張禁止 / 推測禁止
* 丁寧語、短文、要点先出し
* 重要情報（期限・金額・リンク・連絡先）を必ず含める
* PIIは入れない（住所や電話は不要なら出さない）

## 5.2 Developer（構造指定：JSONではなく文章出力）

* 出力フォーマット：
  * 1行目：件名
  * 空行
  * 本文（署名含む）
* 文字数制限
* 禁止表現（脅迫、法的断定、感情的表現）

## 5.3 User（入力：確定変数＋状況）

* ここに「延滞日数」「督促回数」「失敗理由」「請求書URL」などの事実だけを渡す

---

# 6) “リスクフラグ”のロジック（AIに任せない）

AIは文章係。**危険判定はルール**でやる。

例：

* `to_email` が空 → `MISSING_EMAIL`
* `invoice_pdf_url` が必要なのに空 → `MISSING_INVOICE_URL`
* `overdue_days >= 14` → `OVERDUE_DAYS_HIGH`
* `reminder_count >= 2` → `REMINDER_ESCALATE`
* `amount <= 0` → `AMOUNT_INVALID`

これをレスポンスに付けてUIで警告表示。

---

# 7) Edge Function実装の流れ（実務手順）

1. JWT検証 → org所属チェック（RLS思想）
2. `contract_id` から店舗・契約・請求・入金・督促履歴を取得
3. 変数（placeholders）を確定
4. `notification_type` に応じたテンプレ骨格を選択
5. OpenAIへ生成依頼（温度低め）
6. 結果を `notifications(status=draft)` として保存
7. `risk_flags` を付与して返す

---

# 8) モデル選定の考え方（ここはブレないルール）

* 通知文は「正確さ・安定・再現性」が最重要

  → **temperatureは低め（0.2〜0.4）**
* 高い創造性は不要
* 文章だけなら軽めモデルでもいいが、**“事故らない”が最優先**

  （モデル名はあなたの運用方針に合わせて後で差し替え可能にして、DBに `model_name` を持たせるのが正解）

---

# 9) UI組み込み（どこに置くか）

## 契約詳細ページの右ペインに「通知」カードを置く

* ボタン：
  * 「請求書送付の下書き」
  * 「督促（1回目）」
  * 「督促（2回目）」
  * 「最終通知」
  * 「解約確認」
* クリック → 下書き生成 → **編集可能なエディタ**に表示 → 「送信へ」

## 送信前チェック（強制）

* 宛先メール
* 店舗名
* 金額
* 期限
* リンク（あれば）

  この4つはチェックボックスで確認させる。

  （ここを省くと、いつか盛大にやらかす）


# 共通仕様（全テンプレ共通）

## 共通：件名ルール

* 先頭に【要対応】/【ご案内】/【重要】のいずれか（typeで固定）
* 店舗名は必ず含める（`{{store_name}}`）
* 月次なら請求月を含める（`{{billing_month}}`）
* 余計な煽り表現は禁止（“至急！今すぐ！”連発など）

## 共通：本文の必須ブロック順

1. 宛名（店舗名 or 担当者名があるなら）
2. 目的の一文（何の連絡かを最初に言い切る）
3. 事実（請求/入金/期限/状態）
4. 相手にやってほしいこと（箇条書き最大3つ）
5. リンク/添付/支払い手段（該当時のみ）
6. 期限（ある場合は明示）
7. 困ったときの連絡先
8. 署名

## 共通：禁止

* 法的断定（「法的措置を取ります」などは原則NG）
* 事実不明の推測（「お忙しいと思いますが」程度はOK、原因推測はNG）
* 個人情報の羅列（住所・電話は原則入れない）
* 感情的表現（怒り、皮肉）

## 共通：署名（差し込み）

<pre class="overflow-visible! px-0!" data-start="618" data-end="737"><div class="contain-inline-size rounded-2xl corner-superellipse/1.1 relative bg-token-sidebar-surface-primary"><div class="sticky top-[calc(--spacing(9)+var(--header-height))] @w-xl/main:top-9"><div class="absolute end-0 bottom-0 flex h-9 items-center pe-2"><div class="bg-token-bg-elevated-secondary text-token-text-secondary flex items-center gap-4 rounded-sm px-2 font-sans text-xs"></div></div></div><div class="overflow-y-auto p-4" dir="ltr"><code class="whitespace-pre!"><span><span>――――――――――
{{company_name}}
{{operator_team_or_name}}
メール：{{support_email}}
（受付時間：{{support_hours}}）
――――――――――
</span></span></code></div></div></pre>

---

# 1) invoice_send（請求書送付）

## 件名（固定骨格）

【ご案内】{{store_name}}様｜{{billing_month}}分 ご請求書の送付（{{amount}}）

## 本文テンプレ骨格

<pre class="overflow-visible! px-0!" data-start="854" data-end="1149"><div class="contain-inline-size rounded-2xl corner-superellipse/1.1 relative bg-token-sidebar-surface-primary"><div class="sticky top-[calc(--spacing(9)+var(--header-height))] @w-xl/main:top-9"><div class="absolute end-0 bottom-0 flex h-9 items-center pe-2"><div class="bg-token-bg-elevated-secondary text-token-text-secondary flex items-center gap-4 rounded-sm px-2 font-sans text-xs"></div></div></div><div class="overflow-y-auto p-4" dir="ltr"><code class="whitespace-pre!"><span><span>{{store_name}}様

いつもお世話になっております。{{company_name}}です。
{{billing_month}}分のご請求書をお送りいたします。

■ご請求内容
・対象月：{{billing_month}}
・ご請求金額：{{amount}}
・お支払期限：{{due_date}}
・お支払方法：{{payment_method}}

以下よりご請求書をご確認ください。
{{invoice_pdf_url}}

お手続き完了後、行き違いの場合はご容赦ください。
ご不明点がございましたら、本メールにご返信ください。

{{signature}}
</span></span></code></div></div></pre>

---

# 2) payment_failed（決済失敗）

## 件名

【要対応】{{store_name}}様｜お支払い処理が完了していません（{{billing_month}}分）

## 本文

<pre class="overflow-visible! px-0!" data-start="1252" data-end="1594"><div class="contain-inline-size rounded-2xl corner-superellipse/1.1 relative bg-token-sidebar-surface-primary"><div class="sticky top-[calc(--spacing(9)+var(--header-height))] @w-xl/main:top-9"><div class="absolute end-0 bottom-0 flex h-9 items-center pe-2"><div class="bg-token-bg-elevated-secondary text-token-text-secondary flex items-center gap-4 rounded-sm px-2 font-sans text-xs"></div></div></div><div class="overflow-y-auto p-4" dir="ltr"><code class="whitespace-pre!"><span><span>{{store_name}}様

{{company_name}}です。
{{billing_month}}分のお支払い処理が完了していない状態を確認しました（決済失敗/未完了）。

■状況
・対象月：{{billing_month}}
・金額：{{amount}}
・現在の状態：{{payment_status}}
・失敗理由（表示可能な範囲）：{{failure_reason}}

恐れ入りますが、以下いずれかのご対応をお願いいたします。
</span><span>1.</span><span> 再決済の実施：{{payment_link}}
2. お支払い方法の変更をご希望の場合は、本メールにご返信ください

※行き違いでお手続き済みの場合は、お知らせいただけますと幸いです。

{{signature}}
</span></span></code></div></div></pre>

---

# 3) reminder_1（督促1回目：軽め）

## 件名

【ご案内】{{store_name}}様｜{{billing_month}}分 お支払いのご確認（期限：{{due_date}}）

## 本文

<pre class="overflow-visible! px-0!" data-start="1706" data-end="2031"><div class="contain-inline-size rounded-2xl corner-superellipse/1.1 relative bg-token-sidebar-surface-primary"><div class="sticky top-[calc(--spacing(9)+var(--header-height))] @w-xl/main:top-9"><div class="absolute end-0 bottom-0 flex h-9 items-center pe-2"><div class="bg-token-bg-elevated-secondary text-token-text-secondary flex items-center gap-4 rounded-sm px-2 font-sans text-xs"></div></div></div><div class="overflow-y-auto p-4" dir="ltr"><code class="whitespace-pre!"><span><span>{{store_name}}様

{{company_name}}です。
{{billing_month}}分のお支払いについて、期限（{{due_date}}）を過ぎている可能性があるためご連絡いたしました。

■ご請求情報
・対象月：{{billing_month}}
・金額：{{amount}}
・お支払期限：{{due_date}}
・延滞日数：{{overdue_days}}日

お手続きがお済みでない場合は、以下よりご対応をお願いいたします。
{{payment_link_or_invoice_url}}

行き違いでお支払い済みの場合は、本メールにご返信いただけますと確認いたします。

{{signature}}
</span></span></code></div></div></pre>

---

# 4) reminder_2（督促2回目：少し強め）

## 件名

【要対応】{{store_name}}様｜{{billing_month}}分 未入金のご確認（延滞{{overdue_days}}日）

## 本文

<pre class="overflow-visible! px-0!" data-start="2148" data-end="2497"><div class="contain-inline-size rounded-2xl corner-superellipse/1.1 relative bg-token-sidebar-surface-primary"><div class="sticky top-[calc(--spacing(9)+var(--header-height))] @w-xl/main:top-9"><div class="absolute end-0 bottom-0 flex h-9 items-center pe-2"><div class="bg-token-bg-elevated-secondary text-token-text-secondary flex items-center gap-4 rounded-sm px-2 font-sans text-xs"></div></div></div><div class="overflow-y-auto p-4" dir="ltr"><code class="whitespace-pre!"><span><span>{{store_name}}様

{{company_name}}です。
{{billing_month}}分のお支払いが未完了の状態が続いているため、再度ご連絡いたします。

■状況
・対象月：{{billing_month}}
・金額：{{amount}}
・お支払期限：{{due_date}}
・延滞日数：{{overdue_days}}日
・督促回数：{{reminder_count}}回目

恐れ入りますが、{{next_due_date}}までに以下よりお手続きをお願いいたします。
{{payment_link_or_invoice_url}}

お支払いが難しい事情がある場合は、対応方法をご案内しますので本メールにご返信ください。

{{signature}}
</span></span></code></div></div></pre>

---

# 5) final_notice（最終通知：強めだが脅さない）

## 件名

【重要】{{store_name}}様｜{{billing_month}}分 お支払い最終のご案内（延滞{{overdue_days}}日）

## 本文

<pre class="overflow-visible! px-0!" data-start="2621" data-end="2973"><div class="contain-inline-size rounded-2xl corner-superellipse/1.1 relative bg-token-sidebar-surface-primary"><div class="sticky top-[calc(--spacing(9)+var(--header-height))] @w-xl/main:top-9"><div class="absolute end-0 bottom-0 flex h-9 items-center pe-2"><div class="bg-token-bg-elevated-secondary text-token-text-secondary flex items-center gap-4 rounded-sm px-2 font-sans text-xs"></div></div></div><div class="overflow-y-auto p-4" dir="ltr"><code class="whitespace-pre!"><span><span>{{store_name}}様

{{company_name}}です。
{{billing_month}}分のお支払いが未完了の状態のため、最終のご案内としてご連絡いたします。

■状況
・対象月：{{billing_month}}
・金額：{{amount}}
・お支払期限：{{due_date}}
・延滞日数：{{overdue_days}}日

恐れ入りますが、{{final_deadline}}までに下記よりお手続きをお願いいたします。
{{payment_link_or_invoice_url}}

※本通知と行き違いでお支払い済みの場合は、その旨ご返信ください。
※状況確認が必要な場合は、最短でご案内しますので本メールにご返信ください。

{{signature}}
</span></span></code></div></div></pre>

> 注：ここで「停止します」「削除します」を自動で書かない。停止の運用ルールが確定してから、別テンプレ（service_pause_notice）として分ける。

---

# 6) cancel_confirm（解約申請の確認）

## 件名

【ご確認】{{store_name}}様｜解約のお申し出を承りました（{{effective_date}}付）

## 本文

<pre class="overflow-visible! px-0!" data-start="3160" data-end="3431"><div class="contain-inline-size rounded-2xl corner-superellipse/1.1 relative bg-token-sidebar-surface-primary"><div class="sticky top-[calc(--spacing(9)+var(--header-height))] @w-xl/main:top-9"><div class="absolute end-0 bottom-0 flex h-9 items-center pe-2"><div class="bg-token-bg-elevated-secondary text-token-text-secondary flex items-center gap-4 rounded-sm px-2 font-sans text-xs"></div></div></div><div class="overflow-y-auto p-4" dir="ltr"><code class="whitespace-pre!"><span><span>{{store_name}}様

{{company_name}}です。
解約のお申し出を受領いたしました。以下内容にて手続きを進めます。

■解約内容
・解約予定日：{{effective_date}}
・対象サービス：{{service_name}}
・現在のご契約プラン：{{contract_plan_name}}

最終ご請求/お支払い状況の確認のため、必要に応じて別途ご案内いたします。
内容に相違がある場合は、{{confirm_deadline}}までに本メールへご返信ください。

{{signature}}
</span></span></code></div></div></pre>

---

# 7) cancel_final_payment（解約に伴う最終請求・最終入金案内）

## 件名

【要対応】{{store_name}}様｜解約に伴う最終お支払いのご案内（{{amount}}）

## 本文

<pre class="overflow-visible! px-0!" data-start="3544" data-end="3849"><div class="contain-inline-size rounded-2xl corner-superellipse/1.1 relative bg-token-sidebar-surface-primary"><div class="sticky top-[calc(--spacing(9)+var(--header-height))] @w-xl/main:top-9"><div class="absolute end-0 bottom-0 flex h-9 items-center pe-2"><div class="bg-token-bg-elevated-secondary text-token-text-secondary flex items-center gap-4 rounded-sm px-2 font-sans text-xs"></div></div></div><div class="overflow-y-auto p-4" dir="ltr"><code class="whitespace-pre!"><span><span>{{store_name}}様

{{company_name}}です</span><span>。</span><span>
解約手続きに伴い</span><span>、</span><span>最終お支払いについてご案内いたします</span><span>。</span><span>

</span><span>■</span><span>最終ご請求内容
・金額：{{amount}}
・お支払期限：{{due_date}}
・対象：{{final_billing_reason}}（例：最終月分</span><span>/日割り/</span><span>調整 等）

お支払い方法は以下となります</span><span>。</span><span>
{{payment_link_or_invoice_url}}

最終入金の確認後</span><span>、</span><span>{{route_action}}（停止</span><span>/</span><span>削除）を実施し</span><span>、</span><span>解約完了となります</span><span>。</span><span>
行き違いでお支払い済みの場合は</span><span>、</span><span>その旨ご返信ください</span><span>。</span><span>

{{signature}}
</span></span></code></div></div></pre>

---

# 8) route_error（ルート稼働エラー：相手に影響がある場合の通知）

## 件名

【ご案内】{{store_name}}様｜サービス稼働状況のご連絡（確認事項あり）

## 本文

<pre class="overflow-visible! px-0!" data-start="3952" data-end="4243"><div class="contain-inline-size rounded-2xl corner-superellipse/1.1 relative bg-token-sidebar-surface-primary"><div class="sticky top-[calc(--spacing(9)+var(--header-height))] @w-xl/main:top-9"><div class="absolute end-0 bottom-0 flex h-9 items-center pe-2"><div class="bg-token-bg-elevated-secondary text-token-text-secondary flex items-center gap-4 rounded-sm px-2 font-sans text-xs"></div></div></div><div class="overflow-y-auto p-4" dir="ltr"><code class="whitespace-pre!"><span><span>{{store_name}}様

{{company_name}}です。
現在、運用システム側で稼働状況の確認が必要な状態を検知したためご連絡いたします。

■状況
・対象サービス：{{service_name}}
・現在の状態：{{route_status}}
・確認事項：{{route_error_summary}}

対応を進めるため、以下についてご確認/ご返信をお願いいたします（該当する場合のみ）。
・{{question_1}}
・{{question_2}}

こちらでも復旧対応を進め、進捗があり次第ご連絡いたします。

{{signature}}
</span></span></code></div></div></pre>

---

# 9) invoice_resend（請求書 再送）

（invoice_send と分けると運用がきれい）

## 件名

【ご案内】{{store_name}}様｜{{billing_month}}分 ご請求書の再送付（{{amount}}）

## 本文

<pre class="overflow-visible! px-0!" data-start="4379" data-end="4579"><div class="contain-inline-size rounded-2xl corner-superellipse/1.1 relative bg-token-sidebar-surface-primary"><div class="sticky top-[calc(--spacing(9)+var(--header-height))] @w-xl/main:top-9"><div class="absolute end-0 bottom-0 flex h-9 items-center pe-2"><div class="bg-token-bg-elevated-secondary text-token-text-secondary flex items-center gap-4 rounded-sm px-2 font-sans text-xs"></div></div></div><div class="overflow-y-auto p-4" dir="ltr"><code class="whitespace-pre!"><span><span>{{store_name}}様

{{company_name}}です。
ご依頼（または行き違い防止）のため、{{billing_month}}分のご請求書を再送付いたします。

■ご請求内容
・対象月：{{billing_month}}
・金額：{{amount}}
・期限：{{due_date}}

ご請求書：{{invoice_pdf_url}}

{{signature}}
</span></span></code></div></div></pre>

---

# 10) receipt_confirm（入金確認通知：入金済みの連絡）

## 件名

【ご連絡】{{store_name}}様｜{{billing_month}}分 お支払い確認のご連絡

## 本文

<pre class="overflow-visible! px-0!" data-start="4688" data-end="4873"><div class="contain-inline-size rounded-2xl corner-superellipse/1.1 relative bg-token-sidebar-surface-primary"><div class="sticky top-[calc(--spacing(9)+var(--header-height))] @w-xl/main:top-9"><div class="absolute end-0 bottom-0 flex h-9 items-center pe-2"><div class="bg-token-bg-elevated-secondary text-token-text-secondary flex items-center gap-4 rounded-sm px-2 font-sans text-xs"></div></div></div><div class="overflow-y-auto p-4" dir="ltr"><code class="whitespace-pre!"><span><span>{{store_name}}様

{{company_name}}です。
{{billing_month}}分のお支払いを確認いたしました。ありがとうございます。

■確認内容
・対象月：{{billing_month}}
・金額：{{amount}}
・入金日：{{paid_at}}

引き続きよろしくお願いいたします。

{{signature}}
</span></span></code></div></div></pre>

---

# 11) service_pause_notice（停止予告）※運用ルールが確定したら使う

> 今は“将来用”として置く。自動化しないこと。

## 件名

【重要】{{store_name}}様｜未入金に伴うサービス停止の予告（{{final_deadline}}）

## 本文

<pre class="overflow-visible! px-0!" data-start="5021" data-end="5293"><div class="contain-inline-size rounded-2xl corner-superellipse/1.1 relative bg-token-sidebar-surface-primary"><div class="sticky top-[calc(--spacing(9)+var(--header-height))] @w-xl/main:top-9"><div class="absolute end-0 bottom-0 flex h-9 items-center pe-2"><div class="bg-token-bg-elevated-secondary text-token-text-secondary flex items-center gap-4 rounded-sm px-2 font-sans text-xs"></div></div></div><div class="overflow-y-auto p-4" dir="ltr"><code class="whitespace-pre!"><span><span>{{store_name}}様

{{company_name}}です。
未入金状態が継続しているため、恐れ入りますが{{final_deadline}}までにお支払い確認が取れない場合、
サービスを一時停止する可能性がございます。

■状況
・対象月：{{billing_month}}
・金額：{{amount}}
・延滞日数：{{overdue_days}}日

お手続き：{{payment_link_or_invoice_url}}

行き違いでお支払い済みの場合は、至急ご返信ください。

{{signature}}
</span></span></code></div></div></pre>

---

# 12) service_stop_done（停止完了通知）※自動送信NG（要承認）

## 件名

【ご連絡】{{store_name}}様｜サービス停止のご連絡

## 本文

<pre class="overflow-visible! px-0!" data-start="5389" data-end="5523"><div class="contain-inline-size rounded-2xl corner-superellipse/1.1 relative bg-token-sidebar-surface-primary"><div class="sticky top-[calc(--spacing(9)+var(--header-height))] @w-xl/main:top-9"><div class="absolute end-0 bottom-0 flex h-9 items-center pe-2"><div class="bg-token-bg-elevated-secondary text-token-text-secondary flex items-center gap-4 rounded-sm px-2 font-sans text-xs"></div></div></div><div class="overflow-y-auto p-4" dir="ltr"><code class="whitespace-pre!"><span><span>{{store_name}}様

{{company_name}}です。
お支払い状況の確認が取れないため、サービスを一時停止いたしました。

再開をご希望の場合は、本メールへご返信ください。
再開手順をご案内いたします。

{{signature}}
</span></span></code></div></div></pre>

---

# 変数辞書（不足が出ないように）

最低限これを揃えるとテンプレが破綻しません。

* `store_name`
* `billing_month`
* `amount`
* `due_date`
* `payment_method`
* `payment_link_or_invoice_url`
* `invoice_pdf_url`
* `payment_link`
* `payment_status`
* `failure_reason`
* `overdue_days`
* `reminder_count`
* `next_due_date`
* `final_deadline`
* `effective_date`
* `confirm_deadline`
* `service_name`
* `contract_plan_name`
* `final_billing_reason`
* `route_status`
* `route_error_summary`
* `route_action`
* `company_name`
* `support_email`
* `support_hours`
* `operator_team_or_name`
* `signature`


# ① ステータス遷移ルール（v1）

## 1) 対象ステータス（4系統を分離して定義）

### A. 契約ステータス `contracts.status`

* `lead`（見込み）
* `closed_won`（契約成立）
* `active`（稼働中）
* `cancel_pending`（解約予定）
* `cancelled`（解約完了）

### B. 請求ステータス `invoices.status`

* `draft`（下書き）
* `sent`（送付済）
* `paid`（入金確認済）
* `overdue`（期限超過）
* `void`（無効）

### C. 入金ステータス `payments.status`

* `pending`
* `succeeded`
* `failed`
* `refunded`
* `chargeback`

### D. ルート稼働 `integrations_route.status`

* `preparing`
* `running`
* `paused`
* `deleting`
* `deleted`
* `error`

> 重要：この4系統は **混ぜない** 。
>
> 「activeなのにoverdue」は現実に起こり得るので許容し、UIで“危険表示”する。

---

## 2) 契約ステータスの遷移（Allowed / Forbidden）

### 2.1 Allowed（許可）

* `lead → closed_won`（契約成立）
* `closed_won → active`（初回入金確認後）
* `active → cancel_pending`（解約申請受付）
* `cancel_pending → cancelled`（最終入金確認＋ルート停止/削除完了）
* `cancel_pending → active`（解約撤回：条件付き）

### 2.2 Forbidden（禁止）

* `lead → active`（初回入金がない稼働はNG）
* `closed_won → cancelled`（解約予定を経由しないのは禁止）
* `active → cancelled`（同上）
* `cancelled → *`（解約完了は不可逆。戻れない）

---

## 3) 遷移ごとの“実行条件”（ここが最重要）

### 3.1 `closed_won → active` の条件

以下すべて満たすこと：

* 初回請求（invoice）が存在する（当月分 or 初回分）
* 初回入金が `payments.status = succeeded` で記録されている

  （月額ペイならWebhook、請求書なら手動反映でも可）
* ルート連携情報が存在する（最低 `integrations_route` のレコードは作成済み）
* `integrations_route.status` は `running` へ遷移可能である（`error`なら要手動確認）

**自動化ルール：**

初回入金成功イベントを受け取ったら、可能なら自動で `active` に上げる。

ただし、上の条件が満たせない場合は `closed_won` のまま  **アラート** 。

---

### 3.2 `cancel_pending → cancelled` の条件

以下すべて満たすこと：

* 「最終請求」のinvoiceが確定している（存在しない場合は `final_billing_reason = none` と明記）
* 最終入金が確認済み（`payments.succeeded` が該当invoiceに紐づく or 契約に紐づく）
* ルートが `paused` or `deleted` になっている

  （削除がポリシーなら `deleted`必須。停止でOKなら `paused`許容）
* 実行者が管理者権限である

**注意：**

ここは“夜勤入金ステータスON”の運用を前提に、

夜勤入金ON中は `cancel_pending` 固定、最終入金確認で `cancelled` に進める。

---

### 3.3 `cancel_pending → active`（解約撤回）の条件

* 解約撤回の意思が記録されている（ops_logsに理由必須）
* ルートが復帰可能（`paused`なら `running` へ戻せる、`deleted`なら再作成が必要）
* 最終請求が既に確定・送付済みの場合

  → **撤回後の請求調整方針**に従って invoice を再編（ここは後の「例外処理」で定義）

---

## 4) ルールに紐づく“必須ログ”要件（監査）

契約ステータスが変わる操作は  **必ず ops_logs に残す** 。

* 誰が（actor）
* いつ
* 何から何へ（before/after）
* 理由（短文必須）
* 付随操作（例：通知を生成した、ルート停止を実行した）

---

## 5) UI上の強制（運用事故を防ぐ）

### 5.1 変更時の確認モーダル（必須）

* 変更後ステータス
* 実行条件のチェック結果（OK/NG）
* 理由入力（必須）
* 関連アクション（例：通知下書き生成）

### 5.2 “戻れない”表示

* `cancelled` は赤系バッジ＋「不可逆」ラベル

---

## 6) “危険フラグ”の定義（ステータスとは別）

以下は contract.status を変えずに **flags** として立てる（UIで強調）

* `PAYMENT_FAILED_RECENT`：直近で payment.failed
* `INVOICE_OVERDUE`：当月invoiceがoverdue
* `ROUTE_ERROR`：integrations_route.status=error
* `CANCEL_FINAL_PAYMENT_WAITING`：cancel_pending かつ最終入金待ち

---

# ② 自動 vs 手動の境界（責任分界点の定義）

## 1) 基本原則（このシステムの行動哲学）

* **自動化は「判断材料の生成」まで**
* **意思決定と実行は人間が行う**
* **不可逆な操作は必ず人間の承認を要する**
* **AI・自動処理は責任主体にならない**

これを破ると、

・誤送信

・誤停止

・誤解約

のどれかが必ず起きる。

---

## 2) 完全自動にしてよい処理（No Human Required）

以下は **事故ってもロールバック可能** 、または**事実の反映**なので完全自動OK。

### 2.1 データ生成・反映系

* 月次請求データ（invoice）の自動生成
* 月額ペイWebhookによる入金ステータス反映
* 決済成功/失敗イベントの保存（integration_events）
* ルート側ステータスの取得・反映（取得のみ）

### 2.2 補助情報生成

* 通知文の **下書き生成** （AI）
* 次アクション候補の提案（AI）
* 店舗情報の正規化（表記ゆれ補正・不足検知）

👉 **ポイント**

「正」データを書き換える場合でも

* 事実
* 外部イベント
* 差分が明確

  なら自動OK。

---

## 3) 半自動（Human-in-the-loop 必須）

**UIでの確認・承認を経て実行される処理。**

### 3.1 通知・連絡系

* 請求書メールの送信
* 督促メールの送信
* 解約確認・最終通知の送信

**ルール**

* 自動送信は禁止
* 送信前チェック（宛先・金額・期限）をUIで強制
* 送信者（auth.uid）を必ずログに残す

---

### 3.2 契約ステータスの変更

以下は **ボタン操作＋理由入力必須** 。

* `closed_won → active`
* `active → cancel_pending`
* `cancel_pending → active`
* `cancel_pending → cancelled`

**例外**

* 初回入金成功 → `active` は
  * 条件がすべて満たされていれば**自動遷移可**
  * ただし ops_logs に「自動遷移」と明記

---

## 4) 完全手動（管理者権限＋確認必須）

**戻れない・顧客影響が大きい操作。**

### 4.1 不可逆操作

* 契約の `cancelled` 確定
* ルート削除（deleted）
* 請求金額の直接修正（invoice.amount）

### 4.2 高リスク操作

* 強制入金反映（例：証憑なし）
* 入金の取消（refund/chargeback手動処理）
* データの論理削除（void）

**UI要件**

* 二重確認モーダル
* 実行理由の入力必須
* 実行後は自動で ops_logs を開く

---

## 5) AIに「やらせない」こと（明文化）

以下は **仕様として禁止** 。

* 通知の自動送信
* ステータスの最終決定
* ルート削除/停止の実行
* 金額・期限の計算確定
* 顧客対応の結論提示（「こうしてください」と断定）

AIは

👉 **提案者・下書き係・整理係**

まで。

---

## 6) “自動失敗時”のフォールバックルール

自動処理は必ず失敗する前提で設計する。

### 6.1 自動処理が失敗した場合

* ステータスは変更しない
* エラーログを integration_events に保存
* ダッシュボードに「要確認」アラート表示
* 手動アクションを next-actions に提示

### 6.2 例

* 月額ペイWebhook未着

  → invoice は sent のまま

  → 「入金未反映の可能性」フラグ
* ルートAPI取得失敗

  → 既存ステータス維持

  → route_error フラグ

---

## 7) UIに反映すべき“自動/手動の可視化”

現場が迷わないための設計。

* 自動で処理されたもの

  → バッジ「AUTO」
* 人が実行したもの

  → 実行者名＋時刻
* AI生成

  → 「AI下書き」ラベル＋編集可能

---

## 8) 文面として要件に書く一文（重要）

> 本システムにおいて、自動処理およびAIによる処理は、
>
> 判断補助および下書き生成を目的とし、
>
> 契約・請求・解約に関する最終判断および実行は、
>
> 必ず人間の操作および承認を経て行われるものとする。


# ③ 金額の“正”と会計ロジック（請求・入金の真実定義）

## 1) 単一真実（Single Source of Truth）

### 1.1 請求金額の正は `invoices.amount`

* **請求として確定した金額は invoices にのみ存在**する
* `contracts.contract_monthly_price_snapshot` は「次回請求生成の参考値」であり、請求確定ではない

> つまり「売上・未収・回収率」は invoices を見れば必ず一致する。

### 1.2 入金の正は `payments`（入金記録）

* 入金があった事実は `payments.status = succeeded` で表現する
* 月額ペイWebhookは “入金の証憑” として `integration_events` に生保存し、`payments` に反映する

---

## 2) 請求と入金の紐づけルール（これを固定する）

### 2.1 原則：毎月必ず invoice を1件作る

* 契約が `active` もしくは `closed_won`（開始予定）であれば

  **billing_monthごとに invoices を1件**生成する（原則）

### 2.2 payment は原則 invoice に紐づける

* 可能な限り `payments.invoice_id` をセットする
* 例外として、手動入金で「どの月か特定できない」場合は `invoice_id=null` を許容し、後で紐づけを修正できる

> ここで “後から直せる” を許すのが現実対応。許さないと現場が詰む。

---

## 3) 金額の内訳（割引・調整をどう扱うか）

ここも揉めポイントなので、最初から分ける。

### 3.1 invoices.amount は「最終請求額（税抜/税込のどちらか）」で固定

* 税を扱うなら `tax_amount` と `total_amount` を分ける
* いま税を気にしないなら、`amount` を税込として運用開始し、後から拡張してもよい

  （ただし「税込/税抜」どっちかは必ず仕様に書く）

### 3.2 調整（ディスカウント/返金/日割り）は “invoiceの明細” として持つ（推奨）

最小の拡張テーブル：

* `invoice_items`
  * `description`
  * `quantity`
  * `unit_price`
  * `line_amount`（±可）

そして

* `invoices.amount = Σ(invoice_items.line_amount)`

  で一致するようにする。

> これをやると「なんでこの金額？」が後から説明できる。監査にも強い。

（MVPでinvoice_itemsを作らない場合は、最低限 `invoices.adjustment_note` を持って理由を書けるようにする）

---

## 4) 請求月（billing_month）の定義：地味に最重要

### 4.1 billing_month は日付型で `YYYY-MM-01` 固定

例：

* 2026年1月分 → `2026-01-01`

### 4.2 締め日・発行日・期限日の定義

* `issue_date`：請求書を生成/確定した日
* `sent_at`：送付した日
* `due_date`：支払期限（日付）

**ルール：**

* due_date は invoice に必須（請求書払い）
* 月額ペイは due_date を「決済予定日」として扱っても良い（統一のため）

---

## 5) 未収・延滞の定義（overdue判定）

### 5.1 overdue判定

* `invoices.status = overdue` になる条件：
  * `status in (sent)` かつ
  * 今日 > `due_date` かつ
  * 紐づく `payments.succeeded` の合計が `invoices.amount` 未満

### 5.2 部分入金（将来想定）

* `paid` の定義：
  * succeeded合計 >= invoice.amount
* それ未満は `sent` または `overdue`

> MVPで部分入金を扱わないなら「部分入金は原則発生しない」と仕様に書いてもいい。
>
> ただしDB側は “許容できる” 方が後で詰まない。

---

## 6) 解約時の最終請求（final billing）の正義

ここは必ず揉めるので、“処理の手順”を仕様化する。

### 6.1 解約が発生したら

* `contracts.status = cancel_pending`
* `cancellation_effective_date`（解約効力日）を契約に持つ

### 6.2 最終請求の作り方（MVPルール案）

まずは運用しやすいルールを先に固定する（後で拡張可）：

* ルールA（シンプル）：**当月満額**
* ルールB（丁寧）：日割り + 調整
* ルールC（契約条件）：違約金/最低利用期間

今この瞬間に決めるべきは「MVPはどれでいくか」。

おすすめ（現実に強い）：

* MVPは **ルールA（当月満額）**

  → 例外だけ `invoice_items` で調整

### 6.3 cancel_pending → cancelled の条件（再掲）

* 最終invoice確定
* 最終payment確認
* ルート停止/削除完了

---

## 7) KPI（数字）の定義に直結する“会計ルール”

KPIに使う数値はこのルールで決まる：

* 月次売上（当月）＝ `billing_month` の invoices で `paid` 合計
* 未収残高 ＝ `sent/overdue` の (amount - succeeded合計)
* 回収率 ＝ paid合計 / issued合計
* 失敗率（月額ペイ）＝ payment.failed件数 / payment総数

> ぜんぶ invoices と payments だけで計算できる状態にする。
>
> “契約金額”から計算し始めると途端に嘘になる。

---

## 8) 仕様としての決定文（要件定義に書く一文）

> 請求金額および売上・未収管理の基準となる金額は、請求データ（invoices）の金額（amount）を正とする。
>
> 入金の事実は入金データ（payments）に記録し、請求に対する入金充当は payments と invoices の紐づけにより管理する。
>
>
> # ④ 「月」の定義（請求サイクル・締め・発行・期限・日割り）
>
> ## 1) billing_month の定義（再確認：絶対固定）
>
> * `billing_month` は **日付型**で **月初日 `YYYY-MM-01`** を採用する
>
>   例：2026年1月分 → `2026-01-01`
>
>  **理由** ：文字列より検索・集計・インデックスが強く、バグらない。
>
> ---
>
> ## 2) 請求サイクルの基本方針（MVPルール）
>
> まずMVPは運用が壊れないように **“単純なルール”**で固定する。
>
> ### 2.1 請求対象
>
> * `contracts.status in (closed_won, active, cancel_pending)` が対象
> * `cancelled` は対象外
>
> ### 2.2 いつ、どの月を請求するか
>
> * 「当月分を当月に請求」方式（前払い/後払いどちらでも可）
>
>   ただし、MVPは混ぜない。 **どっちかに固定** 。
>
> ここで決め打ちが必要。
>
> #### 選択肢
>
> * **前払い** ：1月分を1月初に請求（SaaSっぽい、回収が早い）
> * **後払い** ：1月分を2月初に請求（運用はわかりやすいが回収遅い）
>
>  **おすすめ（ビジネス的に強い）** ：前払い
>
> → キャッシュが安定、未収リスクが減る。
>
> 以降は前払い前提で書く（後払いにするなら日付だけズラせばOK）。
>
> ---
>
> ## 3) 発行日・送付日・期限日の定義
>
> ### 3.1 invoice生成タイミング（発行日 issue_date）
>
> * 毎月 **1日 09:00** に当月分 invoice を生成（例）
> * `issue_date = 生成日`
>
> （時間は例。運用次第で変更可能だが、仕様として“毎月固定”であることが重要）
>
> ### 3.2 送付タイミング（sent_at）
>
> * 請求書払い：生成後に **送付オペ**を行い `sent_at` が入る
> * 月額ペイ：送付が不要なら `sent_at` は空でもいいが、統一するなら「生成＝送付扱い」で入れても良い
>
> **MVPおすすめ**
>
> * 請求書払い：`sent_at` 必須
> * 月額ペイ：`sent_at` は任意（ただしUIでは“発生した請求”として見える必要がある）
>
> ### 3.3 支払期限（due_date）
>
> * 請求書払い：原則 **月末（当月末日）** を期限とする
>
>   例：1月分 → 1/31
> * 月額ペイ：決済予定日を due_date に入れる（例：毎月◯日）
>
> **仕様として固定すること**
>
> * 請求書払い：due_date = 月末（末日計算）
> * 月額ペイ：due_date = 決済予定日（契約の payment_day で管理）
>
> ---
>
> ## 4) “締め日”の定義（必要なら）
>
> 前払いで運用するなら、締め日は実は必須ではない。
>
> ただし「請求書の発行をまとめたい」なら締め日が要る。
>
> MVPの推奨：
>
> * **締め日は設けない** （毎月1日に生成、月末期限）
> * 例外的に必要になったら設定で後付け
>
>> 締め日を入れると例外処理が爆増する（契約途中開始、解約、日割り）ので、MVPでは避けるのが強い。
>>
>
> ---
>
> ## 5) 契約開始月・途中開始の扱い（ここは最初に決める）
>
> 現場では必ず「月途中で開始」が起きる。
>
> ### 5.1 MVPルール（シンプル）
>
> * 契約開始月は **当月満額**
> * 日割りは原則しない（例外は手動調整）
>
> この方針を採用するなら、要件にこう書く：
>
>> 月途中開始の場合も、開始月は原則として満額請求とする。日割り・調整が必要な場合は、請求明細（invoice_items）または調整理由の記録により個別対応する。
>>
>
> （ビジネス的にも回収が安定する）
>
> ---
>
> ## 6) 解約月の扱い（cancel_pending と最終請求）
>
> ### 6.1 MVPルール
>
> * 解約効力日が当月内でも、**当月満額**
> * ただし特別対応が必要な場合は invoice_items で減額（例外）
>
> ### 6.2 解約の“最終請求月”の定義
>
> * 解約効力日が属する billing_month を最終請求対象とする
>
>   例：解約効力日 2026-01-20 → 最終請求月は 2026-01-01（1月分）
>
> ---
>
> ## 7) 月額ペイ（自動課金）の課金日定義
>
> 月額ペイの運用で絶対必要になるのが「毎月何日に落ちるか」。
>
> ### 7.1 契約に持つべきフィールド
>
> * `contracts.payment_day`（1〜28推奨）
>   * 29/30/31は地雷（月によって存在しない）
> * もし月末にしたいなら
>   * `payment_day = 0` を「月末」扱いにする等の規約を作る
>
>  **MVPおすすめ** ：1〜28固定（堅い）
>
> ### 7.2 月額ペイの due_date
>
> * `due_date = billing_month の payment_day`
>
>   例：2026-01-01 + day=10 → 2026-01-10
>
> ---
>
> ## 8) 未入金の判定タイミング
>
> * 毎日 09:00 に「overdue判定バッチ」を走らせる
> * `today > due_date` で overdue候補
> * succeeded合計が不足なら `invoices.status = overdue`
>
> （実際はトランザクション整合性が要るけど、要件としてはこれでOK）
>
> ---
>
> ## 9) 仕様としての決定文（要件定義に書く）
>
>> 請求月（billing_month）は月初日（YYYY-MM-01）で管理する。
>>
>> 請求書払いの支払期限（due_date）は当月末日を原則とし、月額課金の場合は契約で定義した課金日（payment_day）を期限として管理する。
>>
>> 月途中開始および解約月は、MVPでは原則として満額請求とし、必要な調整は請求明細または調整理由の記録により個別対応する。
>>
>>
