# Google・LINE サービス連携仕様

## Googleフォーム
- お祭りごとに担当者が新規作成する
- 入力項目は基本的に毎回同じ（spreadsheet.md参照）
- フォームIDはお祭りごとに異なるため config/ フォルダのJSONで管理する

## Google スプレッドシート
- フォーム回答が自動で連携される
- 認証方法: サービスアカウントを使用する
- スプレッドシートIDはお祭りごとに異なるため config/ フォルダのJSONで管理する

### サービスアカウントの設定手順（初回のみ）
1. Google Cloud Consoleでプロジェクトを作成
2. Google Sheets APIを有効化
3. サービスアカウントを作成してJSONキーを発行
4. 発行したJSONキーを環境変数に設定（下記参照）
5. スプレッドシートの共有設定にサービスアカウントのメールアドレスを編集者として追加

### 環境変数（.envで管理・絶対にGitHubにpushしない）
```
GOOGLE_SERVICE_ACCOUNT_EMAIL=サービスアカウントのメールアドレス
GOOGLE_PRIVATE_KEY=サービスアカウントの秘密鍵
```

## 公式LINEbot
- メンバー全員が登録済み
- Messaging APIを使用している
- LINE拡張ツール「Poster」がWebhook URLに紐づいている

### 環境変数（.envで管理・絶対にGitHubにpushしない）
```
LINE_CHANNEL_ID=チャネルID
LINE_CHANNEL_SECRET=チャネルシークレット
LINE_CHANNEL_ACCESS_TOKEN=チャネルアクセストークン
LIFF_ID=LIFF ID
```

### LINEbot使用上の制約
- Webhook URLは変更・上書き禁止（Posterが紐づいているため）
- Posterの月間送信上限は1000通（1回の祭りで約150通消費）
- 自動グループ追加はLINE規約違反のため実装禁止

## LIFF（LINE Front-end Framework）
- サイズ: Full（画面全体に表示）
- 作成状況: これから作成予定
- LINEとの連携には必ずLIFFを使用すること

### LIFFの注意事項
- LIFFはLINEアプリ内ブラウザで動作するため
  通常のWebブラウザと挙動が異なる場合がある
- LINE LoginとLIFFの初期化（liff.init）は必ずアプリ起動時に実行すること
- liff.init完了前にliff.getProfile等を呼ぶとエラーになるため順序を守ること
- LIFFのエンドポイントURLはVercelのデプロイURL（本番）を設定すること
  ローカル開発時はngrok等でhttpsのURLを用意する必要がある
- LIFF IDは環境変数で管理し、コードにハードコードしない

## config/ フォルダの構成
お祭りごとに以下のJSONを新規作成して差し替える
（担当者はこのファイルだけ更新すれば次の祭りに対応できる）
```json
{
  "festival_name": "2025年夏祭り",
  "form_id": "GoogleフォームのID",
  "spreadsheet_id": "スプレッドシートのID",
  "participation_group_link": "参加グループの招待リンク",
  "pending_group_link": "保留グループの招待リンク",
  "deadline": "2025-07-01",
  "drive_folder_url": "GoogleドライブフォルダのURL"
}
```
```

---
