async function getAppBase() {
  const stored = await chrome.storage.sync.get("shapeitAppBase");
  if (stored.shapeitAppBase) return String(stored.shapeitAppBase).replace(/\/$/, "");
  return "https://app.shapeit.shigotoku.com";
}

document.getElementById("openLogin")?.addEventListener("click", async () => {
  const base = await getAppBase();
  await chrome.tabs.create({ url: `${base}/login?ext=1` });
});

document.getElementById("done")?.addEventListener("click", async () => {
  const slack = document.getElementById("slackWebhook");
  const url = slack?.value?.trim();
  if (url) await chrome.storage.sync.set({ shapeitSlackWebhook: url });
  await chrome.storage.local.set({ shapeitOnboardingDone: true });
  window.close();
});

document.getElementById("hideFab")?.addEventListener("click", async () => {
  await chrome.storage.sync.set({ shapeitFabHidden: true });
  alert("フローティングボタンを非表示にしました。再表示は拡張のオプションから行えます。");
});

chrome.storage.sync.get("shapeitSlackWebhook").then((s) => {
  const el = document.getElementById("slackWebhook");
  if (el && s.shapeitSlackWebhook) el.value = s.shapeitSlackWebhook;
});
