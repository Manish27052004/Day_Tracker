import { cn } from '@/lib/utils';

interface PriorityTagProps {
  priority?: string | null;
  color?: string; // Color class or hex
}

const PriorityTag = ({ priority, color }: PriorityTagProps) => {
  if (!priority) {
    return (
      <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium rounded-full border border-dashed whitespace-nowrap text-muted-foreground bg-muted/50 border-border">
        None
      </span>
    );
  }

  // Handle hex codes specially
  const isHex = color?.startsWith('#');

  // Fallback to gray if color not provided
  const colorClass = !isHex ? (color || 'text-muted-foreground bg-muted border-border') : '';

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium rounded-full border whitespace-nowrap",
        colorClass
      )}
      style={isHex ? {
        backgroundColor: `${color}20`,
        color: color,
        borderColor: `${color}40`
      } : undefined}
    >
      {priority}
    </span>
  );
};

export default PriorityTag;
