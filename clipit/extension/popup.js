const status = document.getElementById('status');

function sendBg(message, onReply) {
  chrome.runtime.sendMessage(message, (res) => {
    if (chrome.runtime.lastError) return;
    onReply?.(res);
  });
}

function refreshStatus() {
  sendBg({ type: 'CLIPIT_GET_STATUS' }, (s) => {
    if (s?.recording) {
      status.textContent = `記録中 — ステップ ${s.stepCount ?? 0} 件（同じウィンドウ内のタブも記録対象）`;
    }
  });
}

document.getElementById('start')?.addEventListener('click', () => {
  sendBg({ type: 'CLIPIT_START' }, (r) => {
    status.textContent = r?.ok
      ? '記録中… 同じウィンドウ内なら別タブ・ページ遷移も追従します。'
      : (r?.message ?? '開始できません（chrome:// 等は不可）');
    if (r?.ok) refreshStatus();
  });
});
refreshStatus();

document.getElementById('pause')?.addEventListener('click', () => {
  sendBg({ type: 'CLIPIT_PAUSE' }, (r) => {
    status.textContent = r?.paused ? '一時停止中' : '記録を再開しました';
  });
});

document.getElementById('stop')?.addEventListener('click', () => {
  status.textContent = '取り込み中…';
  sendBg({ type: 'CLIPIT_STOP' }, (r) => {
    status.textContent = r?.message ?? (r?.ok ? '完了' : '失敗');
  });
});
