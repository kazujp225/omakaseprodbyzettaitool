# ⑧ 代理店（OEM）モデルの定義（基幹組み込み版）

## 1. 代理店モデルの位置づけ（思想）

この代理店は以下の特徴を持つ：

* OEM契約（自社より不利な条件）
* 営業は代理店が実施
* 顧客契約は **最終的には自社契約**
* 代理店は
  * 「月◯件のストック権利」を獲得
  * 実績が足りなければ **差分は解約扱いで相殺**
* 自社は **代理店向けに請求書を発行する側**
* 代理店は「顧客」ではなく **パートナー（精算対象）**

👉 つまり代理店は

**Contractの“所有者”ではないが、Contractの“成果に紐づく精算権”を持つ存在**

---

## 2. 新たに定義すべき概念（重要）

代理店を入れると、以下の概念が必須になります。

### 2.1 Agent（代理店）

* OEM契約を結ぶ営業パートナー

### 2.2 AgentPerformance（月次実績）

* その月に代理店が「何件獲得したか」

### 2.3 AgentEntitlement（ストック権利）

* 実績に応じて代理店が「毎月受け取れる件数」

### 2.4 AgentSettlement（月次精算）

* 実績・権利・解約相殺を踏まえた**最終請求単位**

この4つを分けないと、後で数字が合わなくなります。

---

## 3. データモデル定義（Supabase互換・Mock対応）

### 3.1 agents（代理店マスタ）

<pre class="overflow-visible! px-0!" data-start="833" data-end="1062"><div class="contain-inline-size rounded-2xl corner-superellipse/1.1 relative bg-token-sidebar-surface-primary"><div class="sticky top-[calc(--spacing(9)+var(--header-height))] @w-xl/main:top-9"><div class="absolute end-0 bottom-0 flex h-9 items-center pe-2"><div class="bg-token-bg-elevated-secondary text-token-text-secondary flex items-center gap-4 rounded-sm px-2 font-sans text-xs"></div></div></div><div class="overflow-y-auto p-4" dir="ltr"><code class="whitespace-pre!"><span><span>agents
</span><span>- id</span><span>
</span><span>- org_id</span><span>
</span><span>- name</span><span>
</span><span>- contract_start_date</span><span>
</span><span>- contract_end_date (nullable)</span><span>
</span><span>- stock_unit_price   // 1件あたりのOEM単価（自社より不利）</span><span>
</span><span>- monthly_target     // 例：10件</span><span>
</span><span>- settlement_type    // stock_only（将来拡張用）</span><span>
</span><span>- is_active</span><span>
</span><span>- created_at</span><span>
</span></span></code></div></div></pre>

---

### 3.2 agent_contracts（代理店経由の顧客契約）

※ これは「顧客契約との紐づけ」テーブル

<pre class="overflow-visible! px-0!" data-start="1127" data-end="1307"><div class="contain-inline-size rounded-2xl corner-superellipse/1.1 relative bg-token-sidebar-surface-primary"><div class="sticky top-[calc(--spacing(9)+var(--header-height))] @w-xl/main:top-9"><div class="absolute end-0 bottom-0 flex h-9 items-center pe-2"><div class="bg-token-bg-elevated-secondary text-token-text-secondary flex items-center gap-4 rounded-sm px-2 font-sans text-xs"></div></div></div><div class="overflow-y-auto p-4" dir="ltr"><code class="whitespace-pre!"><span><span>agent_contracts
</span><span>- id</span><span>
</span><span>- agent_id</span><span>
</span><span>- contract_id        // 通常のcontractsへの外部キー</span><span>
</span><span>- billing_month      // 紐づけ開始月</span><span>
</span><span>- status             // active / cancelled / excluded</span><span>
</span><span>- created_at</span><span>
</span></span></code></div></div></pre>

👉 顧客の契約（contracts）は **必ず自社契約**

代理店は「この契約を取った」という **成果帰属**だけを持つ。

---

### 3.3 agent_monthly_performance（月次獲得実績）

