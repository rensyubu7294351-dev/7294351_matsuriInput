/**
 * Google Apps Script - フォーム回答トリガー
 *
 * 使い方:
 * 1. Googleフォームのスクリプトエディタにこのコードをコピーする
 * 2. スクリプトプロパティを設定する（下記参照）
 * 3. onFormSubmit を「フォーム送信時」トリガーとして登録する
 *
 * スクリプトプロパティ（スクリプトエディタ > プロジェクトの設定 > スクリプトのプロパティ）:
 *   APP_URL          : デプロイ後のVercelのURL（例: https://your-app.vercel.app）
 *   FESTIVAL_ID      : 該当祭りのID（管理画面から確認）
 *   WEBHOOK_SECRET   : 環境変数 APPS_SCRIPT_WEBHOOK_SECRET と同じ値
 */

function onFormSubmit(e) {
  var props = PropertiesService.getScriptProperties();
  var appUrl = props.getProperty("APP_URL");
  var festivalId = props.getProperty("FESTIVAL_ID");
  var webhookSecret = props.getProperty("WEBHOOK_SECRET");

  if (!appUrl || !festivalId || !webhookSecret) {
    Logger.log("スクリプトプロパティが設定されていません");
    return;
  }

  // フォームの回答からあだ名と参加ステータスを取得
  // C列(index 2)=あだ名, H列(index 7)=参加・不参加
  var responses = e.response.getItemResponses();
  var nickname = "";
  var status = "";

  // タイトルで特定せず、インデックスで取得（F列・G列が同名「振り」のため）
  // スプレッドシートの列順に対応: C=index2, H=index7
  if (responses.length > 2) {
    nickname = responses[2].getResponse();
  }
  if (responses.length > 7) {
    status = responses[7].getResponse();
  }

  if (!nickname || !status) {
    Logger.log("あだ名またはステータスが取得できませんでした");
    return;
  }

  var payload = JSON.stringify({
    festivalId: festivalId,
    nickname: nickname,
    status: status
  });

  var options = {
    method: "post",
    contentType: "application/json",
    headers: {
      "x-webhook-secret": webhookSecret
    },
    payload: payload,
    muteHttpExceptions: true
  };

  var url = appUrl + "/api/form-webhook";
  var response = UrlFetchApp.fetch(url, options);
  Logger.log("Response: " + response.getResponseCode() + " " + response.getContentText());
}
