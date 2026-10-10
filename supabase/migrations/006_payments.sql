CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  plan_name TEXT NOT NULL,
  razorpay_order_id TEXT NOT NULL,
  razorpay_payment_id TEXT NOT NULL,
  method TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: Only admins or the service role can view all payments.
-- Users could view their own payments if we wanted, but for now we only need it for Admin Revenue Dashboard.
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all payments"
ON public.payments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = (auth.jwt()->>'sub') AND profiles.role = 'admin'
  )
);