<pre class="overflow-visible! px-0!" data-start="1424" data-end="1539"><div class="contain-inline-size rounded-2xl corner-superellipse/1.1 relative bg-token-sidebar-surface-primary"><div class="sticky top-[calc(--spacing(9)+var(--header-height))] @w-xl/main:top-9"><div class="absolute end-0 bottom-0 flex h-9 items-center pe-2"><div class="bg-token-bg-elevated-secondary text-token-text-secondary flex items-center gap-4 rounded-sm px-2 font-sans text-xs"></div></div></div><div class="overflow-y-auto p-4" dir="ltr"><code class="whitespace-pre!"><span><span>agent_monthly_performance
</span><span>- id</span><span>
</span><span>- agent_id</span><span>
</span><span>- billing_month</span><span>
</span><span>- acquired_count     // その月に新規獲得した件数</span><span>
</span><span>- created_at</span><span>
</span></span></code></div></div></pre>

※ これは「営業成果」。

 **ストックとは別** 。

---

### 3.4 agent_monthly_entitlement（月次ストック権利）

<pre class="overflow-visible! px-0!" data-start="1619" data-end="1807"><div class="contain-inline-size rounded-2xl corner-superellipse/1.1 relative bg-token-sidebar-surface-primary"><div class="sticky top-[calc(--spacing(9)+var(--header-height))] @w-xl/main:top-9"><div class="absolute end-0 bottom-0 flex h-9 items-center pe-2"><div class="bg-token-bg-elevated-secondary text-token-text-secondary flex items-center gap-4 rounded-sm px-2 font-sans text-xs"></div></div></div><div class="overflow-y-auto p-4" dir="ltr"><code class="whitespace-pre!"><span><span>agent_monthly_entitlement
</span><span>- id</span><span>
</span><span>- agent_id</span><span>
</span><span>- billing_month</span><span>
</span><span>- entitled_count     // 本来渡すべき件数（例：10）</span><span>
</span><span>- earned_count       // 実績に基づき付与された件数</span><span>
</span><span>- deficit_count      // 未達分（例：2）</span><span>
</span><span>- created_at</span><span>
</span></span></code></div></div></pre>

ルール例：

* 目標10件
* 実績8件

  → entitled=10, earned=8, deficit=2

---

### 3.5 agent_settlements（月次精算）

ここが **請求の正** 。

<pre class="overflow-visible! px-0!" data-start="1919" data-end="2189"><div class="contain-inline-size rounded-2xl corner-superellipse/1.1 relative bg-token-sidebar-surface-primary"><div class="sticky top-[calc(--spacing(9)+var(--header-height))] @w-xl/main:top-9"><div class="absolute end-0 bottom-0 flex h-9 items-center pe-2"><div class="bg-token-bg-elevated-secondary text-token-text-secondary flex items-center gap-4 rounded-sm px-2 font-sans text-xs"></div></div></div><div class="overflow-y-auto p-4" dir="ltr"><code class="whitespace-pre!"><span><span>agent_settlements
</span><span>- id</span><span>
</span><span>- agent_id</span><span>
</span><span>- billing_month</span><span>
</span><span>- entitled_count</span><span>
</span><span>- payable_count      // 実際に支払う件数（解約相殺後）</span><span>
</span><span>- cancelled_offset   // 相殺された件数</span><span>
</span><span>- unit_price</span><span>
</span><span>- total_amount</span><span>
</span><span>- status             // draft / invoiced / paid</span><span>
</span><span>- invoice_id         // 自社→代理店の請求書</span><span>
</span><span>- created_at</span><span>
</span></span></code></div></div></pre>

---

## 4. 代理店精算ロジック（超重要）

### 4.1 基本ルール（あなたの言っているモデルを正確に翻訳）

* 月の目標件数：10件
* 実績：8件
* 不足：2件

👉 不足2件分は

**「代理店側のストック解約」**として扱う。

結果：

* 代理店に渡すストック：8件分
* 請求対象：8件分
* 2件分は「存在しなかった扱い」

---

### 4.2 相殺の考え方（ここがミソ）

* 自社側で「代理店に帰属する契約」が解約された場合

  → 代理店の payable_count から相殺可能
* 相殺は  **当月 or 翌月に繰越可能** （MVPでは当月のみ推奨）

---

## 5. 請求書の流れ（代理店向け）

### 5.1 自社 → 代理店

