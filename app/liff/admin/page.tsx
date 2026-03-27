"use client";

import { useEffect, useState } from "react";
import liff from "@line/liff";

export default function LiffAdminPage() {
  const [status, setStatus] = useState("LINEを確認しています...");

  useEffect(() => {
    async function run() {
      try {
        await liff.init({ liffId: process.env.NEXT_PUBLIC_LIFF_ID! });
        if (!liff.isLoggedIn()) {
          liff.login();
          return;
        }

        const profile = await liff.getProfile();

        // ワンタイムトークンを要求
        const res = await fetch("/api/auth/magic-link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lineUserId: profile.userId }),
        });

        if (res.status === 403) {
          setStatus("管理者として登録されていません。担当者にご連絡ください。");
          return;
        }

        if (!res.ok) {
          setStatus("エラーが発生しました。しばらくしてから再試行してください。");
          return;
        }

        const { url } = await res.json();
        // 管理画面へリダイレクト
        window.location.href = url;
      } catch {
        setStatus("LINEの初期化に失敗しました。LINEアプリから開き直してください。");
      }
    }
    run();
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <p className="text-gray-600 text-sm">{status}</p>
    </div>
  );
}
