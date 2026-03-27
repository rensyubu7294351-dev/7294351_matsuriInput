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
  };
  onSaved: () => void;
  onCancel: () => void;
}

export default function FestivalForm({ initial, onSaved, onCancel }: FestivalFormProps) {
  const [festivalName, setFestivalName] = useState(initial?.festivalName ?? "");
  const [spreadsheetId, setSpreadsheetId] = useState(initial?.spreadsheetId ?? "");
  const [participationGroupLink, setParticipationGroupLink] = useState(initial?.participationGroupLink ?? "");
  const [pendingGroupLink, setPendingGroupLink] = useState(initial?.pendingGroupLink ?? "");
  const [deadline, setDeadline] = useState(initial?.deadline ?? "");
  const [driveFolderUrl, setDriveFolderUrl] = useState(initial?.driveFolderUrl ?? "");
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
      deadline,
      driveFolderUrl,
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
            <Input id="festivalName" value={festivalName} onChange={e => setFestivalName(e.target.value)} placeholder="例：2025年夏祭り" required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="spreadsheetId">スプレッドシートID *</Label>
            <Input id="spreadsheetId" value={spreadsheetId} onChange={e => setSpreadsheetId(e.target.value)} placeholder="URLの /d/【ここ】/edit の部分" required />
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
            <Label htmlFor="deadline">回答期日 *</Label>
            <Input id="deadline" type="date" value={deadline} onChange={e => setDeadline(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="driveFolderUrl">ドライブフォルダURL（任意）</Label>
            <Input id="driveFolderUrl" value={driveFolderUrl} onChange={e => setDriveFolderUrl(e.target.value)} placeholder="https://drive.google.com/..." />
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
