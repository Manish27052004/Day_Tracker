import { motion } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import AuthStatus from './AuthStatus';


const Header = () => {
  const location = useLocation();

  const links = [
    { to: '/', label: 'Home', icon: LayoutDashboard },
    { to: '/analytics', label: 'Analytics', icon: BarChart3 },
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
          {/* App Title */}
          <h1 className="text-lg font-semibold text-foreground hidden sm:block">
            Daily Tracker
          </h1>

          {/* Navigation */}
          <nav className="flex items-center justify-center gap-2 mx-auto sm:mx-0">
            {links.map((link) => {
              const isActive = location.pathname === link.to;
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
      </div>
    </motion.header>
  );
};

export default Header;
