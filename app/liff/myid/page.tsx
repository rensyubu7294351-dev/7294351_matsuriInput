"use client";

import { useEffect, useState } from "react";
import liff from "@line/liff";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function MyIdPage() {
  const [lineUserId, setLineUserId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function init() {
      try {
        await liff.init({ liffId: process.env.NEXT_PUBLIC_LIFF_ID! });
        if (!liff.isLoggedIn()) { liff.login(); return; }
        const profile = await liff.getProfile();
        setLineUserId(profile.userId);
        setDisplayName(profile.displayName);
      } catch (e) {
        setError("エラー: " + (e instanceof Error ? e.message : String(e)));
      }
    }
    init();
  }, []);

  function handleCopy() {
    navigator.clipboard.writeText(lineUserId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (error) return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <p className="text-red-500 text-sm">{error}</p>
    </div>
  );

  if (!lineUserId) return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-gray-500 text-sm">読み込み中...</p>
    </div>
  );

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-base">あなたのLINE情報</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-xs text-gray-500">表示名</p>
            <p className="font-medium">{displayName}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">LINE user ID</p>
            <p className="font-mono text-sm break-all bg-gray-100 rounded p-2 mt-1">
              {lineUserId}
            </p>
          </div>
          <Button className="w-full" onClick={handleCopy}>
            {copied ? "コピーしました！" : "IDをコピーする"}
          </Button>
          <p className="text-xs text-gray-400 text-center">
            このIDを担当者にお伝えください
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
