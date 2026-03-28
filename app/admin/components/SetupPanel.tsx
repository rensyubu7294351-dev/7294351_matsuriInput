"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface SetupStatus {
  ready: boolean;
  reason?: string;
  existingSheets?: string[];
  missingSheets?: string[];
  spreadsheetId?: string;
}

export default function SetupPanel() {
  const [status, setStatus] = useState<SetupStatus | null>(null);
  const [initializing, setInitializing] = useState(false);

  async function checkStatus() {
    try {
      const res = await fetch("/api/admin/setup");
      if (res.ok) {
        setStatus(await res.json());
      } else {
        setStatus({ ready: false });
      }
    } catch {
      setStatus({ ready: false });
    }
  }

  useEffect(() => { checkStatus(); }, []);

  async function handleInit() {
    setInitializing(true);
    const res = await fetch("/api/admin/setup", { method: "POST" });
    const data = await res.json();
    if (res.ok) {
      toast.success(data.message ?? "初期化しました");
      await checkStatus();
    } else {
      toast.error(data.error ?? "初期化に失敗しました");
    }
    setInitializing(false);
  }

  if (!status) return null;
  if (status.ready) return null;

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-orange-800">初回セットアップ</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-orange-700">
          管理用スプレッドシートの初期化が必要です。
          「シートを初期化する」ボタンを押すと自動で作成されます。
        </p>
        {status.missingSheets && status.missingSheets.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {status.missingSheets.map((s) => (
              <Badge key={s} variant="outline" className="text-orange-600 border-orange-300">
                {({ members: "メンバーのLINE ID管理シート", festival_configs: "祭り設定シート", sent_log: "送信履歴シート" } as Record<string, string>)[s] ?? s} が未作成
              </Badge>
            ))}
          </div>
        )}
        <Button
          size="sm"
          onClick={handleInit}
          disabled={initializing}
          className="bg-orange-600 hover:bg-orange-700 text-white"
        >
          {initializing ? "初期化中..." : "シートを初期化する"}
        </Button>
      </CardContent>
    </Card>
  );
}
