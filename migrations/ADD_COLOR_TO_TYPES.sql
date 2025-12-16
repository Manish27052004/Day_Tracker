-- Add color column to category_types if it doesn't exist
alter table public.category_types 
add column if not exists color text default 'bg-muted text-muted-foreground border-border';

-- Optional: Update existing types with default colors for better UX
update public.category_types set color = 'bg-blue-500/10 text-blue-600 border-blue-500/20' where lower(name) like '%work%';
update public.category_types set color = 'bg-purple-500/10 text-purple-600 border-purple-500/20' where lower(name) like '%life%';
