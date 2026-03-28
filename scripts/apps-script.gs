/**
 * Google Apps Script - フォーム回答トリガー
 *
 * 使い方:
 * 1. Googleフォームに紐付いたスプレッドシートのApps Scriptにこのコードをコピーする
 * 2. スクリプトプロパティを設定する（下記参照）
 * 3. onFormSubmit を「フォーム送信時」トリガーとして登録する
 *
 * スクリプトプロパティ（スクリプトエディタ > プロジェクトの設定 > スクリプトのプロパティ）:
 *   APP_URL        : アプリのURL（例: https://7294351matsuriinput.vercel.app）※毎回同じ
 *   WEBHOOK_SECRET : 管理者から共有された秘密キー ※毎回同じ
 *
 * ※ FESTIVAL_IDの設定は不要です。スプレッドシートIDから自動で祭りを特定します。
 */

function onFormSubmit(e) {
  var props = PropertiesService.getScriptProperties();
  var appUrl = props.getProperty("APP_URL");
  var webhookSecret = props.getProperty("WEBHOOK_SECRET");

  if (!appUrl || !webhookSecret) {
    Logger.log("スクリプトプロパティが設定されていません（APP_URL と WEBHOOK_SECRET が必要です）");
    return;
  }

  // このスプレッドシート自身のIDを自動取得（FESTIVAL_IDの手動設定が不要）
  var spreadsheetId = SpreadsheetApp.getActiveSpreadsheet().getId();

  // e.values はスプレッドシートの列に対応（0始まり）
  // A=0(タイムスタンプ), B=1(メールアドレス), C=2(あだ名), ..., H=7(参加・不参加)
  // F列・G列が同名「振り」のためタイトルではなく列番号で取得
  var values = e.values;
  var nickname = values[2] || "";
  var status = values[7] || "";

  if (!nickname || !status) {
    Logger.log("あだ名またはステータスが取得できませんでした");
    return;
  }

  var payload = JSON.stringify({
    spreadsheetId: spreadsheetId,
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
