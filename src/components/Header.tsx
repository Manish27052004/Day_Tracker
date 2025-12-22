import { motion } from 'framer-motion';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, BarChart3, Repeat, CalendarCheck, ArrowRightLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import AuthStatus from './AuthStatus';
import { useEffect, useState } from 'react';

const Header = () => {
  const location = useLocation();
<<<<<<< HEAD
  const path = location.pathname;

  // Determine base path for links
  // If we are in "All" mode (path starts with /all), we keep that prefix.
  // Otherwise default to /tracker context.
  const isAllMode = path.startsWith('/all');

  const homeLink = isAllMode ? '/all/tracker' : '/tracker';
  const analyticsLink = isAllMode ? '/all/analytics' : '/tracker/analytics';

  const links = [
    { to: homeLink, label: 'Home', icon: LayoutDashboard },
    { to: analyticsLink, label: 'Analytics', icon: BarChart3 },
=======
  const navigate = useNavigate();
  const [mode, setMode] = useState<'tracker' | 'attendance'>('tracker');

  // Determine mode based on URL or local storage
  useEffect(() => {
    if (location.pathname.includes('/attendance')) {
      setMode('attendance');
    } else if (location.pathname.includes('/tracker') || location.pathname === '/') {
      setMode('tracker');
    }
  }, [location]);

  const toggleMode = () => {
    const newMode = mode === 'tracker' ? 'attendance' : 'tracker';
    localStorage.setItem('selected_mode', newMode);

    if (newMode === 'attendance') {
      navigate('/attendance');
    } else {
      navigate('/tracker');
    }
  };

  const links = [
    { to: mode === 'attendance' ? '/attendance' : '/tracker', label: 'Home', icon: LayoutDashboard },
    { to: mode === 'attendance' ? '/attendance/analytics' : '/tracker/analytics', label: 'Analytics', icon: BarChart3 },
>>>>>>> new
  ];

  return (
    <motion.header
      className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="container mx-auto px-4 py-3 max-w-6xl">
        <div className="flex items-center justify-between gap-4">
<<<<<<< HEAD
          {/* App Title */}
          <Link to={homeLink} className="flex items-center gap-2 group">
            <img src="/logo.png" alt="Logo" className="h-8 w-8 transition-transform group-hover:scale-105" />
            <h1 className="text-lg font-semibold text-foreground hidden sm:block">
              Daily Tracker
            </h1>
          </Link>
=======
          <div className="flex items-center gap-4">
            {/* App Title */}
            <h1 className="text-lg font-semibold text-foreground hidden sm:block">
              {mode === 'tracker' ? 'Daily Tracker' : 'Attendance Manager'}
            </h1>

            {/* Change Workspace Button */}
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
          </div>
>>>>>>> new

          {/* Navigation */}
          <nav className="flex items-center justify-center gap-2 mx-auto sm:mx-0">
            {links.map((link) => {
              // Check if link is active (ignoring query params)
              const isActive = location.pathname === link.to || (link.label === 'Home' && location.pathname === '/');
              const Icon = link.icon;

              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Auth Button */}
          <AuthStatus />
        </div>

        {/* Mobile Switch Mode (Visible only on small screens) */}
        <div className="sm:hidden flex justify-center mt-2 border-t pt-2 border-border/50">
          <Link to="/select-mode" className="w-full">
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 text-muted-foreground w-full justify-center"
            >
              <LayoutDashboard className="h-4 w-4" />
              <span>Change Workspace</span>
            </Button>
          </Link>
        </div>
      </div>
    </motion.header>
  );
};

export default Header;
