import { Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
<<<<<<< HEAD
import { CalendarClock, Users, ArrowLeft, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
=======
import { CalendarClock, Users, LogOut, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import Header from '@/components/Header';
>>>>>>> new

const MainLayout = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { signOut } = useAuth();
    const [mode, setMode] = useState<'tracker' | 'attendance' | 'all'>('all');

    // Determine mode from path or previous selection
    useEffect(() => {
        const path = location.pathname;
        if (path.includes('/tracker')) {
<<<<<<< HEAD
            // Check if we are in "all" mode (user came from /all redirect) or strict tracker mode
            // For simplicity, if the URL is /tracker, it's just tracker. 
            // BUT, if we are in "All Apps" mode, we want to show the nav.
            // We'll rely on the top-level route wrapper to tell us, or just infer from URL 
            // if we are wrapping EVERYTHING.
            // Let's assume "/all" redirects to "/all/tracker" or similar structure?
            // Wait, the plan was:
            // Mode 1: /tracker -> Shows Index.tsx (Day Tracker)
            // Mode 2: /attendance -> Shows Attendance.tsx
            // Mode 3: /all -> Need a way to switch. 

            // Re-evaluating:
            // If I am at /tracker, I am in tracker mode.
            // If I am at /attendance, I am in attendance mode.
            // If I selected "All", I should probably see a navigation bar at the top/side 
            // that lets me switch between /tracker and /attendance.

            // So, actually, the simpler way is:
            // The "All" selection just navigates to /tracker, but with a special state/flag 
            // that says "Show Navigation".

=======
>>>>>>> new
            const isAllMode = location.pathname.startsWith('/all');
            if (isAllMode) setMode('all');
            else if (path.startsWith('/tracker')) setMode('tracker');
            else if (path.startsWith('/attendance')) setMode('attendance');
        }
    }, [location]);

    // Handle "All" mode navigation logic
    // If user is at /all, we redirect to /all/tracker by default
    useEffect(() => {
        if (location.pathname === '/all') {
            navigate('/all/tracker', { replace: true });
        }
    }, [location.pathname, navigate]);

    const isAllMode = location.pathname.startsWith('/all');

    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* Top Navigation Bar - Only visible in "All" mode */}
<<<<<<< HEAD
            {isAllMode && (
                <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
                    <div className="container flex h-14 max-w-screen-2xl items-center justify-between">
                        <div className="flex items-center gap-6">
                            <Link to="/select-mode" className="flex items-center gap-2 font-bold text-lg text-primary mr-4 hover:opacity-80 transition-opacity">
                                <ArrowLeft className="h-4 w-4" /> Modes
=======
            {isAllMode ? (
                <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
                    <div className="container flex h-14 max-w-screen-2xl items-center justify-between">
                        <div className="flex items-center gap-6">
                            <Link to="/select-mode">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-2 hidden sm:flex border-primary/20 hover:border-primary/50 hover:bg-primary/5 mr-4"
                                >
                                    <LayoutDashboard className="h-4 w-4" />
                                    <span>Change Workspace</span>
                                </Button>
>>>>>>> new
                            </Link>

                            <nav className="flex items-center gap-1">
                                <Link to="/all/tracker">
                                    <Button
                                        variant={location.pathname.includes('/tracker') ? "secondary" : "ghost"}
                                        size="sm"
                                        className="gap-2"
                                    >
<<<<<<< HEAD
                                        <CalendarClock className="h-4 w-4" /> Tracker
=======
                                        <CalendarClock className="h-4 w-4" /> Daily Tracker
>>>>>>> new
                                    </Button>
                                </Link>
                                <Link to="/all/attendance">
                                    <Button
                                        variant={location.pathname.includes('/attendance') ? "secondary" : "ghost"}
                                        size="sm"
                                        className="gap-2"
                                    >
                                        <Users className="h-4 w-4" /> Attendance
                                    </Button>
                                </Link>
                            </nav>
                        </div>

                        <Button variant="ghost" size="icon" onClick={() => signOut()} title="Sign Out">
                            <LogOut className="h-4 w-4" />
                        </Button>
                    </div>
                </header>
<<<<<<< HEAD
=======
            ) : (
                <Header />
>>>>>>> new
            )}

            {/* Content Area */}
            <main className="flex-1">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={location.pathname}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="h-full"
                    >
                        <Outlet />
                    </motion.div>
                </AnimatePresence>
            </main>
<<<<<<< HEAD

            {/* Floating Back Button for Single Modes */}
            {!isAllMode && (
                <div className="fixed bottom-4 right-4 z-50">
                    <Link to="/select-mode">
                        <Button variant="outline" size="sm" className="shadow-lg backdrop-blur bg-background/50 hover:bg-background/80">
                            <ArrowLeft className="h-4 w-4 mr-2" /> Switch Mode
                        </Button>
                    </Link>
                </div>
            )}
=======
>>>>>>> new
        </div>
    );
};

export default MainLayout;
