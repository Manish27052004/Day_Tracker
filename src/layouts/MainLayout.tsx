import { Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
// import { motion, AnimatePresence } from 'framer-motion'; // Removed for stability
import { CalendarClock, Users, LogOut, LayoutDashboard, BarChart3, Grid3X3, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import { ModeToggle } from "@/components/mode-toggle";
import { useIsMobile } from '@/hooks/use-mobile';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from '@/lib/utils';

const MainLayout = () => {
    // Simplified Layout: Just defaulting to Tracker links
    const links = [
        { to: '/tracker', label: 'Home', icon: LayoutDashboard },
        { to: '/tracker/analytics', label: 'Analytics', icon: BarChart3 },
        { to: '/tracker/matrix', label: 'Habit Matrix', icon: Grid3X3 }
    ];

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <Header />

            {/* Content Area */}
            <main className="flex-1 overflow-auto">
                <Outlet />
            </main>
        </div>
    );
};

export default MainLayout;
