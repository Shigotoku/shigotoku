import { Link, Outlet } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { landingPath } from "../lib/urls";

export default function PublicLayout() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-50 border-b border-slate-200/60 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6">
          <Link to="/login" className="flex items-center gap-2.5 transition-opacity hover:opacity-80">
            <img src="/icon.png" alt="ランウィズ" className="h-8 w-8 object-contain" />
            <span className="text-base font-bold tracking-tight text-slate-900">
              ランウィズ
            </span>
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            <a href={landingPath("/#features")} className="text-sm font-medium text-slate-500 transition-colors hover:text-slate-900">
              機能
            </a>
            <a href={landingPath("/pricing")} className="text-sm font-medium text-slate-500 transition-colors hover:text-slate-900">
              料金
            </a>
            <Link to="/login" className="text-sm font-medium text-slate-500 transition-colors hover:text-slate-900">
              ログイン
            </Link>
            <Link
              to="/login"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-slate-700"
            >
              無料で始める
            </Link>
          </nav>

          <button onClick={() => setMenuOpen(!menuOpen)} className="rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100 md:hidden">
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {menuOpen && (
          <div className="border-t border-slate-100 bg-white px-4 pb-4 pt-2 md:hidden">
            <a href={landingPath("/pricing")} onClick={() => setMenuOpen(false)} className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">
              料金プラン
            </a>
            <Link to="/login" onClick={() => setMenuOpen(false)} className="mt-2 block rounded-xl bg-primary-600 px-4 py-2.5 text-center text-sm font-semibold text-white">
              ログイン
            </Link>
          </div>
        )}
      </header>

      <main>
        <Outlet />
      </main>

      <footer className="border-t border-slate-200/60 bg-white/50 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">プロダクト</h3>
              <ul className="mt-3 space-y-2">
                <li><a href={landingPath("/pricing")} className="text-sm text-slate-500 hover:text-slate-700">料金プラン</a></li>
                <li><span className="text-sm text-slate-500">会社設立ナビ</span></li>
                <li><span className="text-sm text-slate-500">補助金マッチング</span></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">サポート</h3>
              <ul className="mt-3 space-y-2">
                <li><span className="text-sm text-slate-500">ヘルプセンター</span></li>
                <li><span className="text-sm text-slate-500">お問い合わせ</span></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">法務</h3>
              <ul className="mt-3 space-y-2">
                <li><span className="text-sm text-slate-500">利用規約</span></li>
                <li><span className="text-sm text-slate-500">プライバシーポリシー</span></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">会社情報</h3>
              <ul className="mt-3 space-y-2">
                <li><span className="text-sm text-slate-500">運営会社</span></li>
                <li><span className="text-sm text-slate-500">ブログ</span></li>
              </ul>
            </div>
          </div>
          <div className="mt-10 border-t border-slate-200/60 pt-6 text-center">
            <p className="text-sm text-slate-400">
              &copy; 2026 ランウィズ (Runwith). All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
