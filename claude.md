# Claude Code 設定 — お任せAI管理システム

## 最重要: 要件定義書の参照

**実装を始める前に、必ず `plan.md` を読むこと。**

`plan.md` には以下が定義されている:
- ER設計（テーブル一覧、リレーション、カラム定義）
- 業務フロー（営業〜契約〜決済〜稼働〜解約）
- UI設計（画面構成、コンポーネント、導線）
- OpenAI API統合方針
- ステータス定義と遷移ルール

**新しい機能を実装する際は、必ず `plan.md` の該当セクションを確認してから実装すること。**

---

## プロジェクト概要

MEO特化型ツール事業における「営業→契約→初回決済→稼働→継続課金→解約」を一気通貫で管理するシステム。

---

## 開発フェーズ（絶対遵守）

### 現在: Phase 1（Mock実装）

- Supabaseに**接続しない**
- 「後でSupabaseへ差し替え可能」な構造で実装
- UI操作（作成/更新/遷移/送信下書き生成）は**押したら反映されるデモ動作**を必ず実現
- リレーション（店舗→契約→請求→入金→通知/ログ）は擬似DBで再現

### Phase 2（後日）: Supabase統合

- DB移行、Auth + RLS導入、Edge Functions組み込み
- MockからSupabaseへDI差し替え

---

## 技術スタック

- TypeScript（厳密な型付け必須）
- Tailwind CSS
- Next.js App Router
- Supabase（Phase 2）
- OpenAI API（Phase 2、Phase 1ではスタブ）

---

## 非交渉の設計原則（ガードレール）

### 1. データモデル中心設計

コアエンティティ（Phase 1/2共通の型）:

- `Store`（店舗）
- `Contract`（契約）
- `Invoice`（請求）
- `Payment`（入金）
- `RouteIntegration`（ルート稼働状態）
- `Notification`（通知ログ：下書き含む）
- `OpsLog`（操作ログ）
- `IntegrationEvent`（外部イベントログ）

### 2. 4系統の状態を分離（混ぜない）

```
contracts.status    : lead | closed_won | active | cancel_pending | cancelled
invoices.status     : draft | sent | paid | overdue | void
payments.status     : pending | succeeded | failed | refunded | chargeback
integrations_route.status : preparing | running | paused | deleting | deleted | error
```

矛盾状態（例：contract active だが invoice overdue）は許容し、UIで危険フラグ表示。

### 3. 単一真実（Single Source of Truth）

- 請求金額の正は `invoices.amount`
- 入金の正は `payments`（succeeded）
- 契約の月額は「生成の参考」だが請求確定ではない

### 4. 自動と手動の境界

- AI/自動処理は「下書き」「提案」まで
- 送信、解約確定、ルート削除など不可逆操作は**人間の実行必須**（確認モーダル＋理由入力）

### 5. 監査ログ必須

契約ステータス変更、請求確定、入金手動反映、解約確定などの重要操作は必ず `ops_logs` に残す。

---

## 実装アーキテクチャ（Mock差し替え前提）

### レイヤー分割（絶対）

```
src/
├── app/                    # Next.js App Router（ページ）
├── components/             # UIコンポーネント
├── usecases/               # Application層（操作手順/状態遷移/検証）
├── repositories/           # Data Access層（CRUD）
│   ├── interfaces/         # Repository Interface
│   ├── mock/               # MockRepository（Phase 1）
│   └── supabase/           # SupabaseRepository（Phase 2）
├── domain/                 # 型定義、status、validation
│   ├── types/
│   ├── status/
│   └── validation/
├── lib/                    # ユーティリティ
└── seed/                   # デモ用シードデータ
```

### Repository Interface（必須）

各エンティティに対し最低限のCRUDと検索を定義:

- `storeRepo`: list/search/get/create/update
- `contractRepo`: list/filter/get/create/update/changeStatus
- `invoiceRepo`: listByMonth/listByContract/create/update/markSent/markPaid/markOverdue
- `paymentRepo`: create/markSucceeded/markFailed
- `notificationRepo`: createDraft/updateDraft/markSent
- `logRepo`: append

**UIはSupabase SDKを直接呼ばない。必ずUsecaseを経由する。**

---

## Mockデータ要件（Phase 1）

### 擬似DB

- in-memory（モジュール内配列）
- Repository経由でアクセス
- IDはuuid風

### 擬似リレーション

- Store→Contract→Invoice/Payment を追える
- 契約詳細画面で「請求/入金タイムライン」が表示され、操作で状態が変わる

