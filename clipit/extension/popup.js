const status = document.getElementById('status');
document.getElementById('start')?.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'CLIPIT_START' }, (r) => {
    status.textContent = r?.ok ? '記録中… 画面を操作してください' : '開始できません（chrome:// 等は不可）';
  });
});
document.getElementById('pause')?.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'CLIPIT_PAUSE' }, (r) => {
    status.textContent = r?.paused ? '一時停止中' : '記録を再開しました';
  });
});
document.getElementById('stop')?.addEventListener('click', () => {
  status.textContent = '取り込み中…';
  chrome.runtime.sendMessage({ type: 'CLIPIT_STOP' }, (r) => {
    status.textContent = r?.message ?? (r?.ok ? '完了' : '失敗');
  });
});
