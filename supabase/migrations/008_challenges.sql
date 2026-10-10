-- Challenges table for "Challenge a Friend" feature
CREATE TABLE IF NOT EXISTS public.challenges (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id      TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  opponent_id     TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
  question_ids    UUID[] NOT NULL,
  creator_score   NUMERIC(6,2),
  opponent_score  NUMERIC(6,2),
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

-- Anyone who knows the challenge ID can view it (needed to join via link)
CREATE POLICY "challenges: public read"
ON public.challenges FOR SELECT
USING (true);

CREATE POLICY "challenges: creator insert"
ON public.challenges FOR INSERT
WITH CHECK (creator_id = (auth.jwt()->>'sub'));

CREATE POLICY "challenges: update"
ON public.challenges FOR UPDATE
USING (
  creator_id = (auth.jwt()->>'sub') OR opponent_id = (auth.jwt()->>'sub')
);
