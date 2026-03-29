"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Toaster, toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import FestivalForm from "./components/FestivalForm";
import FestivalList from "./components/FestivalList";
import SendStatus from "./components/SendStatus";
import SetupPanel from "./components/SetupPanel";

type Tab = "festivals" | "send";

export default function AdminClient() {
  const searchParams = useSearchParams();
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("festivals");
  const [selectedFestivalId, setSelectedFestivalId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    const token = searchParams.get("token");
    if (token) {
      verifyToken(token);
    } else {
      checkSession();
    }
  }, []);

  async function verifyToken(token: string) {
    const res = await fetch("/api/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    if (res.ok) {
      window.history.replaceState({}, "", "/admin");
      setAuthenticated(true);
    } else {
      toast.error("リンクが無効または期限切れです。LINEから再度アクセスしてください。");
    }
    setLoading(false);
  }

  async function checkSession() {
    const res = await fetch("/api/admin/festivals");
    if (res.ok) {
      setAuthenticated(true);
    }
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">認証中...</p>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Toaster />
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>アクセスできません</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700">
              LINEのリッチメニューから「管理画面」をタップしてアクセスしてください。
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster />
      <header className="bg-white border-b px-4 py-3">
        <h1 className="text-lg font-bold text-gray-800">祭り担当者 管理画面</h1>
      </header>

      <nav className="bg-white border-b px-4">
        <div className="flex gap-4">
          <button
            onClick={() => setTab("festivals")}
            className={`py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === "festivals"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500"
            }`}
          >
            祭り設定
          </button>
          <button
            onClick={() => setTab("send")}
            className={`py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === "send"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500"
            }`}
          >
            回答状況
          </button>
        </div>
      </nav>

      <main className="p-4 max-w-3xl mx-auto space-y-4">
        <SetupPanel />
        {tab === "festivals" && (
          <>
            <div className="flex justify-between items-center">
              <h2 className="font-semibold text-gray-700">祭り一覧</h2>
              <Button size="sm" onClick={() => setShowAddForm(true)}>
                + 新規追加
              </Button>
            </div>
            {showAddForm && (
              <FestivalForm
                onSaved={() => setShowAddForm(false)}
                onCancel={() => setShowAddForm(false)}
              />
            )}
            <FestivalList onSelect={(id) => { setSelectedFestivalId(id); setTab("send"); }} />
          </>
        )}

        {tab === "send" && (
          <SendStatus
            festivalId={selectedFestivalId}
            onSelectFestival={setSelectedFestivalId}
          />
        )}
      </main>
    </div>
  );
}
