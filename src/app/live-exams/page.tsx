"use client";
import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api-client";
import { useAuth } from "@clerk/nextjs";
import { Spinner } from "@/components/ui";
import Link from "next/link";
import { IconPlay, IconGrid } from "@/components/icons";

export default function LiveExamsPage() {
  const { getToken } = useAuth();
  const [exams, setExams] = useState<any[] | null>(null);
  const [submitting, setSubmitting] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        const res = await fetchApi("/live-exams", {}, token);
        setExams(res.exams || []);
      } catch (err) {
        console.error("Failed to fetch live exams", err);
        setExams([]);
      }
    })();
  }, [getToken]);

  const handleRegister = async (id: string) => {
    if (submitting) return;
    setSubmitting(id);
    try {
      const token = await getToken();
      await fetchApi(`/live-exams/${id}/register`, { method: "POST" }, token);
      
      // Update local state
      setExams(prev => prev?.map(e => e.id === id ? { ...e, is_registered: true, status: "registered" } : e) || []);
    } catch (err) {
      console.error(err);
      alert("Failed to register");
    } finally {
      setSubmitting(null);
    }
  };

  if (!exams) return <Spinner label="Loading Live Exams..." />;

  return (
    <main className="container-page py-8">
      <div className="mb-8 text-center">
        <h1 className="h-display mb-2 text-3xl text-maroon flex justify-center items-center gap-2">
          <IconGrid /> Live Mock Exams
        </h1>
        <p className="text-stone-500">Compete in real-time under strict exam conditions.</p>
      </div>

      <div className="mx-auto max-w-4xl space-y-4">
        {exams.length === 0 && (
          <div className="text-center p-8 bg-stone-50 rounded-xl text-stone-500">
            No upcoming live exams scheduled right now. Check back later!
          </div>
        )}
        
        {exams.map(exam => {
          const startTime = new Date(exam.start_time);
          const endTime = new Date(exam.end_time);
          const now = new Date();
          const isStarted = now >= startTime;
          const isEnded = now > endTime;

          return (
            <div key={exam.id} className="card p-6 flex flex-col md:flex-row gap-6 items-center justify-between">
              <div>
                <h3 className="font-bold text-xl text-maroon mb-1">{exam.title}</h3>
                <p className="text-stone-600 text-sm mb-3">{exam.description}</p>
                <div className="flex gap-4 text-xs font-semibold text-stone-500 uppercase tracking-wider">
                  <span>Start: {startTime.toLocaleString()}</span>
                  <span>Duration: {exam.duration_minutes} min</span>
                </div>
              </div>

              <div className="shrink-0 w-full md:w-auto">
                {exam.status === "completed" ? (
                  <div className="text-center">
                    <div className="text-2xl font-display text-maroon font-bold">{exam.score}</div>
                    <div className="text-xs uppercase text-stone-500 font-bold">Your Score</div>
                  </div>
                ) : exam.is_registered ? (
                  isStarted && !isEnded ? (
                    <Link href={`/live-exams/${exam.id}`} className="btn-gold px-8 py-3 w-full md:w-auto text-center block">
                      Join Exam Now
                    </Link>
                  ) : isEnded ? (
                    <div className="px-4 py-2 bg-stone-100 text-stone-500 rounded-lg text-sm font-bold text-center">Exam Ended</div>
                  ) : (
                    <div className="px-4 py-2 bg-green-50 text-green-700 border border-green-200 rounded-lg text-sm font-bold text-center">
                      Registered - Waiting for start
                    </div>
                  )
                ) : (
                  <button 
                    onClick={() => handleRegister(exam.id)}
                    disabled={submitting === exam.id || isEnded}
                    className="btn-maroon px-8 py-3 w-full md:w-auto disabled:opacity-50"
                  >
                    {submitting === exam.id ? "Registering..." : isEnded ? "Missed" : "Register Now"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
