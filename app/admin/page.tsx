import { Suspense } from "react";
import AdminClient from "./AdminClient";

export default function AdminPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">読み込み中...</p>
      </div>
    }>
      <AdminClient />
    </Suspense>
  );
}
