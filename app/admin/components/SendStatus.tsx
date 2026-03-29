"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import GroupStatus from "./GroupStatus";

interface SendRecord {
  nickname: string;
  fullName: string;
  status: string;
  inviteType: "participation" | "pending" | null;
  sent: boolean;
  sentAt: string | null;
}

interface FestivalConfig {
  id: string;
  festivalName: string;
}

interface SendStatusProps {
  festivalId: string | null;
  onSelectFestival: (id: string | null) => void;
}

function inviteTypeBadge(inviteType: string | null, sent: boolean) {
  if (!inviteType) return <Badge variant="outline" className="text-gray-400">対象外</Badge>;
  if (sent) return <Badge variant="default" className="bg-green-500">送信済み</Badge>;
  return (
    <Badge variant="secondary">
      {inviteType === "participation" ? "参加グループ" : "保留グループ"}
    </Badge>
  );
}

export default function SendStatus({ festivalId, onSelectFestival }: SendStatusProps) {
  const [records, setRecords] = useState<SendRecord[]>([]);
  const [festivals, setFestivals] = useState<FestivalConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetch("/api/admin/festivals")
      .then((r) => r.json())
      .then(setFestivals);
  }, []);

  useEffect(() => {
    if (!festivalId) return;
    loadRecords();
  }, [festivalId]);

  async function loadRecords() {
    if (!festivalId) return;
    setLoading(true);
    const res = await fetch(`/api/admin/send?festivalId=${festivalId}`);
    if (res.ok) {
      setRecords(await res.json());
    } else {
      toast.error("送信状況の取得に失敗しました");
    }
    setLoading(false);
  }

  async function handleSendAll() {
    if (!festivalId) return;
    const unsentCount = records.filter((r) => r.inviteType && !r.sent).length;
    if (unsentCount === 0) {
      toast.info("未送信のメンバーはいません");
      return;
    }
    if (!confirm(`${unsentCount}人に招待リンクを送信します。よろしいですか？`)) return;
    setSending(true);
    const res = await fetch("/api/admin/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ festivalId }),
    });
    const data = await res.json();
    if (res.ok) {
      toast.success(`${data.sent}人に送信しました`);
      if (data.errors?.length > 0) {
        toast.warning(`${data.errors.length}件のエラーがあります`);
      }
      await loadRecords();
    } else {
      toast.error("送信に失敗しました");
    }
    setSending(false);
  }

  async function handleResend(nickname: string) {
    if (!festivalId) return;
    if (!confirm(`${nickname} に再送します。よろしいですか？`)) return;
    const res = await fetch("/api/admin/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ festivalId, nickname }),
    });
    if (res.ok) {
      toast.success(`${nickname} に送信しました`);
      await loadRecords();
    } else {
      toast.error("送信に失敗しました");
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">祭りを選択</label>
        <Select value={festivalId ?? ""} onValueChange={onSelectFestival}>
          <SelectTrigger>
            <SelectValue placeholder="祭りを選択してください">
              {festivalId
                ? (festivals.find((f) => f.id === festivalId)?.festivalName ?? festivalId)
                : null}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {festivals.map((f) => (
              <SelectItem key={f.id} value={f.id}>{f.festivalName}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {festivalId && (
        <>
          <GroupStatus festivalId={festivalId} groupType="participation" label="参加グループ" />
          <GroupStatus festivalId={festivalId} groupType="pending" label="保留グループ" />

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm text-gray-700">招待リンク送信（送信漏れ対応）</CardTitle>
                <div className="flex gap-2">
                  <Button onClick={handleSendAll} disabled={sending || loading} size="sm">
                    {sending ? "送信中..." : "未送信に一括送信"}
                  </Button>
                  <Button variant="outline" onClick={loadRecords} disabled={loading} size="sm">
                    更新
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <p className="text-sm text-gray-500 p-4">読み込み中...</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>あだ名</TableHead>
                      <TableHead>回答</TableHead>
                      <TableHead>送信状況</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.map((r) => (
                      <TableRow key={r.nickname}>
                        <TableCell className="font-medium">{r.nickname}</TableCell>
                        <TableCell className="text-sm text-gray-600">{r.status}</TableCell>
                        <TableCell>{inviteTypeBadge(r.inviteType, r.sent)}</TableCell>
                        <TableCell>
                          {r.inviteType && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleResend(r.nickname)}
                            >
                              {r.sent ? "再送" : "送信"}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
