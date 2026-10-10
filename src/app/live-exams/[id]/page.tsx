"use client";
import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { fetchApi } from "@/lib/api-client";
import { useAuth } from "@clerk/nextjs";
import { Spinner } from "@/components/ui";
import { QuestionBody } from "@/components/QuestionBody";

export default function LiveExamPlayer() {
  const { id } = useParams() as { id: string };
  const { getToken } = useAuth();
  const router = useRouter();
  
  const [data, setData] = useState<{ exam: any; questions: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const scoreRef = useRef(0);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        const res = await fetchApi(`/live-exams/${id}/start`, {}, token);
        setData(res);
        
        // Setup timer
        const end = new Date(res.exam.end_time).getTime();
        const updateTimer = () => {
          const now = Date.now();
          const rem = Math.max(0, Math.floor((end - now) / 1000));
          setTimeLeft(rem);
          
          if (rem <= 0) {
            clearInterval(timerRef.current);
            autoSubmit(scoreRef.current);
          }
        };
        
        updateTimer();
        timerRef.current = setInterval(updateTimer, 1000);
      } catch (err: any) {
        setErrorMsg(err.message || "Failed to start exam");
      } finally {
        setLoading(false);
      }
    })();
    return () => clearInterval(timerRef.current);
  }, [id, getToken]);

  const autoSubmit = async (finalScore: number) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const token = await getToken();
      await fetchApi(`/live-exams/${id}/submit`, {
        method: "POST",
        body: JSON.stringify({ score: finalScore })
      }, token);
      alert("Exam time is up! Auto-submitted.");
      router.push("/live-exams");
    } catch (err) {
      console.error(err);
    }
  };

  const manualSubmit = async (finalScore: number) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const token = await getToken();
      await fetchApi(`/live-exams/${id}/submit`, {
        method: "POST",
        body: JSON.stringify({ score: finalScore })
      }, token);
      router.push("/live-exams");
    } catch (err) {
      console.error(err);
      setSubmitting(false);
    }
  };

  if (loading) return <Spinner label="Preparing Live Exam..." />;
  if (errorMsg) return <div className="container-page py-16 text-center text-red-500 font-bold">{errorMsg}</div>;
  if (!data) return null;

  const { exam, questions } = data;
  const currentQ = questions[currentIndex];

  const handleSelect = (option: string) => {
    const isCorrect = currentQ.correct_option === option;
    const newScore = isCorrect ? score + 1 : score;
    if (isCorrect) {
      setScore(newScore);
      scoreRef.current = newScore;
    }

    if (currentIndex + 1 < questions.length) {
      setCurrentIndex(i => i + 1);
    } else {
      manualSubmit(newScore);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <main className="container-page py-8 max-w-3xl">
      <div className="mb-6 flex justify-between items-center bg-stone-900 text-white p-4 rounded-xl shadow-lg sticky top-4 z-10">
        <div className="font-bold">{exam.title}</div>
        <div className="flex gap-6 items-center">
          <div className="font-mono text-xl text-red-400 font-bold flex items-center gap-2">
            <span className="animate-pulse">⏳</span>
            {timeLeft !== null ? formatTime(timeLeft) : "--:--"}
          </div>
          <div className="text-stone-400 text-sm">{currentIndex + 1} / {questions.length}</div>
        </div>
      </div>

      <div className="card p-6 min-h-[400px]">
        {submitting ? (
          <Spinner label="Submitting Exam..." />
        ) : (
          <QuestionBody 
            q={currentQ} 
            selected={null} 
            reveal={false} 
            onSelect={handleSelect} 
          />
        )}
      </div>
    </main>
  );
}
