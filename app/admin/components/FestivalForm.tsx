"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface FestivalFormProps {
  initial?: {
    id?: string;
    festivalName?: string;
    spreadsheetId?: string;
    participationGroupLink?: string;
    pendingGroupLink?: string;
    deadline?: string;
    driveFolderUrl?: string;
    createdAt?: string;
    participationGroupId?: string;
    pendingGroupId?: string;
  };
  onSaved: () => void;
  onCancel: () => void;
}

export default function FestivalForm({ initial, onSaved, onCancel }: FestivalFormProps) {
  const [festivalName, setFestivalName] = useState(initial?.festivalName ?? "");
  const [spreadsheetId, setSpreadsheetId] = useState(initial?.spreadsheetId ?? "");
  const [participationGroupLink, setParticipationGroupLink] = useState(initial?.participationGroupLink ?? "");
  const [pendingGroupLink, setPendingGroupLink] = useState(initial?.pendingGroupLink ?? "");
  const [deadlineDate, setDeadlineDate] = useState(initial?.deadline?.slice(0, 10) ?? "");
  const [deadlineTime, setDeadlineTime] = useState(
    (initial?.deadline?.length ?? 0) > 10 ? initial!.deadline!.slice(11, 16) : ""
  );
  const [driveFolderUrl, setDriveFolderUrl] = useState(initial?.driveFolderUrl ?? "");
  const [participationGroupId, setParticipationGroupId] = useState(initial?.participationGroupId ?? "");
  const [pendingGroupId, setPendingGroupId] = useState(initial?.pendingGroupId ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const payload = {
      ...(initial?.id ? { id: initial.id, createdAt: initial.createdAt } : {}),
      festivalName,
      spreadsheetId,
      participationGroupLink,
      pendingGroupLink,
      deadline: `${deadlineDate} ${deadlineTime}`,
      driveFolderUrl,
      participationGroupId,
      pendingGroupId,
    };

    const res = await fetch("/api/admin/festivals", {
      method: initial?.id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      toast.success(initial?.id ? "更新しました" : "追加しました");
      onSaved();
    } else {
      const data = await res.json();
      toast.error(data.error ?? "保存に失敗しました");
    }
    setSaving(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{initial?.id ? "祭り設定を編集" : "新しい祭りを追加"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="festivalName">祭り名 *</Label>
            <Input id="festivalName" value={festivalName} onChange={e => setFestivalName(e.target.value)} placeholder="例：○○祭り" required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="spreadsheetId">祭りのGoogleスプレッドシートID *</Label>
            <Input id="spreadsheetId" value={spreadsheetId} onChange={e => setSpreadsheetId(e.target.value)} placeholder="スプシURLの/d/【ここ】/edit の部分だけコピペ" required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="participationGroupLink">参加グループ招待リンク *</Label>
            <Input id="participationGroupLink" value={participationGroupLink} onChange={e => setParticipationGroupLink(e.target.value)} placeholder="https://line.me/R/ti/g/..." required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="pendingGroupLink">保留グループ招待リンク *</Label>
            <Input id="pendingGroupLink" value={pendingGroupLink} onChange={e => setPendingGroupLink(e.target.value)} placeholder="https://line.me/R/ti/g/..." required />
          </div>
          <div className="space-y-1">
            <Label>回答期日 *（日本時間）</Label>
            <div className="flex gap-2">
              <Input type="date" value={deadlineDate} onChange={e => setDeadlineDate(e.target.value)} required className="flex-1" />
              <Input type="time" value={deadlineTime} onChange={e => setDeadlineTime(e.target.value)} required className="w-32" placeholder="21:00" />
            </div>
            <p className="text-xs text-gray-500">例：2026/03/28 ＋ 21:00</p>
          </div>
          <div className="space-y-1">
            <Label htmlFor="driveFolderUrl">ドライブフォルダURL（任意）</Label>
            <Input id="driveFolderUrl" value={driveFolderUrl} onChange={e => setDriveFolderUrl(e.target.value)} placeholder="https://drive.google.com/..." />
          </div>
          <div className="space-y-1">
            <Label htmlFor="participationGroupId">参加グループID（任意）</Label>
            <Input id="participationGroupId" value={participationGroupId} onChange={e => setParticipationGroupId(e.target.value)} placeholder="監視ボット追加後にLINEで届きます（例: C4af4980629...）" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="pendingGroupId">保留グループID（任意）</Label>
            <Input id="pendingGroupId" value={pendingGroupId} onChange={e => setPendingGroupId(e.target.value)} placeholder="監視ボット追加後にLINEで届きます（例: C4af4980629...）" />
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={saving}>{saving ? "保存中..." : "保存"}</Button>
            <Button type="button" variant="outline" onClick={onCancel}>キャンセル</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