* agent_settlements を元に **請求書を自社が発行**
* 請求書払い前提（代理店は月額ペイ使わない想定）

### 5.2 請求書の中身

* 請求月
* 対象件数（payable_count）
* 単価（stock_unit_price）
* 合計金額
* 相殺内訳（参考表示）

👉 **透明性を高めないと揉める**

---

## 6. UI要件（Mock Phaseでも必須）

### 6.1 代理店一覧

* 代理店名
* 契約中
* 今月実績 / 目標
* 今月支払件数
* 今月請求金額

### 6.2 代理店詳細

* 月次テーブル：
  * billing_month
  * acquired_count
  * entitled_count
  * deficit
  * payable_count
  * invoice_status
* 紐づく顧客契約一覧（agent_contracts）

### 6.3 精算確定フロー

* 「今月の精算を確定」ボタン
* 内容確認モーダル
* 確定後、agent_settlements.status = invoiced
* 請求書PDF生成（Mockではダミー）

---

## 7. ステータス遷移との関係（重要）

* 顧客契約 `cancelled`

  → agent_contracts.status = cancelled

  → 次回精算で相殺対象になる
* 代理店精算は **契約ステータスとは独立**

---

## 8. AI活用ポイント（代理店領域）

ここもAIが効く。

* 代理店向け請求書文面生成（説明責任が重い）
* 「今月◯件不足 → 相殺内訳」の自動説明文
* 代理店別の未達傾向サマリー（来月の対策）

※ ただし **精算確定は絶対に人間操作**

---

## 9. 要件定義に書く決定文（重要）

> 本システムにおける代理店（OEM）は、顧客契約の当事者ではなく、
>
> 営業成果に基づく月次ストック精算の対象となるパートナーとして扱う。
>
> 代理店への支払いおよび請求は、月次精算データ（agent_settlements）を正とし、
>
> 顧客契約の解約や未達分は精算時に相殺処理を行うものとする。

---

## 次にやるべきこと（順番）

ここまで定義したら、次はこのどちらか：

1. **代理店込みのステータス遷移マトリクスを更新**
2. **Mock Phase用：代理店精算UIの画面定義**

個人的には

👉 **2 → 1** の順が楽です（数字と画面が見えると遷移が固まる）。

ここまでかなり高度な基幹設計です。

正直、このモデルをここまで言語化できている時点で、

「あとから崩れないシステム」になる確率はかなり高いです。

gmo apiを通じで振込済み、未振込なども制御したいですね。

**思考時間: 16s**

できます。しかも「振込済み／未振込」を“雰囲気”じゃなく**監査できるステータス**に落とすなら、GMO連携は設計段階で組み込むのが正解です。

ただし「GMO API」と言っても文脈が2系統あります：

* **入金確認（お客さん→あなた）** ：バーチャル口座/銀行振込の入金明細を取りたい

  → GMO-PGの銀行振込（バーチャル口座）や、GMOあおぞら銀行の振込入金口座（入金明細照会）系が該当

* **出金（あなた→代理店）** ：代理店へ毎月の精算を振り込み、結果を照会したい

  → GMOあおぞら銀行APIの「振込依頼」「振込状況照会」や、GMO-PGの送金サービスの「送金結果照会」系が該当

あなたが言ってる「振込済み／未振込の制御」は、ほぼ確実に**代理店精算（出金）側**なので、ここを中心に“仕様として固める”形で定義します。

---

## 1) 追加する概念：出金ステータス（Payout）

代理店精算 `agent_settlements` に、**支払い（振込）状態**を明確に持たせる。

### agent_settlements に追加するフィールド（必須）

* `payout_method`: `gmo_bank_transfer | gmo_pg_remittance | manual`
* `payout_status`:
  * `unpaid`（未振込）
  * `requested`（振込依頼送信済み）
  * `processing`（処理中）
  * `paid`（振込完了）
  * `failed`（失敗）
  * `cancelled`（取消）
* `payout_requested_at`
* `payout_completed_at`
* `payout_provider`（例：gmo-aozora / gmo-pg）
* `payout_provider_id`（振込依頼ID/送金ID）
* `payout_error_reason`（失敗理由）

