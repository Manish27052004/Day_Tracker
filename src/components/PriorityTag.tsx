import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { cn } from '@/lib/utils';

interface PriorityTagProps {
  priority?: string | null;
}

const PriorityTag = ({ priority }: PriorityTagProps) => {
  const priorities = useLiveQuery(() => db.priorities.toArray());

  if (!priority) {
    return (
      <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium rounded-full border border-dashed whitespace-nowrap text-muted-foreground bg-muted/50 border-border">
        None
      </span>
    );
  }

  const priorityConfig = priorities?.find(p => p.name === priority);

  // Fallback for legacy hardcoded values if DB is empty or migrating
  const getLegacyColor = (p: string) => {
    if (p === 'urgent') return 'text-danger bg-danger/10 border-danger/20';
    if (p === 'normal') return 'text-muted-foreground bg-muted border-border';
    // Match old hardcoded new-types if they exist as strings but not in DB yet?
    // But we seeded DB, so they should appear.
    return 'text-muted-foreground bg-muted border-border';
  };

  const colorClass = priorityConfig?.color || getLegacyColor(priority);

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium rounded-full border whitespace-nowrap",
        colorClass
      )}
    >
      {priority}
    </span>
  );
};

export default PriorityTag;
