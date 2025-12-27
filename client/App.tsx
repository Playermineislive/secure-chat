import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { EncryptionProvider } from "./contexts/EncryptionContext";
import { TranslationProvider } from "./contexts/TranslationContext";
import { ContactProvider } from "./contexts/ContactContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import AppEntryPoint from "./components/AppEntryPoint";
import ContactsList from "./pages/ContactsList";
import GroupChat from "./pages/GroupChat";
import NotFound from "./pages/NotFound";
import ErrorBoundary from "./components/ErrorBoundary";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <EncryptionProvider>
          <TranslationProvider>
            <ContactProvider>
              <ThemeProvider>
                <TooltipProvider>
                  <Toaster />
                  <Sonner />
                  <BrowserRouter>
                    <Routes>
                      <Route path="/" element={<AppEntryPoint />} />
                      <Route
                        path="/contacts"
                        element={
                          <ContactsList
                            onSelectContact={() => {}}
                            onCreateGroup={() => {}}
                            onBack={() => {}}
                          />
                        }
                      />
                      <Route path="/invite/:code" element={<AppEntryPoint />} />
                      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </BrowserRouter>
                </TooltipProvider>
              </ThemeProvider>
            </ContactProvider>
          </TranslationProvider>
        </EncryptionProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

// Proper root management to prevent duplicate createRoot calls
const container = document.getElementById("root")!;

// Check if root already exists (for HMR compatibility)
let root = (container as any)._reactRoot;

if (!root) {
  root = createRoot(container);
  (container as any)._reactRoot = root;
}

root.render(<App />);
