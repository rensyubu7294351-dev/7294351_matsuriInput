"use client";

import { useEffect, useState } from "react";
import liff from "@line/liff";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type State = "loading" | "form" | "submitting" | "done" | "error" | "already_registered";

export default function RegisterPage() {
  const [state, setState] = useState<State>("loading");
  const [lineUserId, setLineUserId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [nickname, setNickname] = useState("");
  const [fullName, setFullName] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function initLiff() {
      try {
        await liff.init({ liffId: process.env.NEXT_PUBLIC_LIFF_ID! });
        if (!liff.isLoggedIn()) {
          liff.login();
          return;
        }
        const profile = await liff.getProfile();
        setLineUserId(profile.userId);
        setDisplayName(profile.displayName);

        // 既に登録済みか確認
        const res = await fetch(`/api/liff/check-member?lineUserId=${profile.userId}`);
        const data = await res.json();
        if (data.registered) {
          setState("already_registered");
        } else {
          setState("form");
        }
      } catch (e) {
        setErrorMessage("LINEの初期化に失敗しました。LINEアプリから開き直してください。");
        setState("error");
      }
    }
    initLiff();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setState("submitting");

    try {
      const res = await fetch("/api/liff/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lineUserId, email: email.trim(), nickname: nickname.trim(), fullName: fullName.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "登録に失敗しました");
      }
      setState("done");
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "登録に失敗しました");
      setState("error");
    }
  }

  if (state === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">読み込み中...</p>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="text-red-500">エラー</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700">{errorMessage}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (state === "already_registered") {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>登録済みです</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700">
              すでにLINE通知の登録が完了しています。
              <br />
              お祭りの回答後に自動でリンクが届きます！
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (state === "done") {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>登録完了！</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700">
              LINE通知の登録が完了しました。
              <br />
              お祭りの出欠フォームに回答すると、招待リンクがLINEで届きます。
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>LINE通知の登録</CardTitle>
          <CardDescription>
            お祭りの招待リンクをLINEで受け取るために登録してください。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="text-xs text-gray-500">LINEの表示名</Label>
              <p className="text-sm font-medium mt-1">{displayName}</p>
            </div>
            <div className="space-y-1">
              <Label htmlFor="email">メールアドレス *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="例：taro@example.com"
                required
              />
              <p className="text-xs text-gray-500">出欠フォームに登録しているメールアドレスを入力してください</p>
            </div>
            <div className="space-y-1">
              <Label htmlFor="nickname">あだ名（任意）</Label>
              <Input
                id="nickname"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="例：たろう"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="fullName">本名（任意）</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="例：山田太郎"
              />
            </div>
            <Button type="submit" className="w-full" disabled={state === "submitting"}>
              {state === "submitting" ? "登録中..." : "登録する"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
