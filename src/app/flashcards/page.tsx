"use client";
import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api-client";
import { Spinner } from "@/components/ui";
import { QuestionBody } from "@/components/QuestionBody";
import { IconNotebook } from "@/components/icons";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";

export default function FlashcardsPage() {
  const { getToken } = useAuth();
  const [cards, setCards] = useState<any[] | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        const res = await fetchApi("/quiz/flashcards", {}, token);
        setCards(res.flashcards || []);
      } catch (err) {
        console.error("Failed to fetch flashcards", err);
        setCards([]);
      }
    })();
  }, [getToken]);

  const handleReview = async (quality: number) => {
    if (!cards || submitting) return;
    setSubmitting(true);
    try {
      const token = await getToken();
      await fetchApi("/quiz/flashcards/review", {
        method: "POST",
        body: JSON.stringify({
          questionId: cards[currentIndex].id,
          quality
        })
      }, token);
      
      // Move to next card
      setRevealed(false);
      setCurrentIndex((prev) => prev + 1);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (!cards) return <Spinner label="Loading flashcards..." />;

  if (cards.length === 0 || currentIndex >= cards.length) {
    return (
      <main className="container-page py-16 text-center">
        <div className="text-6xl mb-4">🎉</div>
        <h1 className="h-display text-2xl text-maroon mb-2">You're all caught up!</h1>
        <p className="text-stone-500 mb-8">You have reviewed all your due flashcards for today. Great job!</p>
        <Link href="/dashboard" className="btn-gold px-8 py-3 rounded-xl font-medium">Return to Dashboard</Link>
      </main>
    );
  }

  const currentCard = cards[currentIndex];

  return (
    <main className="container-page py-8 max-w-2xl">
      <div className="mb-6 flex justify-between items-center text-stone-500 text-sm font-medium">
        <div className="flex items-center gap-2 text-maroon">
          <IconNotebook className="h-5 w-5" />
          Daily Review
        </div>
        <div>
          Card {currentIndex + 1} of {cards.length}
        </div>
      </div>

      <div className="card p-6 min-h-[300px] flex flex-col justify-center">
        <QuestionBody q={currentCard} selected={null} reveal={revealed} />
        
        {revealed && (
          <div className="mt-8 pt-6 border-t border-maroon/10">
            <h3 className="text-sm font-bold text-maroon mb-3 uppercase tracking-wider">Correct Answer</h3>
            <div className="p-4 bg-green-50 text-green-900 rounded-xl border border-green-200">
              {currentCard.answer_explanation || "The correct answer is Option " + currentCard.correct_option}
            </div>
            {currentCard.answer_explanation && (
              <p className="mt-4 text-sm text-stone-600">{currentCard.answer_explanation}</p>
            )}
          </div>
        )}
      </div>

      <div className="mt-8 flex flex-col items-center">
        {!revealed ? (
          <button 
            onClick={() => setRevealed(true)}
            className="w-full max-w-md py-4 rounded-xl bg-maroon text-white font-bold text-lg shadow-lg shadow-maroon/20 transition hover:-translate-y-1 hover:shadow-xl"
          >
            Show Answer
          </button>
        ) : (
          <div className="w-full max-w-md text-center">
            <p className="text-sm font-medium text-stone-500 mb-4">How well did you know this?</p>
            <div className="grid grid-cols-4 gap-2">
              <button disabled={submitting} onClick={() => handleReview(0)} className="py-3 px-2 rounded-xl bg-red-100 text-red-800 font-medium text-xs hover:bg-red-200 transition disabled:opacity-50">
                Forgot (0)
              </button>
              <button disabled={submitting} onClick={() => handleReview(3)} className="py-3 px-2 rounded-xl bg-orange-100 text-orange-800 font-medium text-xs hover:bg-orange-200 transition disabled:opacity-50">
                Hard (3)
              </button>
              <button disabled={submitting} onClick={() => handleReview(4)} className="py-3 px-2 rounded-xl bg-blue-100 text-blue-800 font-medium text-xs hover:bg-blue-200 transition disabled:opacity-50">
                Good (4)
              </button>
              <button disabled={submitting} onClick={() => handleReview(5)} className="py-3 px-2 rounded-xl bg-green-100 text-green-800 font-medium text-xs hover:bg-green-200 transition disabled:opacity-50">
                Easy (5)
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