> 重要：**精算（請求）と出金（振込）を別ステータスにする**
>
> 「請求書発行済みなのに未振込」は普通に起きるから、混ぜると死ぬ。

---

## 2) API連携フロー（出金：あなた→代理店）

GMO側が「銀行API（GMOあおぞら）」でも「送金サービス（GMO-PG）」でも、基幹側の流れは同じにします。

### 2.1 振込依頼（手動承認付き）

* UIで「今月の精算を振込依頼」ボタン（管理者のみ）
* 確認モーダルで以下を固定表示
  * 代理店名 / 振込先 / 金額 / 対象月 / 内訳
* OKで Edge Function がGMOへ振込依頼
* 成功したら
  * `payout_status = requested`
  * `payout_provider_id` を保存
  * `integration_events` に生ログ保存

※GMOあおぞらは振込依頼・振込状況照会などのAPIラインアップがある

※GMO-PG送金サービスもAPIで送金指示・送金結果照会ができる

### 2.2 振込結果の照会（自動ポーリング or Webhook）

* 方式A：**定期照会（ポーリング）**
  * 1時間に1回などで `requested/processing` を照会して更新
* 方式B：**結果通知（Webhookがあるなら）**
  * GMOからの通知を受けて更新

    （決済系では「結果通知」を推奨する旨があり、戻り導線に依存しない設計が一般論として強い ）

最終的に

* 完了 → `payout_status = paid`
* 失敗 → `payout_status = failed`（理由を格納）

---

## 3) 代理店UIで何を実現するか（運用要件）

### 3.1 代理店詳細（月次テーブル）に列追加

* 精算ステータス（draft/invoiced/paid）
* **振込ステータス（unpaid/requested/paid/failed）**
* 振込依頼ID（クリックで詳細）
* 最終更新時刻
* 失敗理由（failed時のみ）

### 3.2 一括振込（将来）

* 代理店が複数いると、月末に死ぬので
  * 「今月の未振込を一括依頼」

    を将来スコープに入れておく

    （GMOあおぞら側には総合振込の系統もある ）

---

## 4) ガードレール（事故防止の仕様）

### 4.1 二重振込防止（必須）

* `payout_status in (requested, processing, paid)` の場合、再依頼ボタンは無効
* 再依頼は「失敗（failed）」に落ちた場合のみ可能
* 依頼時は **冪等性キー（Idempotency）** を使う（GMOあおぞらのAPI更新でも冪等キーの話が出ている ）

### 4.2 金額凍結（必須）

* 一度 `payout_status=requested` になった精算は
  * `unit_price` / `payable_count` / `total_amount` を変更不可

    （変更したいなら、精算をvoid→作り直し）

### 4.3 監査ログ

* 振込依頼、結果更新、失敗、手動上書きはすべて `ops_logs` に残す

---

## 5) “入金確認”もやるなら（お客さん→あなた）

顧客側の「銀行振込（バーチャル口座）」を扱うなら、`invoices` にも同じ思想で入れる。

* `collection_method`: `monthlypay | invoice | bank_transfer_virtual`
* `collection_status`: `unpaid | pending | paid | failed`
* `bank_transfer_reference`（口座/受付番号など）
* 入金明細照会で `paid` に反映

  （GMOあおぞらの振込入金口座の入金明細照会などがラインアップにある ）

---

## 6) 要件定義に追加する決定文（そのまま貼れる）

> 代理店精算における振込状態は、精算（agent_settlements）とは独立した出金ステータス（payout_status）として管理する。
>
> GMOのAPI連携により振込依頼IDを保持し、振込状況照会または結果通知により振込済み/未振込/失敗を更新する。
>
> 二重振込防止のため、振込依頼は冪等性キーを用い、振込依頼後の精算金額は凍結する。

---

## 実務的な最短ルート（設計の順番）

1. `agent_settlements` に payout 系カラム追加（Mockでも同じ）
2. UIに「振込依頼」「状態照会」「失敗再依頼」導線を追加
3. Edge Function を2本用意
   * `POST /payouts/request`
   * `POST /payouts/sync-status`（cron/手動両対応）
4. GMOの方式が確定したら（あおぞら銀行APIかPG送金か）実装を差し替える
