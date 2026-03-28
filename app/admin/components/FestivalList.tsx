"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import FestivalForm from "./FestivalForm";

interface FestivalConfig {
  id: string;
  festivalName: string;
  spreadsheetId: string;
  participationGroupLink: string;
  pendingGroupLink: string;
  deadline: string;
  driveFolderUrl: string;
  createdAt: string;
}

interface FestivalListProps {
  onSelect: (id: string) => void;
}

function deadlineBadge(deadline: string) {
  if (!deadline) return null;
  // JST での現在時刻
  const nowJST = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const todayJST = nowJST.toISOString().slice(0, 10);
  const deadlineDateJST = deadline.slice(0, 10);
  // "YYYY-MM-DD HH:mm" をJSTのDateに変換
  const deadlineJST = new Date(deadline.replace(" ", "T") + ":00+09:00");

  if (deadlineJST < nowJST) return <Badge variant="secondary">期日過ぎ</Badge>;
  if (deadlineDateJST === todayJST) return <Badge variant="destructive">本日期日</Badge>;
  const display = deadlineDateJST.replace(/-/g, "/") + " " + deadline.slice(11, 16);
  return <Badge variant="outline">{display}まで</Badge>;
}

export default function FestivalList({ onSelect }: FestivalListProps) {
  const [configs, setConfigs] = useState<FestivalConfig[]>([]);
  const [editTarget, setEditTarget] = useState<FestivalConfig | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch("/api/admin/festivals");
    if (res.ok) {
      const data = await res.json();
      setConfigs(data);
    } else {
      toast.error("祭り一覧の取得に失敗しました");
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  if (loading) return <p className="text-sm text-gray-500">読み込み中...</p>;

  if (configs.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-gray-500">
          まだ祭りが登録されていません。「+ 新規追加」から登録してください。
        </CardContent>
      </Card>
    );
  }

  if (editTarget) {
    return (
      <FestivalForm
        initial={editTarget}
        onSaved={() => { setEditTarget(null); load(); }}
        onCancel={() => setEditTarget(null)}
      />
    );
  }

  return (
    <div className="space-y-2">
      {configs.map((c) => (
        <Card key={c.id}>
          <CardContent className="py-3 px-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="font-medium text-sm">{c.festivalName}</p>
                <div className="flex items-center gap-2">
                  {deadlineBadge(c.deadline)}
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setEditTarget(c)}>編集</Button>
                <Button size="sm" onClick={() => onSelect(c.id)}>送信状況</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
