"use client";
import { getSupabase } from "@/lib/supabase/client";
import { newId, saveSession } from "@/lib/quiz-store";
import type { AppSettings, AppUser, QuizMode, QuizSession, QuizSource } from "@/lib/types";


export interface BuildParams {
  subjectIds?: number[];
  topicIds?: number[];
  examIds?: number[];
  count: number;
  source: QuizSource;
  highPriorityOnly?: boolean;
}

export async function fetchQuizIds(p: BuildParams): Promise<string[]> {
  const { data, error } = await getSupabase().rpc("build_quiz", {
    p_subject_ids: p.subjectIds?.length ? p.subjectIds : null,
    p_topic_ids: p.topicIds?.length ? p.topicIds : null,
    p_exam_ids: p.examIds?.length ? p.examIds : null,
    p_count: p.count,
    p_source: p.source,
    p_high_priority_only: !!p.highPriorityOnly,
  });
  if (error) throw error;
  return (data as string[]) ?? [];
}

/** Creates a quiz session (DB row for logged-in users, localStorage always) and returns its id. */
export async function startQuiz(opts: {
  questionIds: string[];
  mode: QuizMode;
  source: QuizSource;
  title: string;
  config: Record<string, unknown>;
  user: AppUser | null;
  settings: AppSettings;
}): Promise<string> {
  const id = newId();
  let positive = opts.settings.positive_marks;
  let negative = opts.settings.negative_marks;
  let timeLimit = opts.mode === "exam" ? opts.questionIds.length * opts.settings.seconds_per_question : null;
  let synced = false;

  if (opts.user) {
    const { data, error } = await getSupabase()
      .from("quiz_attempts")
      .insert({ id, mode: opts.mode, source: opts.source, question_ids: opts.questionIds, title: opts.title, config: opts.config })
      .select("positive_marks, negative_marks, time_limit_sec")
      .single();
    if (error) throw error;
    positive = Number(data.positive_marks);
    negative = Number(data.negative_marks);
    timeLimit = data.time_limit_sec;
    synced = true;
  }

  const session: QuizSession = {
    id, title: opts.title, mode: opts.mode, source: opts.source,
    questionIds: opts.questionIds, responses: {}, currentIndex: 0,
    positiveMarks: positive, negativeMarks: negative, timeLimitSec: timeLimit,
    elapsedSec: 0, startedAt: new Date().toISOString(), synced, status: "in_progress",
  };
  saveSession(session);
  return id;
}
