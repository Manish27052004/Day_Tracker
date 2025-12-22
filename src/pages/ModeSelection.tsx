import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarClock, LayoutDashboard, Users, ArrowRight } from 'lucide-react';

const ModeSelection = () => {
    const navigate = useNavigate();

    const modes = [
        {
            id: 'tracker',
<<<<<<< HEAD
            title: 'Day Tracker',
=======
            title: 'Daily Tracker',
>>>>>>> new
            description: 'Focus solely on managing your daily tasks and schedule.',
            icon: CalendarClock,
            color: 'from-blue-500 to-cyan-500',
            path: '/tracker',
            delay: 0.1
        },
        {
            id: 'attendance',
            title: 'Attendance Manager',
            description: 'Track and manage your attendance records efficiently.',
            icon: Users,
            color: 'from-purple-500 to-pink-500',
            path: '/attendance',
            delay: 0.2
        },
        {
            id: 'all',
            title: 'All Apps',
<<<<<<< HEAD
            description: 'Access both Day Tracker and Attendance Manager in one workspace.',
=======
            description: 'Access both Daily Tracker and Attendance Manager in one workspace.',
>>>>>>> new
            icon: LayoutDashboard,
            color: 'from-orange-500 to-red-500',
            path: '/all',
            delay: 0.3
        }
    ];

    const handleSelectMode = (mode: string, path: string) => {
        // Persist selection if needed in future
        localStorage.setItem('selected_mode', mode);
        navigate(path);
    };

    return (
        <div className="min-h-screen bg-background p-6 flex flex-col items-center justify-center relative overflow-hidden">
            {/* Background Details */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-background" />

            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-center mb-12 relative z-10"
            >
                <h1 className="text-4xl font-bold tracking-tight mb-4">Select Your Focus</h1>
                <p className="text-muted-foreground text-lg max-w-xl mx-auto">
                    Choose how you want to interact with your dashboard today. You can always switch later.
                </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl w-full relative z-10">
                {modes.map((mode) => (
                    <motion.div
                        key={mode.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: mode.delay, duration: 0.5 }}
                        whileHover={{ y: -5 }}
                        className="h-full"
                    >
                        <Card
                            className="h-full cursor-pointer hover:shadow-xl transition-all duration-300 border-border/50 group overflow-hidden relative"
                            onClick={() => handleSelectMode(mode.id, mode.path)}
                        >
                            <div className={`absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity duration-500 bg-gradient-to-br ${mode.color}`} />

                            <CardHeader>
                                <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${mode.color} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                                    <mode.icon className="text-white h-6 w-6" />
                                </div>
                                <CardTitle className="text-xl group-hover:text-primary transition-colors">
                                    {mode.title}
                                </CardTitle>
                                <CardDescription className="text-sm">
                                    {mode.description}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="mt-auto pt-0">
                                <div className="flex items-center text-sm font-medium text-muted-foreground group-hover:text-primary transition-colors">
                                    Enter Workspace <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

export default ModeSelection;
