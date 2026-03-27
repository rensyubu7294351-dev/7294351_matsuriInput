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

##  管理用Googleスプレッドシートとは？
①お祭りごとのスプレッドシート（既存）
└── Googleフォームの回答が自動で入る
└── 担当者がすでに持っているもの
└── 触らない・削除しない

②管理用スプレッドシート（新規作成が必要）
└── アプリが動くために必要なデータを保存する
└── 今回新しく作るもの
管理用スプレッドシートに入るデータ
membersシート
└── LINEに登録しているメンバーのUID一覧
└── 例：あだ名・氏名・LINE UID・登録日

festival_configsシート
└── お祭りごとの設定情報
└── 例：祭り名・期日・招待リンク・スプレッドシートID

sent_logシート
└── 招待リンクをLINEで送った記録
└── 例：誰に・いつ・どの祭りの・どのリンクを送ったか

## サービスアカウントのメールアドレスとは？
一言で言うと：アプリがGoogleスプレッドシートを読み書きするための「ロボット用Googleアカウント」です
通常、スプレッドシートを見るには人間がGoogleアカウントでログインします。でもVercelで動くアプリは自動でサー
  バーが動くので、人間のログインができません。そのため「サービスアカウント」という特別なロボット用アカウント
  を作り、そのアカウントをスプレッドシートに招待することで、アプリがスプレッドシートを読み書きできるようにな
  ります。                                                  
  ---
  祭りごとに作り直す必要はある？ 
  ありません。一度設定したら永久に使い回せます。

  ① 新しいGoogleフォームを作る（今まで通り）                                                                
  ② スプレッドシートの「共有」に同じメールアドレスを追加                                                    
     → id-294351-matsuri@matsuriform.iam.gserviceaccount.com                                
  ③ 管理画面でスプレッドシートIDなどを入力する
## サービスアカウントのメールアドレス確認方法
  共有手順（念のため）                                      
                                                                                                            
  1. 新しく作り直したGoogleフォームのスプレッドシートを開く
  2. 右上「共有」をクリック                                                                                 
  3. 上記メールアドレスを入力                                                                               
  4. 権限を「編集者」に設定
  5. 「通知を送信」のチェックを外す                                                                         
  6. 「共有」をクリック 
  これを .envファイルのGOOGLE_SERVICE_ACCOUNT_EMAILに追加


## サービスアカウントを作り直す手順
  Step 1: Google Cloud Consoleにアクセス                                                                    
  https://console.cloud.google.com を開く                                                                   
                                                            
  Step 2: プロジェクトを選択                                                                                
  画面上部のプロジェクト名をクリックして、既存のプロジェクトを選択（または新規作成）                        
                                                            
  Step 3: サービスアカウントを作成                                                                          
  1. 左メニュー →「IAMと管理」→「サービスアカウント」                                                       
  2. 「+ サービスアカウントを作成」をクリック
  3. 名前を入力（例：yosakoi-app）→「作成して続行」                                                         
  4. ロールの選択はスキップして「完了」                                                                     
                                                                                                            
  Step 4: JSONキーを発行                                                                                    
  1. 作成したサービスアカウントをクリック                                                                   
  2. 「キー」タブ →「鍵を追加」→「新しい鍵を作成」          
  3. 形式「JSON」を選択 →「作成」                                                                           
  4. JSONファイルが自動ダウンロードされる
                                                                                                            
  Step 5: JSONから値を取り出して.envに設定                                                                  
  ダウンロードしたJSONファイルを開くと以下のような内容が入っています：                                      
                                                            
  {
    "client_email": "xxxx@xxxx.iam.gserviceaccount.com",  ← GOOGLE_SERVICE_ACCOUNT_EMAIL                    
    "private_key": "-----BEGIN PRIVATE KEY-----\n...",     ← GOOGLE_PRIVATE_KEY                             
  }                                                                                                         
                                                                                                            
  .envの以下2箇所を新しい値に書き換えてください：                                                           
  GOOGLE_SERVICE_ACCOUNT_EMAIL=新しいメールアドレス                                                         
  GOOGLE_PRIVATE_KEY="新しい秘密鍵"                                                                         
   
  Step 6: Google Sheets APIを有効化（新規プロジェクトの場合のみ）                                           
  1. Google Cloud Console →「APIとサービス」→「ライブラリ」                                                 
  2. 「Google Sheets API」と「Google Forms API」を検索 →「有効にする」            
                                                                                                            
  Step 7: 共有設定を更新                                                                                    
  これまで共有していた全スプレッドシート（管理用＋祭りごとのもの）に、新しいメールアドレスを編集者として再登
  録してください。                                          
                                                              

