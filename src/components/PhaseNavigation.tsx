import { ClipboardList, Play, PieChart } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

export type Phase = 'planning' | 'execution' | 'breakdown';

interface PhaseNavigationProps {
  activePhase: Phase;
  onPhaseChange: (phase: Phase) => void;
}

const phases = [
  { id: 'planning' as Phase, label: 'Planning', icon: ClipboardList },
  { id: 'execution' as Phase, label: 'Execution', icon: Play },
  { id: 'breakdown' as Phase, label: 'Daily Breakdown', icon: PieChart },
];

const PhaseNavigation = ({ activePhase, onPhaseChange }: PhaseNavigationProps) => {
  const isMobile = useIsMobile();

  return (
    <motion.div
      className="grid grid-cols-3 gap-2 sm:gap-3"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
    >
      {phases.map((phase, index) => {
        const Icon = phase.icon;
        const isActive = activePhase === phase.id;

        return (
          <motion.button
            key={phase.id}
            onClick={() => onPhaseChange(phase.id)}
            className={cn(
              'phase-card relative overflow-hidden min-h-[50px] sm:min-h-[80px] p-1 sm:p-4',
              isActive && 'active'
            )}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            {isActive && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent"
                layoutId="activePhase"
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              />
            )}
            <Icon className={cn(
              'transition-colors duration-200',
              isActive ? 'text-primary' : 'text-muted-foreground',
              isMobile ? 'h-4 w-4 mb-0.5' : 'h-5 w-5 mb-1'
            )} />
            <span className={cn(
              'font-medium transition-colors duration-200 text-center leading-tight',
              isActive ? 'text-primary' : 'text-muted-foreground',
              isMobile ? 'text-[10px]' : 'text-sm'
            )}>
              {phase.label}
            </span>
          </motion.button>
        );
      })}
    </motion.div>
  );
};

export default PhaseNavigation;
