"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useApp } from "@/components/providers";
import { getSupabase } from "@/lib/supabase/client";
import { formatDuration } from "@/lib/scoring";
import { roomShareText, roomUrl } from "@/lib/challenge";
import { IconWhatsApp } from "@/components/icons";

interface Row {
  user_key: string;
  display_name: string;
  status: string;
  score: number | null;
  max_score: number | null;
  correct: number | null;
  wrong: number | null;
  time_taken_sec: number | null;
  is_creator: boolean;
  is_me: boolean;
  attempt_id: string | null;
}

/** Live scoreboard for a challenge room (refreshes every 10 s). */
export function RoomScoreboard({ roomId }: { roomId: string }) {
  const { lang } = useApp();
  const hi = lang === "hi";
  const [rows, setRows] = useState<Row[] | null>(null);
  const load = useCallback(() => {
    getSupabase().rpc("challenge_room_scoreboard", { p_id: roomId }).then(({ data, error }) => {
      if (error) {
        console.error("Failed to load scoreboard:", error);
        setRows([]); // Set to empty array instead of null to avoid infinite loading state
      } else {
        setRows((data as Row[]) ?? []);
      }
    });
  }, [roomId]);

  useEffect(() => {
    load();
    const timer = setInterval(load, 10000);
    return () => clearInterval(timer);
  }, [load]);

  if (rows === null) {
    return <div className="mt-4 h-24 animate-pulse rounded-xl bg-white/60" />;
  }

  if (rows.length === 0) {
    return (
      <p className="mt-4 rounded-xl bg-white p-4 text-center text-sm text-stone-500 ring-1 ring-maroon/10">
        {hi ? "अभी किसी ने शुरू नहीं किया। लिंक भेजें!" : "Nobody has started yet. Share the link!"}
      </p>
    );
  }

  const done = rows.filter((r) => r.status === "submitted");

  return (
    <ol className="mt-4 divide-y divide-maroon/5 overflow-hidden rounded-xl bg-white ring-1 ring-maroon/10">
      {rows.map((r) => {
        const pos = done.indexOf(r);
        return (
          <li
            key={r.user_key}
            className={`flex items-center gap-3 px-4 py-3 text-sm ${r.is_me ? "bg-gold-50" : ""}`}
          >
            <span className="w-8 text-lg font-bold tabular-nums text-maroon">
              {r.status !== "submitted" ? "…" : `#${pos + 1}`}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold text-ink">
                {r.display_name}
                {r.is_me && (
                  <span className="ml-1 text-xs font-normal text-maroon">
                    ({hi ? "आप" : "you"})
                  </span>
                )}
                {r.is_creator && (
                  <span
                    className="ml-1 rounded bg-gold-50 px-1.5 text-[10px] font-semibold uppercase text-gold-700 ring-1 ring-gold/40"
                  >
                    {hi ? "होस्ट" : "Host"}
                  </span>
                )}
              </span>
              <span className="text-xs text-stone-500">
                {r.status === "submitted"
                  ? `${r.correct ?? 0} ✓ · ${r.wrong ?? 0} ✗${r.time_taken_sec ? ` · ${formatDuration(r.time_taken_sec)}` : ""}`
                  : hi
                  ? "क्विज़ दे रहे हैं…"
                  : "playing…"}
              </span>
            </span>
            <span className="text-right">
              {r.status === "submitted" ? (
                <>
                  <b className="font-display text-lg text-maroon">{Number(r.score ?? 0)}</b>
                  <span className="text-xs text-stone-500">
                    / {Number(r.max_score ?? 0)}
                  </span>
                </>
              ) : (
                <span className="text-stone-400">—</span>
              )}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function RoomShare({
  roomId,
  title,
  total,
}: {
  roomId: string;
  title: string;
  total: number | null;
}) {
  const { lang } = useApp();
  const hi = lang === "hi";
  const [copied, setCopied] = useState(false);
  const url = roomUrl(roomId);
  const text = roomShareText(title, total, hi);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "GS Hub Challenge",
          text,
          url,
        });
      } catch {
        // cancelled
      }
    } else {
      copy();
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <a
        href={`https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="btn bg-[#25D366] text-white hover:bg-[#1ebe5b]"
      >
        <IconWhatsApp className="h-4 w-4" /> WhatsApp
      </a>
      <button onClick={share} className="btn-primary">
        {hi ? "शेयर करें" : "Share"}
      </button>
      <button onClick={copy} className="btn-outline">
        {copied
          ? hi
            ? "कॉपी हो गया ✓"
            : "Copied ✓"
          : hi
          ? "लिंक कॉपी करें"
          : "Copy link"}
      </button>
    </div>
  );
}

/** Result-page card for an attempt that was part of a challenge room. */
export function RoomResultCard({
  roomId,
  title,
}: {
  roomId: string;
  title: string;
}) {
  const { lang } = useApp();
  const hi = lang === "hi";
  return (
    <section className="mt-5 rounded-2xl border border-gold bg-gradient-to-br from-gold-50 to-cream p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold text-maroon">
            {hi ? "चैलेंज स्कोरबोर्ड" : "Challenge scoreboard"}
          </h2>
          <p className="text-sm text-stone-600">
            {hi
              ? "सभी दोस्तों के स्कोर — नए दोस्त जुड़ते ही अपडेट होगा।"
              : "Everyone's score — updates as more friends finish."}
          </p>
        </div>
        <RoomShare roomId={roomId} title={title} total={null} />
      </div>
      <RoomScoreboard roomId={roomId} />
      <Link
        href={`/c/${roomId}`}
        className="mt-3 inline-block text-sm font-semibold text-maroon hover:underline"
      >
        {hi ? "चैलेंज पेज खोलें" : "Open challenge page"} →
      </Link>
    </section>
  );
}