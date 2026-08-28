CREATE TABLE public.content_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE SET NULL,
  course_slug TEXT,
  course_topic TEXT,
  lesson_index INTEGER,
  lesson_title TEXT,
  reason TEXT NOT NULL,
  details TEXT,
  excerpt TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.content_reports TO authenticated;
GRANT ALL ON public.content_reports TO service_role;

ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can file their own content reports"
  ON public.content_reports FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read their own content reports"
  ON public.content_reports FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE TABLE public.moderation_blocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE SET NULL,
  topic TEXT NOT NULL,
  category TEXT NOT NULL,
  stage TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT ALL ON public.moderation_blocks TO service_role;

ALTER TABLE public.moderation_blocks ENABLE ROW LEVEL SECURITY;