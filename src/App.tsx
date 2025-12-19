import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Analytics from "./pages/Analytics";
import NotFound from "./pages/NotFound";
import DebugPage from "./DebugPage";

const queryClient = new QueryClient();

import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";

// Route Persistence Component
const PersistenceWrapper = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();

  // 1. Save location on change
  useEffect(() => {
    if (location.pathname !== '/' && location.pathname !== '/debug') {
      localStorage.setItem('last_visited_path', location.pathname);
    } else if (location.pathname === '/') {
      localStorage.setItem('last_visited_path', '/');
    }
  }, [location]);

  // 2. Restore location on mount
  useEffect(() => {
    const lastPath = localStorage.getItem('last_visited_path');
    if (lastPath && lastPath !== location.pathname && lastPath !== '/' && lastPath !== '/debug') {
      navigate(lastPath, { replace: true });
    }
  }, []); // Run once on mount

  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <PersistenceWrapper>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/debug" element={<DebugPage />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </PersistenceWrapper>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
