export type Lang = "en" | "hi";
export type OptionKey = "A" | "B" | "C" | "D" | "E";
export type Difficulty = "easy" | "medium" | "hard";
export type QuizMode = "practice" | "exam";
export type QuizSource = "all" | "bookmarks" | "mistakes";

export interface QuestionOption {
  key: OptionKey;
  en: string;
  hi: string;
}

export interface Question {
  id: string;
  exam_id: number | null;
  year: number | null;
  subject_id: number;
  topic_id: number | null;
  difficulty: Difficulty;
  question_en: string;
  question_hi: string | null;
  options: QuestionOption[];
  correct_option: OptionKey;
  solution_en: string | null;
  solution_hi: string | null;
  is_dropped: boolean;
  is_high_priority: boolean;
  theme: string | null;
  source: string;
  high_priority?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Subject {
  id: number;
  slug: string;
  name_en: string;
  name_hi: string;
  icon: string | null;
  sort_order: number;
}

export interface Topic {
  id: number;
  subject_id: number;
  slug: string;
  name_en: string;
  name_hi: string;
  sort_order: number;
}

export interface Exam {
  id: number;
  short_name: string;
  name_en: string;
  name_hi: string | null;
  year: number | null;
  category: "pyq" | "current_affairs" | "test_series" | "other";
  sort_order: number;
  is_active: boolean;
}

export interface AppSettings {
  positive_marks: number;
  negative_marks: number;
  seconds_per_question: number;
  min_stats_attempts: number;
}

export interface ResponseEntry {
  selected?: OptionKey | null;
  review?: boolean;
  /** practice mode: answer locked & revealed */
  locked?: boolean;
  /** practice mode: notebook effect returned by the server */
  effect?: "added" | "missed_again" | "cleared" | null;
}

export type Responses = Record<string, ResponseEntry>;

export interface QuizSession {
  id: string;
  title: string;
  mode: QuizMode;
  source: QuizSource;
  questionIds: string[];
  responses: Responses;
  currentIndex: number;
  positiveMarks: number;
  negativeMarks: number;
  timeLimitSec: number | null;
  /** seconds spent so far (accumulated across resumes) */
  elapsedSec: number;
  startedAt: string;
  /** true when the attempt row exists in Supabase (logged-in user) */
  synced: boolean;
  status: "in_progress" | "submitted";
  submittedAt?: string;
}

export interface QuestionStat {
  question_id: string;
  attempts: number;
  correct: number;
  option_counts: Record<string, number> | null;
}

export interface Attempt {
  id: string;
  title: string | null;
  mode: QuizMode;
  source: QuizSource;
  question_ids: string[];
  responses: Responses;
  current_index: number;
  positive_marks: number;
  negative_marks: number;
  time_limit_sec: number | null;
  status: "in_progress" | "submitted";
  started_at: string;
  updated_at: string;
  submitted_at: string | null;
  time_taken_sec: number | null;
  score: number | null;
  correct_count: number | null;
  wrong_count: number | null;
  skipped_count: number | null;
  total_count: number | null;
  config: Record<string, unknown>;
}
