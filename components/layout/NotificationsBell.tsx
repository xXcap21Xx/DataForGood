"use client";

import { startTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  message: string;
  campaignId: string | null;
  readAt: string | null;
  createdAt: string;
};

export default function NotificationsBell() {
  const router = useRouter();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/notificaciones", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => {
        if (!active || !payload) return;
        startTransition(() => {
          setItems(Array.isArray(payload.data) ? payload.data : []);
        });
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, []);

  async function load() {
    const response = await fetch("/api/notificaciones", { cache: "no-store" });
    if (!response.ok) return;
    const payload = await response.json();
    startTransition(() => {
      setItems(Array.isArray(payload.data) ? payload.data : []);
    });
  }

  async function acceptInvitation(item: NotificationItem) {
    setLoadingId(item.id);
    const response = await fetch(`/api/notificaciones/${item.id}/aceptar`, { method: "POST" });
    if (response.ok) {
      setItems((current) => current.filter((notification) => notification.id !== item.id));
      router.refresh();
    }
    setLoadingId(null);
  }

  const unreadCount = items.filter((item) => !item.readAt).length;

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Notificaciones"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-ink-2 hover:bg-sunken"
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-20 w-80 max-w-[calc(100vw-2rem)] rounded-lg border border-line bg-surface p-3 shadow-lg">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-bold text-ink">Notificaciones</p>
            <button type="button" onClick={() => void load()} className="text-[11px] font-bold text-accent">Actualizar</button>
          </div>
          {items.length === 0 ? (
            <p className="py-4 text-[12.5px] text-ink-2">No tienes notificaciones nuevas.</p>
          ) : (
            <div className="max-h-80 space-y-2 overflow-y-auto">
              {items.map((item) => (
                <div key={item.id} className="rounded border border-line bg-sunken p-3">
                  <p className="text-[12.5px] font-bold text-ink">{item.title}</p>
                  <p className="mt-1 text-[12px] leading-5 text-ink-2">{item.message}</p>
                  {item.type === "invitacion_revisor" && item.campaignId && (
                    <button
                      type="button"
                      onClick={() => void acceptInvitation(item)}
                      disabled={loadingId === item.id}
                      className="mt-2 rounded-pill bg-accent px-3 py-1.5 text-[11.5px] font-bold text-white disabled:opacity-60"
                    >
                      {loadingId === item.id ? "Aceptando…" : "Aceptar invitación"}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function BellIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}
