import { Link, useLocation } from "react-router-dom";
import { Plus } from "lucide-react";

/** 常設の気づき投稿ボタン（CAP-001） */
export default function CaptureFab() {
  const { pathname } = useLocation();
  if (pathname.startsWith("/capture") || pathname.startsWith("/login")) return null;
  return (
    <Link
      to="/capture"
      className="fixed bottom-5 right-5 z-40 inline-flex min-h-[48px] items-center gap-2 rounded-full bg-mint px-4 py-3 text-sm font-bold text-white shadow-lg shadow-mint/30 hover:bg-mint-bright"
      aria-label="気づきを投稿"
    >
      <Plus className="h-5 w-5" />
      気づき
    </Link>
  );
}
