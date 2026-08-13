import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Bell } from "lucide-react";
import {
  listNotificationsRemote,
  markAllNotificationsReadRemote,
  markNotificationReadRemote,
} from "../lib/cloudStore";
import type { AppNotification } from "../lib/types";

export default function NotificationBell({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  const reload = async () => setItems(await listNotificationsRemote());

  useEffect(() => {
    void reload();
    const onNotif = () => void reload();
    window.addEventListener("shapeit-notifications", onNotif);
    const t = window.setInterval(() => void reload(), 60_000);
    return () => {
      window.removeEventListener("shapeit-notifications", onNotif);
      window.clearInterval(t);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const unread = items.filter((n) => !n.read).length;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className={`relative inline-flex items-center justify-center rounded-md text-ink/60 hover:bg-sand hover:text-ink ${
          compact ? "h-7 w-7" : "h-9 w-9 rounded-lg"
        }`}
        aria-label="通知"
        onClick={() => setOpen((v) => !v)}
      >
        <Bell className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
        {unread > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-mint px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="通知"
          className={`absolute z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-ink/10 bg-white shadow-lg ${
            compact ? "left-0" : "right-0"
          }`}
        >
          <div className="flex items-center justify-between border-b border-ink/5 px-3 py-2">
            <p className="text-xs font-semibold">通知</p>
            <div className="flex gap-2">
              <button
                type="button"
                className="text-[10px] text-ink/45"
                onClick={async () => {
                  await markAllNotificationsReadRemote();
                  await reload();
                }}
              >
                すべて既読
              </button>
              <button type="button" className="text-[10px] text-ink/45" onClick={() => void reload()}>
                更新
              </button>
            </div>
          </div>
          <ul className="max-h-72 overflow-y-auto">
            {items.length === 0 ? (
              <li className="px-3 py-6 text-center text-xs text-ink/45">通知はありません</li>
            ) : (
              items.map((n) => (
                <li key={n.id} className={`border-b border-ink/5 px-3 py-2.5 ${n.read ? "opacity-60" : ""}`}>
                  {n.href ? (
                    <Link
                      to={n.href}
                      className="block text-left"
                      onClick={async () => {
                        await markNotificationReadRemote(n.id);
                        setOpen(false);
                        await reload();
                      }}
                    >
                      <p className="text-xs font-semibold">{n.title}</p>
                      <p className="mt-0.5 text-[11px] text-ink/55">{n.body}</p>
                    </Link>
                  ) : (
                    <button
                      type="button"
                      className="block w-full text-left"
                      onClick={async () => {
                        await markNotificationReadRemote(n.id);
                        await reload();
                      }}
                    >
                      <p className="text-xs font-semibold">{n.title}</p>
                      <p className="mt-0.5 text-[11px] text-ink/55">{n.body}</p>
                    </button>
                  )}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
