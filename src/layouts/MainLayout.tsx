import { Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
// import { motion, AnimatePresence } from 'framer-motion'; // Removed for stability
import { CalendarClock, Users, LogOut, LayoutDashboard, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import Header from '@/components/Header';

const MainLayout = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { signOut } = useAuth();
    const [mode, setMode] = useState<'tracker' | 'attendance' | 'all'>('all');

    // Determine mode from path or previous selection
    useEffect(() => {
        const path = location.pathname;
        if (path.includes('/tracker')) {
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
            {isAllMode ? (
                <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
                    <div className="container mx-auto px-4 max-w-6xl">
                        {/* Top Row: Workspace + App Switcher + Actions */}
                        <div className="flex items-center justify-between py-3 border-b border-border/40">
                            <div className="flex items-center gap-4">
                                <Link to="/select-mode">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="gap-2 hidden sm:flex border-primary/20 hover:border-primary/50 hover:bg-primary/5"
                                    >
                                        <LayoutDashboard className="h-4 w-4" />
                                        <span>Change Workspace</span>
                                    </Button>
                                </Link>

                                <nav className="flex items-center gap-1 border-l pl-4 ml-2 border-border/40">
                                    <Link to="/all/tracker">
                                        <Button
                                            variant={location.pathname.includes('/tracker') ? "secondary" : "ghost"}
                                            size="sm"
                                            className="gap-2"
                                        >
                                            <CalendarClock className="h-4 w-4" /> Daily Tracker
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

                        {/* Bottom Row: Sub-Navigation (Home | Analytics) */}
                        <div className="flex items-center py-2 gap-1">
                            <nav className="flex items-center gap-1">
                                {(location.pathname.includes('/tracker') ? [
                                    { to: '/all/tracker', label: 'Home', icon: LayoutDashboard },
                                    { to: '/all/tracker/analytics', label: 'Analytics', icon: BarChart3 } // Needs BarChart3 import
                                ] : [
                                    { to: '/all/attendance', label: 'Home', icon: LayoutDashboard },
                                    // { to: '/all/attendance/analytics', label: 'Analytics', icon: BarChart3 } // Placeholder
                                ]).map((link) => {
                                    const isActive = location.pathname === link.to;
                                    const Icon = link.icon;
                                    return (
                                        <Link
                                            key={link.to}
                                            to={link.to}
                                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${isActive
                                                ? "bg-secondary text-secondary-foreground"
                                                : "text-muted-foreground hover:text-foreground hover:bg-muted"
                                                }`}
                                        >
                                            <Icon className="h-4 w-4" />
                                            <span>{link.label}</span>
                                        </Link>
                                    );
                                })}
                            </nav>
                        </div>

                        {/* Mobile Switch Mode */}
                        <div className="sm:hidden flex justify-center py-2 border-t border-border/40">
                            <Link to="/select-mode" className="w-full">
                                <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground w-full justify-center">
                                    <LayoutDashboard className="h-4 w-4" />
                                    <span>Change Workspace</span>
                                </Button>
                            </Link>
                        </div>
                    </div>
                </header>
            ) : (
                <Header />
            )}

            {/* Content Area */}
            <main className="flex-1 overflow-auto">
                <Outlet />
            </main>
        </div>
    );
};

export default MainLayout;
