import { motion } from 'framer-motion';
import { ArrowLeft, HardHat } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const Attendance = () => {
    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="text-center space-y-6 max-w-md"
            >
                <div className="mx-auto w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center animate-pulse">
                    <HardHat className="h-12 w-12 text-primary" />
                </div>

                <h1 className="text-3xl font-bold">Attendance Manager</h1>
                <p className="text-muted-foreground">
                    This module is currently under construction. Check back later for updates on this feature.
                </p>

                <div className="pt-8">
                    <Link to="/select-mode">
                        <Button variant="outline" className="gap-2">
                            <ArrowLeft className="h-4 w-4" /> Back to Mode Selection
                        </Button>
                    </Link>
                </div>
            </motion.div>
        </div>
    );
};

export default Attendance;
