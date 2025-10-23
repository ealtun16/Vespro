import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { I18nProvider } from "@/lib/i18n";
import { AuthProvider, useAuth } from "@/contexts/auth-context";
import Layout from "@/components/layout/layout";
import Dashboard from "@/pages/dashboard";
import TankAnalysis from "@/pages/tank-analysis";
import Chat from "@/pages/chat";
import Reports from "@/pages/reports";
import SettingsPage from "@/pages/settings";
import LoginPage from "@/pages/login";
import NotFound from "@/pages/not-found";

// Protected Route wrapper
function ProtectedRoute({ component: Component }: { component: () => JSX.Element }) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    setLocation('/login');
    return null;
  }

  return <Component />;
}

function Router() {
  const { user, isLoading } = useAuth();

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If user is logged in, show the main app
  if (user) {
    return (
      <Layout>
        <Switch>
          <Route path="/login">
            <Redirect to="/" />
          </Route>
          <Route path="/" component={Dashboard} />
          <Route path="/tank-analysis" component={TankAnalysis} />
          <Route path="/chat" component={Chat} />
          <Route path="/reports" component={Reports} />
          <Route path="/settings" component={SettingsPage} />
          <Route component={NotFound} />
        </Switch>
      </Layout>
    );
  }

  // If user is not logged in, show only login page
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route>
        <Redirect to="/login" />
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <I18nProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </I18nProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