## MEMBERS_SPREADSHEET_IDとはなんですか？
管理用スプレッドシートのIDです。GoogleスプレッドシートのURLに含まれている文字列です。                     

  確認方法
  Googleスプレッドシートを開いたときのURLを見てください。   
  https://docs.google.com/spreadsheets/d/【ここがMEMBERS_SPREADSHEET_ID】/edit#gid=0
 例：                                                      
  https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms/edit 
                                          ↑ これがIDです (1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms )
手順                                                                       
  1. Googleドライブで新しいスプレッドシートを作成（名前は「よさこい管理DB」など）
  2. 作成後にブラウザのURLバーを見る                                                                        
  3. /d/ と /edit の間の文字列をコピーする                                                                  
  4. .env ファイルの MEMBERS_SPREADSHEET_ID= の後ろに貼り付ける

  補足
  このスプレッドシートは中身が完全に空でOKです。シートタブを作ったりヘッダーを書いたりする必要はありません。
  それはアプリが自動でやります（管理画面の「シートを初期化する」ボタン）。                                  
   
  スプレッドシートを作成したら MEMBERS_SPREADSHEET_ID を教えてください。.envに設定します

 ##  MEMBERS_SPREADSHEET_ID 設定後
  1. 作成したスプレッドシートを開く
  2. 右上の「共有」ボタンをクリック
  3. 以下のサービスアカウントのメールアドレスを入力して「編集者」として追加：
  id-7294351-demo-liff@hale-woodland-491504-d2.iam.gserviceaccount.com
  4. 「通知を送信」のチェックを外して「共有」をクリック
    これでアプリがスプレッドシートを読み書きできるようになります
    このあと、次は  ADMIN_LINE_USER_IDS（あなた自身のLINE user ID）の設定に進みます。

## ADMIN_LINE_USER_IDS（あなた自身のLINE user ID）の設定方法
LINE user IDを確認するためには、LINEアプリからLIFFページを開く必要があります。そのためにはアプリをデプロイする必要があります。
  最も効率的な順番：Vercelにデプロイ → LINE user IDを確認 → 設定更新 という流れで進めましょう。
  まずVercelデプロイの準備として、LINE user IDを表示する専用ページを作ります
  ### Vercelデプロイの手順

  Step 1: GitHubにコードをプッシュ

  ターミナルで以下を実行してください（! コマンドで実行できます）：

  # GitHubで新しいリポジトリを作成してから実行
  git remote add origin https://github.com/【あなたのユーザー名】/【リポジトリ名】.git
  git add .
  git commit -m "初回コミット"
  git push -u origin master

  Step 2: Vercelにデプロイ

  1. https://vercel.com にアクセス
  2. 「Add New Project」→ GitHubのリポジトリを選択
  3. 「Environment Variables」に以下を全て入力：
  Step 3: LINE user IDを確認

  デプロイ完了後、LINEアプリで以下のURLを開くと自分のLINE user IDが表示されます：
  https://liff.line.me/2008786392-HGBbfaYj?path=/liff/myid

  表示されたIDを ADMIN_LINE_USER_IDS にVercelの環境変数から設定→再デプロイで完了です