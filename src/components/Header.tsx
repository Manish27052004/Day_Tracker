import { motion } from 'framer-motion';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { LayoutDashboard, BarChart3, Grid3X3, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import AuthStatus from './AuthStatus';
import { ModeToggle } from "@/components/mode-toggle";
import { useEffect, useState } from 'react';
import { useUserPreferences } from '@/contexts/UserPreferencesContext';
import { useIsMobile } from '@/hooks/use-mobile';

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'tracker' | 'attendance'>('tracker');
  const { dayStartHour, setDayStartHour } = useUserPreferences();
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Determine mode based on URL or local storage
  useEffect(() => {
    if (location.pathname.includes('/attendance')) {
      setMode('attendance');
    } else if (location.pathname.includes('/tracker') || location.pathname === '/') {
      setMode('tracker');
    }
  }, [location]);

  const links = [
    { to: mode === 'attendance' ? '/attendance' : '/tracker', label: 'Home', icon: LayoutDashboard },
    { to: mode === 'attendance' ? '/attendance/analytics' : '/tracker/analytics', label: 'Analytics', icon: BarChart3 },
    // Only show Matrix for tracker mode for now
    ...(mode === 'tracker' ? [{ to: '/tracker/matrix', label: 'Habit Matrix', icon: Grid3X3 }] : []),
  ];

  return (
    <motion.header
      className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Top Row: Workspace Identity & Actions */}
        <div className="flex items-center justify-between py-3 border-b border-border/40">
          <div className="flex items-center gap-4">
            {/* Mobile Menu Trigger */}
            {isMobile && (
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="-ml-2">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[300px] sm:w-[400px]">
                  <SheetHeader>
                    <SheetTitle>Menu</SheetTitle>
                  </SheetHeader>
                  <div className="flex flex-col gap-4 py-4">
                    <div className="flex flex-col gap-2">
                      <p className="text-sm font-medium text-muted-foreground px-2">Navigation</p>
                      {links.map((link) => {
                        const Icon = link.icon;
                        const isActive = location.pathname === link.to;
                        return (
                          <Link
                            key={link.to}
                            to={link.to}
                            onClick={() => setMobileOpen(false)}
                            className={cn(
                              "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200",
                              isActive
                                ? "bg-secondary text-secondary-foreground"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted"
                            )}
                          >
                            <Icon className="h-4 w-4" />
                            <span>{link.label}</span>
                          </Link>
                        )
                      })}
                    </div>

                    <div className="border-t border-border/50 my-2" />

                    <div className="flex flex-col gap-2">
                      <p className="text-sm font-medium text-muted-foreground px-2">Settings</p>
                      {mode === 'tracker' && (
                        <div className="flex items-center justify-between px-2 py-1">
                          <span className="text-sm">Day Start Hour</span>
                          <select
                            className="bg-background border border-border rounded text-xs px-2 py-1"
                            value={dayStartHour}
                            onChange={(e) => setDayStartHour(Number(e.target.value))}
                          >
                            {Array.from({ length: 24 }, (_, i) => (
                              <option key={i} value={i}>
                                {i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                      <Link to="/select-mode" onClick={() => setMobileOpen(false)}>
                        <Button variant="ghost" size="sm" className="w-full justify-start gap-2 px-2">
                          <LayoutDashboard className="h-4 w-4" />
                          Change Workspace
                        </Button>
                      </Link>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            )}

            {/* App Title */}
            <h1 className="text-lg font-semibold text-foreground">
              {mode === 'tracker' ? 'Daily Tracker' : 'Attendance Manager'}
            </h1>

            {/* Desktop: Day Start Selector */}
            {!isMobile && mode === 'tracker' && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground hidden sm:block">Start:</span>
                <select
                  className="bg-background border border-border rounded text-xs px-2 py-1"
                  value={dayStartHour}
                  onChange={(e) => setDayStartHour(Number(e.target.value))}
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>
                      {i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Desktop: Change Workspace Button */}
            {!isMobile && (
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
            )}
          </div>

          {/* Auth Button */}
          <div className="flex items-center gap-2">
            <ModeToggle />
            <AuthStatus />
          </div>
        </div>

        {/* Desktop: Navigation */}
        {!isMobile && (
          <div className="flex items-center py-2 gap-1">
            <nav className="flex items-center gap-1">
              {links.map((link) => {
                // Check if link is active (ignoring query params)
                const isActive = location.pathname === link.to || (link.label === 'Home' && location.pathname === '/');
                const Icon = link.icon;

                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-secondary text-secondary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </div>
    </motion.header>
  );
};

export default Header;
