"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface MemberStatus {
  nickname: string;
  lineUserId: string;
  joined: boolean;
}

interface GroupStatusResult {
  groupId: string | null;
  members: MemberStatus[];
}

interface GroupStatusProps {
  festivalId: string;
  groupType: "participation" | "pending";
  label: string;
}

export default function GroupStatus({ festivalId, groupType, label }: GroupStatusProps) {
  const [result, setResult] = useState<GroupStatusResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function checkStatus() {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/group-status?festivalId=${festivalId}&groupType=${groupType}`
      );
      const data = await res.json();
      if (res.ok) {
        setResult(data);
      } else {
        toast.error(data.error ?? "参加状況の取得に失敗しました");
      }
    } catch (e) {
      toast.error(`エラー: ${e instanceof Error ? e.message : String(e)}`);
    }
    setLoading(false);
  }

  const joinedMembers = result?.members.filter((m) => m.joined) ?? [];
  const notJoinedMembers = result?.members.filter((m) => !m.joined) ?? [];

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">{label}の参加状況</CardTitle>
          <Button size="sm" variant="outline" onClick={checkStatus} disabled={loading}>
            {loading ? "確認中..." : result ? "再確認" : "参加状況を確認"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!result ? (
          <p className="text-xs text-gray-500">
            「参加状況を確認」ボタンを押すとLINEグループの参加状況をリアルタイムで取得します。
          </p>
        ) : !result.groupId ? (
          <p className="text-xs text-orange-600">
            グループIDが未設定です。監視ボット（七福メンバーID照合用Bot）をこのグループに追加してください。追加するとあなたのLINEにグループIDが届きます。その後、祭り設定を編集してグループIDを入力してください。
          </p>
        ) : (
          <div className="space-y-3">
            <div className="flex gap-4 text-sm">
              <span className="text-green-600 font-medium">グループ入室済み {joinedMembers.length}人</span>
              <span className="text-orange-500 font-medium">グループ未入室 {notJoinedMembers.length}人</span>
            </div>
            {notJoinedMembers.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 mb-1">グループ未入室のメンバー（フォーム回答済み・リンク未使用）</p>
                <div className="flex flex-wrap gap-1">
                  {notJoinedMembers.map((m) => (
                    <span
                      key={m.nickname}
                      className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded"
                    >
                      {m.nickname}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {joinedMembers.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 mb-1">グループ入室済みのメンバー</p>
                <div className="flex flex-wrap gap-1">
                  {joinedMembers.map((m) => (
                    <span
                      key={m.nickname}
                      className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded"
                    >
                      {m.nickname}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
