'use client';

import { useAuth } from '@/lib/auth-context';
import { useStudio } from '@/lib/studio-context';
import type { StyleKind } from '@deckit/domain';
import { useRouter } from 'next/navigation';

function styleIcon(kind: StyleKind) {
  if (kind === 'company') return '◆';
  if (kind === 'usecase') return '▹';
  return '●';
}

export function Sidebar() {
  const {
    projects,
    styles,
    activeProjectId,
    activeStyleId,
    bootstrap,
    setActiveProjectId,
    setActiveStyleId,
    setOpenModal,
    touchAction,
  } = useStudio();
  const { user, mockMode, signOutUser } = useAuth();
  const router = useRouter();

  const driveConnected = bootstrap?.capabilities.driveFileAccess ?? false;
  const orgName = bootstrap?.organization.name ?? 'ワークスペース';

  const handleLogout = async () => {
    await signOutUser();
    router.replace('/login');
  };

  return (
    <aside
      data-testid="sidebar"
      className="flex h-full flex-col bg-[var(--side)] text-[#e8edf0]"
      style={{ width: 'var(--sidebar-w)' }}
    >
      <div className="border-b border-[var(--side-2)] px-3 py-3">
        <div className="rounded-lg bg-[var(--accent)] px-3 py-2.5 text-sm font-semibold text-white shadow-sm">
          <div className="text-[10px] font-normal uppercase tracking-wide opacity-90">DeckIt</div>
          <div>資料づくり</div>
        </div>
        <p className="mt-2 truncate px-1 text-[11px] text-[#8a97a3]" title={orgName}>
          {orgName}
        </p>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-2 py-3">
        <button
          type="button"
          data-testid="new-project-btn"
          className="w-full rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-2)]"
          onClick={() => {
            touchAction('新しい資料モーダルを開きました');
            setOpenModal('newProject');
          }}
        >
          ＋ 新しい資料
        </button>

        <section>
          <div className="px-2 pb-1 text-[11px] text-[#8a97a3]">ワークスペース</div>
          <div className="rounded-md bg-[var(--side-2)] px-2 py-2 text-xs text-[#b8c4cc]">
            {driveConnected ? 'Drive 接続済み' : 'Drive 未接続（モック）'}
          </div>
        </section>

        <section>
          <div className="px-2 pb-1 text-[11px] text-[#8a97a3]">スタイル</div>
          <div className="space-y-0.5">
            {styles.map((s) => (
              <button
                key={s.id}
                type="button"
                data-testid={`style-item-${s.id}`}
                className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-[#252c34] ${
                  activeStyleId === s.id ? 'bg-[#252c34] ring-1 ring-[var(--accent)]' : ''
                }`}
                onClick={() => {
                  setActiveStyleId(s.id);
                  touchAction(`スタイル「${s.name}」を選択`);
                }}
              >
                <span className="text-[10px]">{styleIcon(s.kind)}</span>
                <span className="truncate">{s.name}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            className="mt-1 w-full rounded px-2 py-1 text-left text-xs text-[#9fb0bc] hover:bg-[#252c34]"
            onClick={() => setOpenModal('styles')}
          >
            ＋ 新しいスタイル
          </button>
        </section>

        <section>
          <div className="px-2 pb-1 text-[11px] text-[#8a97a3]">プロジェクト</div>
          <div className="space-y-0.5">
            {projects.map((p) => (
              <button
                key={p.id}
                type="button"
                data-testid={`project-item-${p.id}`}
                className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-[#252c34] ${
                  activeProjectId === p.id ? 'bg-[#252c34] ring-1 ring-[var(--accent)]' : ''
                }`}
                onClick={() => {
                  setActiveProjectId(p.id);
                  touchAction(`プロジェクト「${p.name}」を選択`);
                }}
              >
                <span className="text-[10px]">▸</span>
                <span className="truncate">{p.name}</span>
              </button>
            ))}
          </div>
        </section>
      </div>

      <div className="mt-auto shrink-0 border-t border-[var(--side-2)] bg-[#0c0f12] p-3">
        <button
          type="button"
          data-testid="guide-btn"
          className="mb-3 flex w-full items-center justify-center gap-2 rounded-lg border border-[#2a333c] bg-[var(--side-2)] px-3 py-2.5 text-sm font-medium hover:bg-[#252c34]"
          onClick={() => setOpenModal('guide')}
        >
          <span className="text-base leading-none">?</span>
          使い方ガイド
        </button>

        <div className="mb-2 text-[10px] font-medium uppercase tracking-wide text-[#6d7a85]">
          資料まわり
        </div>
        <div className="mb-3 grid grid-cols-2 gap-1.5">
          <button
            type="button"
            data-testid="styles-manage-btn"
            className="rounded-md bg-[var(--side-2)] px-2 py-2 text-left text-[11px] hover:bg-[#252c34]"
            onClick={() => setOpenModal('styles')}
          >
            スタイル管理
          </button>
          <button
            type="button"
            data-testid="references-btn"
            className="rounded-md bg-[var(--side-2)] px-2 py-2 text-left text-[11px] hover:bg-[#252c34]"
            onClick={() => setOpenModal('references')}
          >
            共通お手本
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            data-testid="settings-btn"
            className="rounded-md border border-[#2a333c] px-2 py-2 text-center text-xs hover:bg-[#252c34]"
            onClick={() => setOpenModal('settings')}
          >
            設定
          </button>
          {!mockMode && user ? (
            <button
              type="button"
              data-testid="logout-btn"
              className="rounded-md border border-[#2a333c] px-2 py-2 text-center text-xs text-[#c8d4dc] hover:bg-[#252c34]"
              onClick={() => void handleLogout()}
            >
              ログアウト
            </button>
          ) : (
            <div className="rounded-md border border-transparent px-2 py-2 text-center text-xs text-[#6d7a85]">
              デモ
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
