import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { StorageProvider } from "@/contexts/StorageContext";
import { UserPreferencesProvider } from '@/contexts/UserPreferencesContext';
import { useEffect } from "react";
import { useBackgroundReminders } from "@/hooks/useBackgroundReminders";
import { ThemeProvider } from "@/components/theme-provider";

// Pages
import Index from "./pages/Index";
import Analytics from "./pages/Analytics";
import NotFound from "./pages/NotFound";
import DebugPage from "./DebugPage";
import Login from "./pages/Login";
import Register from "./pages/Register";
// ModeSelection and Attendance removed for simplicity
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
  return <Navigate to="/tracker" replace />;
};

const App = () => {
  useBackgroundReminders();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <AuthProvider>
          <StorageProvider>
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



                      {/* Layout Routes (Tracker Only) */}
                      <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
                        <Route path="/tracker" element={<Index />} />
                        <Route path="/tracker/matrix" element={<MatrixDashboard />} />
                        <Route path="/tracker/analytics" element={<Analytics />} />

                        {/* Fallback for legacy analytics link */}
                        <Route path="/analytics" element={<Navigate to="/tracker/analytics" replace />} />
                      </Route>

                      {/* Catch-all */}
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </PersistenceWrapper>
                </BrowserRouter>
              </TooltipProvider>
            </UserPreferencesProvider>
          </StorageProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider >
  );
};

export default App;
