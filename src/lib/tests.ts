"use client";
import { getSupabase } from "@/lib/supabase/client";
import { newId, saveSession } from "@/lib/quiz-store";
import type { QuizSession } from "@/lib/types";
export * from "@/lib/test-meta";

/** Starts a test attempt. Questions, marking and time come from the test (set by the database). */
export async function startTest(testId: string): Promise<string> {
  const id = newId();
  const { data, error } = await getSupabase()
    .from("quiz_attempts")
    .insert({ id, mode: "exam", source: "all", question_ids: [], title: "Test", config: { test_id: testId } })
    .select("title, question_ids, positive_marks, negative_marks, time_limit_sec, started_at")
    .single();
  if (error) throw error;
  const session: QuizSession = {
    id, title: data.title ?? "Test", mode: "exam", source: "all",
    questionIds: data.question_ids as string[], responses: {}, currentIndex: 0,
    positiveMarks: Number(data.positive_marks), negativeMarks: Number(data.negative_marks), timeLimitSec: data.time_limit_sec,
    elapsedSec: 0, startedAt: data.started_at ?? new Date().toISOString(), synced: true, status: "in_progress",
  };
  saveSession(session);
  return id;
}
