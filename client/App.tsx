import "./global.css";
import { Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Loader2, AlertCircle } from "lucide-react";

// UI Components
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";

// Contexts
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { EncryptionProvider } from "./contexts/EncryptionContext";
import { TranslationProvider } from "./contexts/TranslationContext";
import { ContactProvider } from "./contexts/ContactContext";

// Lazy Load Pages (Performance Optimization)
// This splits the code into smaller chunks, loading pages only when needed.
const Index = lazy(() => import("./pages/Index"));
const ContactsList = lazy(() => import("./pages/ContactsList"));
const GroupChat = lazy(() => import("./pages/GroupChat"));
const NotFound = lazy(() => import("./pages/NotFound"));

// --- Configuration ---
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false, // Prevents aggressive refetching
      staleTime: 5 * 60 * 1000, // Data stays fresh for 5 minutes
    },
  },
});

// --- Helper Components ---

// 1. Loading Fallback
const PageLoader = () => (
  <div className="flex h-screen w-full items-center justify-center bg-background text-muted-foreground">
    <div className="flex flex-col items-center gap-2">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm font-medium">Loading secure environment...</p>
    </div>
  </div>
);

// 2. Error Boundary Fallback
const ErrorFallback = ({ error, resetErrorBoundary }: any) => (
  <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-destructive/5 p-4 text-center">
    <div className="rounded-full bg-destructive/10 p-4">
      <AlertCircle className="h-8 w-8 text-destructive" />
    </div>
    <h2 className="text-xl font-semibold">Something went wrong</h2>
    <p className="max-w-md text-sm text-muted-foreground">
      {error?.message || "An unexpected error occurred while rendering this page."}
    </p>
    <Button onClick={() => window.location.reload()} variant="outline">
      Reload Application
    </Button>
  </div>
);

// 3. Protected Route Wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <PageLoader />;

  if (!user) {
    // Redirect to login (Index) while saving the attempted URL
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

// --- Main App Component ---

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <EncryptionProvider>
          <TranslationProvider>
            <ContactProvider>
              <TooltipProvider>
                <BrowserRouter>
                  {/* Global UI Elements */}
                  <Toaster />
                  <Sonner position="top-center" />

                  {/* Route Definitions */}
                  <Suspense fallback={<PageLoader />}>
                    <Routes>
                      {/* Public Route: Login / Landing */}
                      <Route path="/" element={<Index />} />
                      
                      {/* Public Route: Invite Links */}
                      <Route path="/invite/:code" element={<Index />} />

                      {/* Protected Routes */}
                      <Route 
                        path="/contacts" 
                        element={
                          <ProtectedRoute>
                            {/* NOTE: In a real app, 'onSelectContact' etc. should not be passed 
                              from App.tsx. The page should use `useNavigate()` internally. 
                              I've kept them here to match your likely interface, but replaced 
                              dummies with console logs for debugging.
                            */}
                            <ContactsList 
                              onSelectContact={(contact) => console.log("Navigate to chat", contact)} 
                              onCreateGroup={() => console.log("Open create group modal")} 
                              onBack={() => window.history.back()} 
                            />
                          </ProtectedRoute>
                        } 
                      />

                      <Route 
                        path="/chat/:id" 
                        element={
                          <ProtectedRoute>
                            <GroupChat />
                          </ProtectedRoute>
                        } 
                      />

                      {/* 404 Catch-All */}
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Suspense>
                </BrowserRouter>
              </TooltipProvider>
            </ContactProvider>
          </TranslationProvider>
        </EncryptionProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

// Error Boundary Wrapper (Optional but recommended if you have 'react-error-boundary' installed)
// import { ErrorBoundary } from "react-error-boundary";
// const Root = () => (
//   <ErrorBoundary FallbackComponent={ErrorFallback}>
//     <App />
//   </ErrorBoundary>
// );

createRoot(document.getElementById("root")!).render(<App />);
