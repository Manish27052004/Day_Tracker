-- Create Periods table
create table if not exists periods (
  id bigint primary key generated always as identity,
  user_id uuid references auth.users not null,
  title text not null,
  start_date date not null,
  end_date date not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create Period Tasks table
create table if not exists period_tasks (
  id bigint primary key generated always as identity,
  period_id bigint references periods(id) on delete cascade not null,
  title text not null,
  is_completed boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add Link to Tasks table (Execution)
-- We add it as nullable because not all tasks belong to a period
alter table tasks 
add column if not exists period_task_id bigint references period_tasks(id) on delete set null;

-- Indexes
create index if not exists periods_user_id_idx on periods(user_id);
create index if not exists period_tasks_period_id_idx on period_tasks(period_id);
create index if not exists tasks_period_task_id_idx on tasks(period_task_id);

-- RLS Policies
alter table periods enable row level security;
alter table period_tasks enable row level security;

-- Periods Policies
create policy "Users can view their own periods"
  on periods for select
  using (auth.uid() = user_id);

create policy "Users can insert their own periods"
  on periods for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own periods"
  on periods for update
  using (auth.uid() = user_id);

create policy "Users can delete their own periods"
  on periods for delete
  using (auth.uid() = user_id);

-- Period Tasks Policies
create policy "Users can view their own period tasks"
  on period_tasks for select
  using ( exists ( select 1 from periods where id = period_tasks.period_id and user_id = auth.uid() ) );

create policy "Users can insert their own period tasks"
  on period_tasks for insert
  with check ( exists ( select 1 from periods where id = period_id and user_id = auth.uid() ) );

create policy "Users can update their own period tasks"
  on period_tasks for update
  using ( exists ( select 1 from periods where id = period_tasks.period_id and user_id = auth.uid() ) );

create policy "Users can delete their own period tasks"
  on period_tasks for delete
  using ( exists ( select 1 from periods where id = period_tasks.period_id and user_id = auth.uid() ) );
