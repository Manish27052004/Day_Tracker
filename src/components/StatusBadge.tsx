import { cn } from '@/lib/utils';

type Status = 'lagging' | 'on-track' | 'overachiever';

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

const statusConfig = {
  'lagging': { label: 'Lagging', className: 'status-lagging' },
  'on-track': { label: 'On Track', className: 'status-on-track' },
  'overachiever': { label: 'Overachiever', className: 'status-overachiever' },
};

const StatusBadge = ({ status, className }: StatusBadgeProps) => {
  const config = statusConfig[status];

  return (
    <span className={cn('status-badge', config.className, className)}>
      {config.label}
    </span>
  );
};

export default StatusBadge;
