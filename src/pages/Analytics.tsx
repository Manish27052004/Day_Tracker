import { motion } from 'framer-motion';

import AnalyticsChart from '@/components/AnalyticsChart';

const Analytics = () => {
  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Track your productivity trends over time
          </p>
        </div>

        <AnalyticsChart />
      </motion.div>
    </div>
  );
};

export default Analytics;
