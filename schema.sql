-- ERMOL schema. Run once in Supabase > SQL Editor.
create extension if not exists pgcrypto;

create table public.quizzes (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 120),
  subject text not null,
  topic text not null,
  difficulty text not null check (difficulty in ('Easy','Medium','Hard')),
  time_minutes int not null default 10 check (time_minutes between 1 and 180),
  code text not null unique check (code ~ '^ERMOL-[A-Z0-9]{5}$'),
  published boolean not null default false,
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  subject text not null,
  topic text not null,
  difficulty text not null check (difficulty in ('Easy','Medium','Hard')),
  question_text text not null,
  option_a text not null,
  option_b text not null,
  option_c text not null,
  option_d text not null,
  correct_index int not null check (correct_index between 0 and 3),
  order_no int not null default 1,
  created_at timestamptz not null default now()
);

create table public.attempts (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  student_name text not null check (char_length(student_name) between 1 and 60),
  total_questions int not null check (total_questions > 0),
  correct_answers int not null check (correct_answers >= 0),
  wrong_answers int not null check (wrong_answers >= 0),
  percentage int not null check (percentage between 0 and 100),
  created_at timestamptz not null default now(),
  check (correct_answers + wrong_answers = total_questions)
);

create index on public.questions (quiz_id, order_no);
create index on public.questions (subject, topic, difficulty);
create index on public.attempts (quiz_id);

alter table public.quizzes   enable row level security;
alter table public.questions enable row level security;
alter table public.attempts  enable row level security;

-- Quizzes: anyone reads published; owner reads/writes own.
create policy "read published or own" on public.quizzes for select
  using (published or created_by = auth.uid());
create policy "insert own" on public.quizzes for insert to authenticated
  with check (created_by = auth.uid());
create policy "update own" on public.quizzes for update to authenticated
  using (created_by = auth.uid()) with check (created_by = auth.uid());
create policy "delete own" on public.quizzes for delete to authenticated
  using (created_by = auth.uid());

-- Questions: follow their quiz.
create policy "read published or own" on public.questions for select
  using (exists (select 1 from public.quizzes q where q.id = quiz_id and (q.published or q.created_by = auth.uid())));
create policy "write own" on public.questions for all to authenticated
  using (exists (select 1 from public.quizzes q where q.id = quiz_id and q.created_by = auth.uid()))
  with check (exists (select 1 from public.quizzes q where q.id = quiz_id and q.created_by = auth.uid()));

-- Attempts: students insert for published quizzes; only the quiz owner reads.
create policy "insert for published" on public.attempts for insert
  with check (exists (select 1 from public.quizzes q where q.id = quiz_id and q.published));
create policy "owner reads" on public.attempts for select to authenticated
  using (exists (select 1 from public.quizzes q where q.id = quiz_id and q.created_by = auth.uid()));
