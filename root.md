# ROOT CSV連携仕様書

「おまかせAIOプラス 顧客管理」システムとROOT間のCSVインポート/エクスポート仕様

---

## 共通仕様

| 項目 | 値 |
|-----|-----|
| 文字コード | UTF-8 (BOM無し) |
| 区切り文字 | カンマ (,) |
| 囲み文字 | ダブルクォート (") |
| 改行コード | LF または CRLF |
| 日付形式 | YYYY-MM-DD |
| 日時形式 | YYYY-MM-DD HH:mm:ss |
| 真偽値 | true / false |
| NULL値 | 空文字 |

---

## 1. アカウント (accounts.csv)

### カラム定義

| # | カラム名 | 型 | 必須 | 説明 | 例 |
|---|---------|-----|:----:|------|-----|
| 1 | account_id | integer | ○ | アカウントID（主キー） | 1234 |
| 2 | account_name | string | ○ | 顧客名・企業名 | 株式会社サンプル |
| 3 | admin_email | string | ○ | ログインメールアドレス | admin@example.com |
| 4 | password | string | - | ログインパスワード | ******* |
| 5 | postal_code | string | - | 郵便番号 | 169-0075 |
| 6 | prefecture | string | - | 都道府県 | 東京都 |
| 7 | address | string | - | 住所（詳細） | 新宿区高田馬場1-1-1 |
| 8 | phone_1 | string | - | 電話番号（市外局番） | 03 |
| 9 | phone_2 | string | - | 電話番号（市内局番） | 1234 |
| 10 | phone_3 | string | - | 電話番号（番号） | 5678 |
| 11 | contact_person | string | - | アカウント担当者 | 山田太郎 |
| 12 | line_notification | boolean | - | LINE公式通知 | true |
| 13 | influencer_db_plan | string | - | インフルエンサーDB（free/unlimited） | free |
| 14 | memo | string | - | メモ | 備考テキスト |
| 15 | instagram_linked | boolean | - | インスタ連携状態 | true |
| 16 | gbp_linked | boolean | - | GBP管理状態 | true |
| 17 | instagram_gbp_linked | boolean | - | インスタxGBP連携状態 | false |
| 18 | total_contracts | integer | - | 合計契約数 | 5 |
| 19 | monthly_total | integer | - | 月額料金合計 | 50000 |

### サンプル

```csv
account_id,account_name,admin_email,password,postal_code,prefecture,address,phone_1,phone_2,phone_3,contact_person,line_notification,influencer_db_plan,memo,instagram_linked,gbp_linked,instagram_gbp_linked,total_contracts,monthly_total
1234,株式会社サンプル,admin@example.com,,169-0075,東京都,新宿区高田馬場1-1-1,03,1234,5678,山田太郎,true,free,テスト顧客,true,true,false,5,50000
```

---

## 2. 代理店 (agencies.csv)

### カラム定義

| # | カラム名 | 型 | 必須 | 説明 | 例 |
|---|---------|-----|:----:|------|-----|
| 1 | agency_id | integer | ○ | 代理店ID（主キー） | 137 |
| 2 | agency_name | string | ○ | 代理店名 | 代理店A |
| 3 | email | string | ○ | ログインメールアドレス | agency@example.com |
| 4 | password | string | - | ログインパスワード | ******* |
| 5 | postal_code | string | - | 郵便番号 | 150-0001 |
| 6 | prefecture | string | - | 都道府県 | 東京都 |
| 7 | address | string | - | 住所（詳細） | 渋谷区神宮前1-1-1 |
| 8 | phone_1 | string | - | 電話番号（市外局番） | 03 |
| 9 | phone_2 | string | - | 電話番号（市内局番） | 9876 |
| 10 | phone_3 | string | - | 電話番号（番号） | 5432 |
| 11 | instagram_wholesale_price | integer | - | インスタ連携仕切価格 | 3000 |
| 12 | gbp_wholesale_price | integer | - | Google管理仕切価格 | 5000 |
| 13 | combo_wholesale_price | integer | - | インスタxGoogle仕切価格 | 7000 |
| 14 | contact_person | string | - | 担当者 | 佐藤花子 |
| 15 | instagram_alert_emails | string | - | インスタ運用アラート通知メール（カンマ区切り） | a@example.com,b@example.com |
| 16 | influencer_alert_emails | string | - | インフルエンサー運用アラート通知メール | alert@example.com |
| 17 | recruit_alert_emails | string | - | リクルート運用アラート通知メール | recruit@example.com |
| 18 | memo | string | - | メモ | 備考 |
| 19 | location_count | integer | - | 獲得ロケーション数 | 25 |

### サンプル

```csv
agency_id,agency_name,email,password,postal_code,prefecture,address,phone_1,phone_2,phone_3,instagram_wholesale_price,gbp_wholesale_price,combo_wholesale_price,contact_person,instagram_alert_emails,influencer_alert_emails,recruit_alert_emails,memo,location_count
137,代理店A,agency@example.com,,150-0001,東京都,渋谷区神宮前1-1-1,03,9876,5432,3000,5000,7000,佐藤花子,a@example.com,alert@example.com,recruit@example.com,優良代理店,25
```

---

## 3. エラー管理 (linkage_errors.csv)

### カラム定義

| # | カラム名 | 型 | 必須 | 説明 | 例 |
|---|---------|-----|:----:|------|-----|
| 1 | account_id | integer | ○ | アカウントID（FK） | 1234 |
| 2 | account_name | string | - | アカウント名（表示用） | 株式会社サンプル |
| 3 | admin_email | string | - | adminユーザー（表示用） | admin@example.com |
| 4 | location_id | string | ○ | ロケーションID | loc_abc123 |
| 5 | location_name | string | - | ロケーション名 | 新宿店 |
| 6 | fb_error | string | - | Facebookエラー内容 | トークン期限切れ |
| 7 | ig_error | string | - | Instagramエラー内容 | 認証エラー |
| 8 | gbp_error | string | - | GBPエラー内容 | アクセス権限なし |
| 9 | line_error | string | - | LINEエラー内容 | 接続タイムアウト |

### サンプル

```csv
account_id,account_name,admin_email,location_id,location_name,fb_error,ig_error,gbp_error,line_error
1234,株式会社サンプル,admin@example.com,loc_abc123,新宿店,トークン期限切れ,,,
```

---

## 4. CSVエクスポート履歴 (export_history.csv)

### 基本情報CSV / IG情報CSV / YPlace情報CSV / MEO順位計測CSV

| # | カラム名 | 型 | 必須 | 説明 | 例 |
|---|---------|-----|:----:|------|-----|
| 1 | created_at | date | ○ | 作成日 | 2025-01-12 |
| 2 | status | string | ○ | ステータス（pending/completed/failed） | completed |
| 3 | start_date | date | ○ | 対象期間開始日 | 2025-01-01 |
| 4 | end_date | date | ○ | 対象期間終了日 | 2025-01-31 |

### 送信数CSV（SMS数）

| # | カラム名 | 型 | 必須 | 説明 | 例 |
|---|---------|-----|:----:|------|-----|
| 1 | target_month | string | ○ | 対象月（YYYY-MM形式） | 2025-01 |

---

## システム情報

| 項目 | 値 |
|-----|-----|
| システム名 | おまかせAIOプラス 顧客管理 |
| GBPグループID | 5895311557 |
| 連携プラットフォーム | Google Business Profile, Instagram, Yahoo Place, LINE |

---

## インポート手順

1. ROOTから対象データをCSVエクスポート
2. 文字コードがUTF-8であることを確認
3. カラム名が上記仕様と一致することを確認
4. システムの「インポート」機能からCSVをアップロード

## エクスポート手順

1. システムの「エクスポート」機能から対象データを選択
2. CSVファイルをダウンロード
3. ROOTのインポート機能からCSVをアップロード
