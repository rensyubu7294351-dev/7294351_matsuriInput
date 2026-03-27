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
    const res = await fetch("/api/admin/setup");
    if (res.ok) setStatus(await res.json());
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

  if (status.ready) return null; // 準備完了時は表示しない

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-orange-800">初回セットアップが必要です</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {status.reason ? (
          <p className="text-xs text-orange-700">{status.reason}</p>
        ) : (
          <>
            <p className="text-xs text-orange-700">
              管理用スプレッドシートに必要なシートが不足しています。
              「シートを初期化する」ボタンを押すと自動で作成されます。
            </p>
            <div className="flex flex-wrap gap-1">
              {status.missingSheets?.map((s) => (
                <Badge key={s} variant="outline" className="text-orange-600 border-orange-300">
                  {s} が未作成
                </Badge>
              ))}
            </div>
            <Button
              size="sm"
              onClick={handleInit}
              disabled={initializing}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              {initializing ? "初期化中..." : "シートを初期化する"}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
