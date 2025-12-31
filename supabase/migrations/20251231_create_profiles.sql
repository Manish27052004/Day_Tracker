-- Create Profiles table
create table if not exists profiles (
  id bigint primary key generated always as identity,
  user_id uuid references auth.users not null,
  name text not null,
  description text,
  is_default boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create Profile Items table (Many-to-Many link between Profiles and Templates/Tasks)
create table if not exists profile_items (
  id bigint primary key generated always as identity,
  profile_id bigint references profiles(id) on delete cascade not null,
  template_id bigint references task_templates(id) on delete cascade, 
  order_index integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add indexes for performance
create index if not exists profiles_user_id_idx on profiles(user_id);
create index if not exists profile_items_profile_id_idx on profile_items(profile_id);

-- RLS Policies (assuming standard auth setup)
alter table profiles enable row level security;
alter table profile_items enable row level security;

create policy "Users can view their own profiles"
  on profiles for select
  using (auth.uid() = user_id);

create policy "Users can insert their own profiles"
  on profiles for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own profiles"
  on profiles for update
  using (auth.uid() = user_id);

create policy "Users can delete their own profiles"
  on profiles for delete
  using (auth.uid() = user_id);

create policy "Users can view their own profile items"
  on profile_items for select
  using ( exists ( select 1 from profiles where id = profile_items.profile_id and user_id = auth.uid() ) );

create policy "Users can insert their own profile items"
  on profile_items for insert
  with check ( exists ( select 1 from profiles where id = profile_id and user_id = auth.uid() ) );

create policy "Users can update their own profile items"
  on profile_items for update
  using ( exists ( select 1 from profiles where id = profile_items.profile_id and user_id = auth.uid() ) );

create policy "Users can delete their own profile items"
  on profile_items for delete
  using ( exists ( select 1 from profiles where id = profile_items.profile_id and user_id = auth.uid() ) );