### 擬似遅延・失敗

- APIっぽさを出すため200〜600msの遅延を入れる
- 失敗ケース（決済失敗、ルートerror、送信失敗）を再現できるトグル

---

## UIスコープ（Phase 1必須画面）

1. **ダッシュボード**: KPIカード、アラートテーブル、ドリルダウン導線
2. **店舗検索**: フリーワード検索、結果→店舗詳細へ遷移
3. **契約一覧**: status/プラン/支払い方法/担当/月でフィルタ、「次アクション」列
4. **契約詳細（司令室）**: 状態遷移バー、請求/入金タイムライン、ルート状態カード、通知（下書き生成→編集→送信デモ）
5. **請求（今月）**: 未送付/送付済/入金済/期限超過のタブ
6. **未入金/督促**: overdue日数順、督促下書き生成→送信ログ反映
7. **解約管理**: cancel_pending一覧、最終入金待ち→ルート停止/削除→cancelled確定

---

## ステータス遷移ガード

### Contract遷移ルール

| From | To | 条件 |
|------|-----|------|
| lead | closed_won | OK |
| closed_won | active | 初回入金(succeeded)が必要 |
| active | cancel_pending | OK（理由必須） |
| cancel_pending | cancelled | 最終入金確認＋ルート停止/削除完了が必要 |
| cancelled | * | NG（不可逆） |

遷移前に「条件チェック」を行い、UIにNG理由を表示する。

---

## 通知文生成（Phase 1スタブ）

- `notification_type`ごとのテンプレ骨格を固定
- 生成ボタンで「テンプレ＋差し込み変数」で下書きを生成
- OpenAIは呼ばない（Phase 2でEdge Functionに置換）
- 下書きは`notifications`に保存され、編集できる
- "送信"はデモとして`status=sent`にする（実送信しない）

---

## Phase 1 受け入れ条件

以下がデモで成立したらPhase 2へ進む:

1. 店舗作成→契約作成→請求生成→入金反映→稼働開始がUIで一連に動く
2. 未入金（overdue）を再現し、督促下書き→送信ログが残る
3. 解約（cancel_pending）→最終入金待ち→ルート停止/削除→cancelled確定が動く
4. 一覧フィルタと検索が快適に動作し、関連データに遷移できる
5. 重要操作のops_logsが全て記録され、契約詳細で追える

---

## 禁止事項

- UIからSupabase SDKを直叩きする
- 状態（status）を一つのフィールドに混ぜる
- 金額・期限をAIに計算させる
- 自動送信/自動停止/自動解約を入れる
- 例外ケースを無限に作り込む（まずMVPルールを固定）
- 必要以上のコメントやドキュメントを追加する

---

## コーディング規約

### TypeScript

- 厳密な型付け（`any`禁止、`unknown`を使用）
- 全エンティティに型定義必須
- Repository Interfaceは必ず定義

### ファイル命名

- コンポーネント: PascalCase（`ContractDetail.tsx`）
- ユーティリティ/hooks: camelCase（`useContract.ts`）
- 型定義: PascalCase（`Contract.ts`）

### コンポーネント

- 1ファイル1コンポーネント
- Props型は同ファイルで定義
- Tailwind CSSのみ使用（CSS Modules不使用）

### 状態管理

- Server Components優先
- Client Stateは最小限
- フォームは React Hook Form

---

## 参照ドキュメント

### plan.md（必読）

実装時に以下のセクションを参照:

| 実装内容 | plan.md セクション |
|---------|-------------------|
| 型定義・エンティティ | 「4) Postgres想定のテーブル設計」 |
| リレーション設計 | 「2) リレーション定義」 |
| ステータス管理 | 「3) 状態（ステータス）をどう持つか」 |
| UI/画面設計 | 「UI設計（A）— 画面構成・導線」 |
| 検索機能 | 「6) 検索をDB設計で勝たせる」 |
| 通知・文章生成 | 「本命①：請求・督促・解約の文章生成」 |
| 次アクション機能 | 「本命②：次アクション自動提案」 |

**不明点があれば、実装前に plan.md を grep/検索して該当箇所を確認すること。**

---

## 出力成果物（実装時に作成）

1. フォルダ構成（上記アーキテクチャに従う）
2. 型定義（domain/types/）
3. Repository Interface + MockRepository
4. 主要画面のUI（Tailwind）
5. 主要usecase（作成・更新・遷移）
6. デモ用seedデータ生成
7. 受け入れ条件を満たす操作シナリオ
