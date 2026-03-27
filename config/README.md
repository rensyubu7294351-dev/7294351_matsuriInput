# configフォルダの使い方

## お祭りごとにやること
1. `festival-YYYY-MM-祭り名.json` をコピーして新しいファイルを作る
2. 各項目を埋める
3. エンジニアに連絡する

## 各項目の調べ方

### form_id
GoogleフォームのURLの以下の部分をコピーする
https://docs.google.com/forms/d/【ここがform_id】/edit

### spreadsheet_id
スプレッドシートのURLの以下の部分をコピーする
https://docs.google.com/spreadsheets/d/【ここがspreadsheet_id】/edit

### participation_group_link / pending_group_link
LINEグループを開く
→ 右上のメニュー
→ 招待リンクをコピー

### participation_group_qr / pending_group_qr
LINEグループのQRコード画像をGoogleドライブにアップロードして
共有リンクを取得してここに貼る

## 注意事項
- このフォルダのファイルはGitHubにアップしない（.gitignoreで除外済み）
- 値を変更したらエンジニアに必ず連絡する
```

---

## プロジェクト階層
```
project/
├── CLAUDE.md                          ✅
├── .gitignore                         ✅
├── .env                               ✅
├── config/
│   ├── README.md                      ✅
│   └── festival-YYYY-MM-祭り名.json   ✅
├── docs/
│   └── members.csv
└── .claude/
    └── rules/
        ├── background.md              ✅
        ├── spreadsheet.md             ✅
        └── google-services.md         ✅