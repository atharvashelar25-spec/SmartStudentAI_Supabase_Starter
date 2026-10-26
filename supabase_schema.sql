-- StudentAI Supabase schema
-- Run in Supabase Dashboard > SQL Editor.
-- This starter relies on Supabase Auth for identity and RLS for private rows.
create extension if not exists pgcrypto;

create table if not exists public.student_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  display_name text,
  student_identifier text,
  branch text default 'AI & Data Science',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.performance_predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  student_identifier text not null check (char_length(student_identifier) between 1 and 100),
  attendance numeric(5,2) not null check (attendance between 0 and 100),
  previous_marks numeric(5,2) not null check (previous_marks between 0 and 100),
  assignment_average numeric(5,2) not null check (assignment_average between 0 and 100),
  internal_marks numeric(5,2) not null check (internal_marks between 0 and 100),
  weekly_study_hours numeric(5,2) not null check (weekly_study_hours between 0 and 100),
  completed_assignments integer not null check (completed_assignments between 0 and 100),
  predicted_score numeric(5,2) not null check (predicted_score between 0 and 100),
  category text not null,
  model_type text not null default 'transparent_demo_baseline',
  created_at timestamptz not null default now()
);

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  title text not null unique,
  required_skills text[] not null default '{}',
  preferred_skills text[] not null default '{}',
  experience_level text not null,
  description text not null,
  location text not null default 'Sample listing',
  is_sample boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.resume_analysis_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  target_role text not null,
  detected_skills text[] not null default '{}',
  detected_sections text[] not null default '{}',
  skill_coverage numeric(5,2) not null check (skill_coverage between 0 and 100),
  suggestions jsonb not null default '[]'::jsonb,
  -- Intentionally do not store uploaded PDF or extracted full resume text by default.
  created_at timestamptz not null default now()
);

alter table public.student_profiles enable row level security;
alter table public.performance_predictions enable row level security;
alter table public.resume_analysis_results enable row level security;
alter table public.jobs enable row level security;

create policy "Users can read own profile" on public.student_profiles
  for select to authenticated using (auth.uid() = user_id);
create policy "Users can insert own profile" on public.student_profiles
  for insert to authenticated with check (auth.uid() = user_id);
create policy "Users can update own profile" on public.student_profiles
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can read own predictions" on public.performance_predictions
  for select to authenticated using (auth.uid() = user_id);
create policy "Users can insert own predictions" on public.performance_predictions
  for insert to authenticated with check (auth.uid() = user_id);
create policy "Users can delete own predictions" on public.performance_predictions
  for delete to authenticated using (auth.uid() = user_id);

create policy "Users can read own resume analysis" on public.resume_analysis_results
  for select to authenticated using (auth.uid() = user_id);
create policy "Users can insert own resume analysis" on public.resume_analysis_results
  for insert to authenticated with check (auth.uid() = user_id);
create policy "Users can delete own resume analysis" on public.resume_analysis_results
  for delete to authenticated using (auth.uid() = user_id);

create policy "Authenticated users can read sample jobs" on public.jobs
  for select to authenticated using (is_sample = true);

-- Seed educational sample job roles. These are NOT live vacancies.
insert into public.jobs(title, required_skills, preferred_skills, experience_level, description, location, is_sample)
values
('Data Analyst', array['python','sql','excel','statistics','data visualization'], array['power bi','tableau'], 'Entry level', 'Explore datasets, clean data, build dashboards, and communicate insights.', 'Sample · Remote-friendly', true),
('Junior Data Scientist', array['python','pandas','numpy','statistics','machine learning'], array['sql','scikit-learn'], 'Entry level', 'Prepare data, build baseline models, evaluate metrics, and explain results.', 'Sample · Hybrid', true),
('Machine Learning Intern', array['python','numpy','pandas','machine learning','scikit-learn'], array['statistics','deep learning'], 'Internship', 'Support ML experiments, prepare datasets, and document reproducible results.', 'Sample · Remote-friendly', true),
('Python Developer', array['python','git','sql','api','testing'], array['fastapi','django'], 'Entry level', 'Develop Python services, connect databases, write tests, and integrate REST APIs.', 'Sample · Hybrid', true),
('Business Intelligence Analyst', array['sql','excel','power bi','data visualization','business analysis'], array['tableau','statistics'], 'Entry level', 'Turn operational data into reports, dashboards, and business insights.', 'Sample · Hybrid', true),
('AI/ML Intern', array['python','numpy','pandas','machine learning','statistics'], array['deep learning','scikit-learn'], 'Internship', 'Explore AI use cases, test models, and document experiments.', 'Sample · Remote-friendly', true)
on conflict (title) do nothing;
