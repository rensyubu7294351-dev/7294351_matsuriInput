/**
 * Google Apps Script - フォーム回答トリガー
 *
 * 使い方:
 * 1. Googleフォームに紐付いたスプレッドシートのApps Scriptにこのコードをコピーする
 * 2. onFormSubmit を「フォーム送信時」トリガーとして登録する
 *
 * ※ 下の2行は変更しないでください
 * ※ FESTIVAL_IDの設定は不要です。スプレッドシートIDから自動で祭りを特定します。
 */

var APP_URL = "https://7294351matsuriinput.vercel.app";
var WEBHOOK_SECRET = "MOQIrIeAohA/KsHFIl7pwDzfv4hmp8FpsE9J73QGvAM=";

function onFormSubmit(e) {
  var appUrl = APP_URL;
  var webhookSecret = WEBHOOK_SECRET;

  // このスプレッドシート自身のIDを自動取得（FESTIVAL_IDの手動設定が不要）
  var spreadsheetId = SpreadsheetApp.getActiveSpreadsheet().getId();

  // e.values はスプレッドシートの列に対応（0始まり）
  // A=0(タイムスタンプ), B=1(メールアドレス), C=2(あだ名), ..., H=7(参加・不参加)
  // F列・G列が同名「振り」のためタイトルではなく列番号で取得
  var values = e.values;
  var email = values[1] || "";
  var status = values[7] || "";

  if (!email || !status) {
    Logger.log("メールアドレスまたはステータスが取得できませんでした");
    return;
  }

  var payload = JSON.stringify({
    spreadsheetId: spreadsheetId,
    email: email,
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
