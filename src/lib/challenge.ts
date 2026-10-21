"use client";
import { getSupabase } from "@/lib/supabase/client";

/** Creates a challenge room (before anyone starts) and returns its id. */
export async function createChallenge(opts: {
  title: string;
  mode: "practice" | "exam";
  questionIds?: string[];
  testId?: string;
}): Promise<string> {
  const supabase = getSupabase();
  const { data, error } = await supabase.from("challenges").insert({
    title: opts.title.slice(0, 200),
    mode: opts.testId ? "exam" : opts.mode,
    question_ids: opts.testId ? [] : opts.questionIds ?? [],
    test_id: opts.testId ?? null,
  }).select("id").single();

  if (error) throw error;
  return data.id as string;
}

/** Returns the URL for a challenge room. */
export const roomUrl = (id: string) => {
  if (typeof window === "undefined") return `/c/${id}`;
  return `${window.location.origin}/c/${id}`;
};

/** Returns share text for a challenge room. */
export function roomShareText(title: string, total: number | null, hi: boolean): string {
  return hi
    ? `मैंने आपको GS Hub पर क्विज़ चैलेंज दिया है: "${title}"${total ? ` (${total} प्रश्न)` : ""}। देखते हैं कौन ज़्यादा अंक लाता है!`
    : `I challenge you to a quiz on GS Hub: "${title}"${total ? ` (${total} questions)` : ""}. Let's see who scores more!`;
}