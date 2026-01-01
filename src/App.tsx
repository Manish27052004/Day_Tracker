import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { UserPreferencesProvider } from '@/contexts/UserPreferencesContext';
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
import MatrixDashboard from "@/features/matrix/MatrixDashboard";

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
    // return <Navigate to="/login" state={{ from: location }} replace />;
    // FOR TESTING: BYPASS AUTH
    return <>{children}</>;
  }

  return <>{children}</>;
};

const RootRedirect = () => {
  const mode = localStorage.getItem('selected_mode');
  if (mode === 'all') return <Navigate to="/all/tracker" replace />;
  if (mode === 'tracker') return <Navigate to="/tracker" replace />;
  if (mode === 'attendance') return <Navigate to="/attendance" replace />;
  return <Navigate to="/select-mode" replace />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <UserPreferencesProvider>
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
                      <RootRedirect />
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
                  <Route path="/tracker/matrix" element={<MatrixDashboard />} />
                  <Route path="/tracker/analytics" element={<Analytics />} />
                  <Route path="/attendance" element={<Attendance />} />

                  {/* 'All' Mode Views */}
                  <Route path="/all">
                    <Route path="tracker" element={<Index />} />
                    <Route path="tracker/matrix" element={<MatrixDashboard />} />
                    <Route path="tracker/analytics" element={<Analytics />} />
                    <Route path="attendance" element={<Attendance />} />
                    <Route index element={<Navigate to="tracker" replace />} />
                  </Route>

                  {/* Fallback for legacy analytics link if any */}
                  <Route path="/analytics" element={<Navigate to="/tracker/analytics" replace />} />
                </Route>

                {/* Catch-all */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </PersistenceWrapper>
          </BrowserRouter>
        </TooltipProvider>
      </UserPreferencesProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
