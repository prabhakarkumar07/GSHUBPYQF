"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useApp } from "@/components/providers";
import { PlanErrorBox } from "@/components/plan";
import { getSupabase } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { startQuiz } from "@/app/practice/startQuiz";
import { RoomScoreboard, RoomShare } from "@/components/RoomBoard";
import { Spinner } from "@/components/ui";

interface Room {
  id: string;
  title: string;
  mode: "practice" | "exam";
  test_id: string | null;
  question_ids: string[];
  total: number | null;
  duration_min: number | null;
  creator: string;
  is_mine: boolean;
  my_attempt: string | null;
  my_status: string | null;
}

export function ChallengeRoom({ id }: { id: string }) {
  const { lang, user, authReady, taxonomy } = useApp();
  const hi = lang === "hi";
  const router = useRouter();
  const [room, setRoom] = useState<Room | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured || !authReady) return;
    getSupabase()
      .rpc("get_challenge_room", { p_id: id })
      .then(({ data, error }) => {
        if (error) {
          setErr(error.message);
          setRoom(null);
        } else {
          const roomData = data as Room;
          setRoom(roomData);
        }
      });
  }, [id, authReady, user]);

  const start = async () => {
    if (!room) return;
    if (!user) {
      router.push(`/login?next=${encodeURIComponent(`/c/${id}`)}`);
      return;
    }
    if (room.my_attempt) {
      router.push(
        room.my_status === "submitted"
          ? `/result/${room.my_attempt}`
          : `/quiz/${room.my_attempt}`
      );
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const qid = await startQuiz({
        questionIds: room.test_id ? [] : room.question_ids,
        mode: room.mode,
        source: "all",
        title: room.title,
        config: {
          challenge_id: room.id,
          ...(room.test_id ? { test_id: room.test_id } : {}),
        },
        user,
        settings: taxonomy.settings,
      });
      router.push(`/quiz/${qid}`);
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  };

  if (room === undefined) {
    return <Spinner label="Loading..." />;
  }
  if (room === null) {
    return (
      <div className="container-page py-16 text-center">
        <h1 className="h-display text-2xl">
          {hi ? "यह चैलेंज उपलब्ध नहीं है" : "This challenge is not available"}
        </h1>
        <Link href="/practice" className="btn-primary mt-4">
          {hi ? "अभ्यास शुरू करें" : "Start practising"}
        </Link>
      </div>
    );
  }

  const label =
    room.my_status === "submitted"
      ? hi
        ? "मेरा रिज़ल्ट देखें"
        : "View my result"
      : room.my_status === "in_progress"
      ? hi
        ? "जारी रखें →"
        : "Continue →"
      : !user
      ? hi
        ? "लॉग इन करके शुरू करें →"
        : "Log in to start →"
      : room.is_mine
      ? hi
        ? "मेरा क्विज़ शुरू करें →"
        : "Start my attempt →"
      : hi
      ? "चैलेंज स्वीकार करें →"
      : "Accept challenge →";

  return (
    <div className={`container-page max-w-2xl py-10 ${hi ? "font-hindi" : ""}`}>
      <section className="rounded-3xl bg-maroon p-6 text-white sm:p-8">
        <div className="text-xs font-bold uppercase tracking-[.16em] text-gold-300">
          {hi ? "क्विज़ चैलेंज" : "Quiz challenge"}
        </div>
        <h1 className="mt-2 font-display text-2xl font-bold sm:text-3xl">
          {room.is_mine
            ? hi
              ? "आपका चैलेंज तैयार है!"
              : "Your challenge is ready!"
            : hi
            ? <><span className="text-gold-300">{room.creator}</span> ने आपको चैलेंज किया है!</>
            : <><span className="text-gold-300">{room.creator}</span> has challenged you!</>}
        </h1>
        <p className="mt-2 text-white/80">{room.title}</p>
        <div className="mt-5 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-white/10 p-3">
            <div className="font-display text-2xl font-bold">{room.total ?? "—"}</div>
            <div className="text-xs text-white/70">
              {hi ? "प्रश्न" : "Questions"}
            </div>
          </div>
          <div className="rounded-xl bg-white/10 p-3">
            <div className="font-display text-2xl font-bold">
              {room.mode === "exam"
                ? hi
                  ? "परीक्षा"
                  : "Exam"
                : hi
                ? "अभ्यास"
                : "Practice"}
            </div>
            <div className="text-xs text-white/70">{hi ? "मोड" : "Mode"}</div>
          </div>
          <div className="rounded-xl bg-white/10 p-3">
            <div className="font-display text-2xl font-bold">
              {room.duration_min
                ? `${room.duration_min}m`
                : room.mode === "exam" && room.total
                ? `${Math.ceil(
                    (room.total * taxonomy.settings.seconds_per_question) /
                      60
                  )}m`
                : "∞"}
            </div>
            <div className="text-xs text-white/70">{hi ? "समय" : "Time"}</div>
          </div>
        </div>
        <button
          onClick={start}
          disabled={busy}
          className="btn-gold mt-6 w-full py-3.5 text-base"
        >
          {busy
            ? hi
              ? "शुरू हो रहा है…"
              : "Starting…"
            : label}
        </button>
        <PlanErrorBox error={err} />
      </section>

      <section className="mt-6 rounded-2xl border border-gold bg-gold-50/60 p-5">
        <h2 className="font-display text-lg font-bold text-maroon">
          {hi ? "दोस्तों को बुलाएँ" : "Invite friends"}
        </h2>
        <p className="mb-3 text-sm text-stone-600">
          {hi
            ? "जितने चाहें उतने दोस्तों को लिंक भेजें — सबको यही प्रश्न मिलेंगे और नीचे सबका स्कोर दिखेगा।"
            : "Send the link to as many friends as you like — everyone gets the same questions and all scores appear below."}
        </p>
        <RoomShare roomId={room.id} title={room.title} total={room.total} />
      </section>

      <section className="mt-6">
        <h2 className="h-display text-xl">{hi ? "स्कोरबोर्ड" : "Scoreboard"}</h2>
        <RoomScoreboard roomId={room.id} />
      </section>
    </div>
  );
}