import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

// Pages
import Index from "./pages/Index";
import Analytics from "./pages/Analytics";
import NotFound from "./pages/NotFound";
import DebugPage from "./DebugPage";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ModeSelection from "./pages/ModeSelection";
import Attendance from "./pages/Attendance";
import MainLayout from "./layouts/MainLayout";

const queryClient = new QueryClient();

// --- Components ---

// Route Persistence Component
const PersistenceWrapper = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();

  // 1. Save location on change (skip auth pages)
  useEffect(() => {
    if (
      location.pathname !== '/' &&
      location.pathname !== '/login' &&
      location.pathname !== '/register' &&
      location.pathname !== '/debug'
    ) {
      localStorage.setItem('last_visited_path', location.pathname);
    }
  }, [location]);

  // 2. Restore location: We only restore if we are hitting root AND authenticated
  // This logic is slightly tricky with the new flow. 
  // If user hits '/', we check auth. If auth, we might want to go to last visited OR select mode.
  // For now, let's keep it simple: If at root, let the ProtectedRoute logic handle it.

  return <>{children}</>;
};

// Protected Route Wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="h-screen w-full flex items-center justify-center bg-background">Loading...</div>;
  }

  if (!user) {
    // Redirect to login but save the attempted location
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

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
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/debug" element={<DebugPage />} />

              {/* Protected Routes */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Navigate to="/select-mode" replace />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/select-mode"
                element={
                  <ProtectedRoute>
                    <ModeSelection />
                  </ProtectedRoute>
                }
              />

              {/* Layout Routes (Tracker, Attendance, All) */}
              <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
                {/* Single App Views */}
                <Route path="/tracker" element={<Index />} />
                <Route path="/tracker/analytics" element={<Analytics />} />
                <Route path="/attendance" element={<Attendance />} />

                {/* 'All' Mode Views */}
                <Route path="/all">
                  <Route path="tracker" element={<Index />} />
                  <Route path="analytics" element={<Analytics />} />
                  <Route path="attendance" element={<Attendance />} />
                  <Route index element={<Navigate to="tracker" replace />} />
                </Route>

                {/* Fallback for legacy analytics link if any */}
                <Route path="/analytics" element={<Navigate to="/tracker/analytics" replace />} />
              </Route>

              {/* 
                  Legacy/Utility Routes - typically part of Tracker.
                  If someone visits /analytics directly, they get the layout wrapper.
                  We might want to force them into a mode? 
                  For now, leaving it under the generic layout wrapper is fine.
              */}

              {/* Catch-all */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </PersistenceWrapper>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
