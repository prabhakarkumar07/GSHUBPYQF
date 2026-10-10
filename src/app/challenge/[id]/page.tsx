"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { fetchApi } from "@/lib/api-client";
import { useAuth } from "@clerk/nextjs";
import { Spinner } from "@/components/ui";
import { QuestionBody } from "@/components/QuestionBody";
import Link from "next/link";
import { IconTrophy } from "@/components/icons";

export default function ChallengePage() {
  const { id } = useParams() as { id: string };
  const { getToken, userId } = useAuth();
  
  const [data, setData] = useState<{ challenge: any; questions: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        const res = await fetchApi(`/challenge/${id}`, {}, token);
        setData(res);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, getToken]);

  if (loading) return <Spinner label="Loading Challenge..." />;
  if (!data) return <div className="container-page py-16 text-center text-red-500">Challenge not found.</div>;

  const { challenge, questions } = data;
  const isCreator = challenge.creator_id === userId;
  const isOpponent = challenge.opponent_id === userId;
  const isParticipant = isCreator || isOpponent;
  const hasMyScore = isCreator ? challenge.creator_score !== null : (isOpponent ? challenge.opponent_score !== null : false);

  if (challenge.status === "pending" && !isParticipant) {
    // If pending and I'm not the creator or opponent, I can join!
    // For simplicity, we just submit a 0 score immediately to lock in as opponent, or wait for them to start?
    // Actually, backend expects score submission to lock in the opponent.
    // So we just render "Start Duel" button.
  }

  // --- RENDERING ---

  if (challenge.status === "completed" || hasMyScore) {
    // Show results
    const cScore = challenge.creator_score ?? (isCreator ? score : 0);
    const oScore = challenge.opponent_score ?? (isOpponent ? score : 0);
    const winner = cScore > oScore ? challenge.creator?.full_name : oScore > cScore ? challenge.opponent?.full_name : "Tie";

    return (
      <main className="container-page py-16 text-center max-w-lg">
        <IconTrophy className="h-16 w-16 mx-auto text-yellow-500 mb-4" />
        <h1 className="h-display text-3xl text-maroon mb-2">Duel Completed!</h1>
        <div className="card p-6 mt-6">
          <div className="flex justify-between items-center mb-4">
            <div className="text-left">
              <div className="font-bold text-lg">{challenge.creator?.full_name}</div>
              <div className="text-3xl font-display text-maroon">{cScore}</div>
            </div>
            <div className="text-stone-400 font-bold">VS</div>
            <div className="text-right">
              <div className="font-bold text-lg">{challenge.opponent?.full_name || "Waiting..."}</div>
              <div className="text-3xl font-display text-maroon">{oScore !== null ? oScore : "?"}</div>
            </div>
          </div>
          {challenge.status === "completed" && (
            <div className="p-3 bg-gold-50 text-gold-900 rounded-lg font-bold">
              Winner: {winner}
            </div>
          )}
        </div>
        <Link href="/dashboard" className="btn-gold mt-6 block">Return to Dashboard</Link>
      </main>
    );
  }

  if (challenge.status === "pending" && isCreator) {
    const url = typeof window !== "undefined" ? window.location.href : "";
    return (
      <main className="container-page py-16 text-center max-w-lg">
        <h1 className="h-display text-3xl text-maroon mb-2">Challenge Created!</h1>
        <p className="text-stone-500 mb-6">Send this link to a friend to duel.</p>
        <div className="p-4 bg-stone-100 rounded-lg break-all font-mono text-sm text-stone-600 border border-stone-200">
          {url}
        </div>
        <button onClick={() => navigator.clipboard.writeText(url)} className="btn-gold mt-4">Copy Link</button>
      </main>
    );
  }

  // Active quiz state
  const handleSelect = async (option: string) => {
    if (finished) return;
    const isCorrect = questions[currentIndex].correct_option === option;
    if (isCorrect) setScore(s => s + 1);

    if (currentIndex + 1 < questions.length) {
      setCurrentIndex(i => i + 1);
    } else {
      // Finished! Submit score.
      setFinished(true);
      setSubmitting(true);
      try {
        const token = await getToken();
        await fetchApi(`/challenge/${id}/submit`, {
          method: "POST",
          body: JSON.stringify({ score: isCorrect ? score + 1 : score })
        }, token);
        // Refresh state
        const res = await fetchApi(`/challenge/${id}`, {}, token);
        setData(res);
      } catch (err) {
        console.error("Failed to submit duel score", err);
      } finally {
        setSubmitting(false);
      }
    }
  };

  const currentQ = questions[currentIndex];

  return (
    <main className="container-page py-8 max-w-2xl">
      <div className="mb-6 flex justify-between items-center text-maroon font-bold">
        <div>Score: {score}</div>
        <div>{currentIndex + 1} / {questions.length}</div>
      </div>
      <div className="card p-6">
        <QuestionBody 
          q={currentQ} 
          selected={null} 
          reveal={false} 
          onSelect={(opt: any) => handleSelect(opt)} 
        />
      </div>
      {submitting && <div className="mt-4 text-center text-stone-500"><Spinner /> Submitting your score...</div>}
    </main>
  );
}
