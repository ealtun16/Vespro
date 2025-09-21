import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { I18nProvider } from "@/lib/i18n";
import Layout from "@/components/layout/layout";
import Dashboard from "@/pages/dashboard";
import ImportData from "@/pages/import-data";
import TankSpecifications from "@/pages/tank-specifications";
import CostAnalysis from "@/pages/cost-analysis";
import Reports from "@/pages/reports";
import SettingsPage from "@/pages/settings";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/import" component={ImportData} />
        <Route path="/tank-specifications" component={TankSpecifications} />
        <Route path="/cost-analysis" component={CostAnalysis} />
        <Route path="/reports" component={Reports} />
        <Route path="/settings" component={SettingsPage} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}

export default App;
