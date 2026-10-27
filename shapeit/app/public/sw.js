/* ShapeIt service worker — offline shell + Web Share Target */
const CACHE = "shapeit-shell-v2";
const ASSETS = ["/", "/index.html", "/manifest.webmanifest", "/favicon.svg", "/icon.png", "/capture"];

const DB_NAME = "shapeit-share";
const STORE = "intake";
const KEY = "latest";

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function saveShareIntake(payload) {
  const db = await openDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put({ ...payload, receivedAt: new Date().toISOString() }, KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Android 等: 共有シート → ShapeIt（スクショ投稿）
  if (req.method === "POST" && url.pathname === "/share-target") {
    event.respondWith(
      (async () => {
        try {
          const form = await req.formData();
          const title = String(form.get("title") || "");
          const text = String(form.get("text") || "");
          const sharedUrl = String(form.get("url") || "");
          let imageDataUrl;
          const files = form.getAll("images");
          for (const f of files) {
            if (f && typeof f === "object" && "type" in f && String(f.type).startsWith("image/")) {
              imageDataUrl = await blobToDataUrl(f);
              break;
            }
          }
          await saveShareIntake({ title, text, url: sharedUrl, imageDataUrl });
        } catch (err) {
          console.warn("share-target failed", err);
        }
        return Response.redirect(`${url.origin}/capture?share=1`, 303);
      })(),
    );
    return;
  }

  if (req.method !== "GET") return;

  event.respondWith(
    caches.match(req).then((cached) =>
      cached ||
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          if (res.ok && url.origin === self.location.origin) {
            void caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached || caches.match("/index.html")),
    ),
  );
});
