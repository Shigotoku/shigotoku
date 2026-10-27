'use client';

import { Modal } from '@/components/Modal';
import { useStudio } from '@/lib/studio-context';
import { fetchGoogleDriveStatus } from '@/lib/api-client';
import { useEffect, useState } from 'react';

export function StudioModals() {
  const {
    openModal,
    setOpenModal,
    createProject,
    bootstrap,
    touchAction,
  } = useStudio();
  const [newName, setNewName] = useState('');
  const [driveStatus, setDriveStatus] = useState<{ connected: boolean; message: string } | null>(
    null,
  );

  useEffect(() => {
    if (openModal !== 'settings') return;
    void fetchGoogleDriveStatus().then(setDriveStatus);
  }, [openModal]);

  return (
    <>
      <Modal
        open={openModal === 'newProject'}
        title="新しい資料"
        testId="modal-new-project"
        onClose={() => setOpenModal(null)}
        footer={
          <>
            <button
              type="button"
              className="rounded border px-3 py-1.5 text-sm"
              onClick={() => setOpenModal(null)}
            >
              キャンセル
            </button>
            <button
              type="button"
              data-testid="confirm-new-project"
              className="rounded bg-[var(--accent)] px-3 py-1.5 text-sm font-semibold text-white"
              onClick={() => void createProject(newName)}
            >
              作成
            </button>
          </>
        }
      >
        <label className="text-xs text-[var(--muted)]">プロジェクト名</label>
        <input
          data-testid="new-project-name"
          className="mt-1 w-full rounded border border-[var(--line)] px-2 py-2"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="例：〇〇病院向け提案"
        />
      </Modal>

      <Modal
        open={openModal === 'guide'}
        title="使い方ガイド"
        testId="modal-guide"
        onClose={() => setOpenModal(null)}
      >
        <ol className="list-decimal space-y-2 pl-4 text-sm">
          <li>左の「＋ 新しい資料」でプロジェクトを作成</li>
          <li>元資料を追加し、スタイルを選ぶ</li>
          <li>「構成を作る」→ 内容を確認</li>
          <li>「スライドを生成」→ プレビューで確認</li>
          <li>Google Slides で仕上げ、良ければお手本に追加</li>
        </ol>
      </Modal>

      <Modal
        open={openModal === 'settings'}
        title="設定"
        testId="modal-settings"
        onClose={() => setOpenModal(null)}
      >
        <p className="text-sm text-[var(--muted)]" data-testid="drive-status-text">
          {driveStatus?.message ?? 'Drive 接続状態を読み込み中…'}
        </p>
        <button
          type="button"
          data-testid="connect-drive-btn"
          className="mt-3 rounded border border-[var(--line)] px-3 py-2 text-sm text-[var(--accent)]"
          onClick={() => touchAction('Drive 接続は OAuth 実装後に有効になります')}
        >
          Google Drive を接続
        </button>
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <div>
            <label className="text-xs text-[var(--muted)]">文章量</label>
            <select className="w-full rounded border px-2 py-1.5">
              <option>標準</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-[var(--muted)]">文体</label>
            <select className="w-full rounded border px-2 py-1.5">
              <option>事実中心</option>
            </select>
          </div>
        </div>
      </Modal>

      <Modal
        open={openModal === 'styles'}
        title="スタイルを管理"
        testId="modal-styles"
        onClose={() => setOpenModal(null)}
      >
        <ul className="space-y-2 text-sm">
          {bootstrap?.styles.map((s) => (
            <li key={s.id} className="rounded border border-[var(--line)] px-2 py-2">
              <div className="font-medium">{s.name}</div>
              <div className="text-xs text-[var(--muted)]">{s.description}</div>
            </li>
          ))}
        </ul>
      </Modal>

      <Modal
        open={openModal === 'references'}
        title="共通お手本"
        testId="modal-references"
        onClose={() => setOpenModal(null)}
      >
        <ul className="space-y-2 text-sm">
          {bootstrap?.references.map((r) => (
            <li key={r.id} className="rounded border border-[var(--line)] px-2 py-2">
              <div className="font-medium">{r.name}</div>
              <div className="text-xs text-[var(--muted)]">{r.reason}</div>
            </li>
          ))}
        </ul>
      </Modal>

      <Modal
        open={openModal === 'json'}
        title="構成 JSON（上級者向け）"
        testId="modal-json"
        onClose={() => setOpenModal(null)}
        footer={
          <button
            type="button"
            className="rounded bg-[var(--accent)] px-3 py-1.5 text-sm text-white"
            onClick={() => {
              touchAction('JSON から生成（モック）');
              setOpenModal(null);
            }}
          >
            閉じる
          </button>
        }
      >
        <textarea
          className="h-40 w-full rounded border font-mono text-xs"
          placeholder='{"title":"提案資料","slides":[...]}'
        />
      </Modal>
    </>
  );
}
