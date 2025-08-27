import { Bell, User } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Header() {
  return (
    <header className="bg-card border-b border-border card-shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <h1 className="text-2xl font-bold text-primary" data-testid="logo-title">Vespro</h1>
              <p className="text-xs text-muted-foreground" data-testid="logo-subtitle">Industrial Tank Analysis</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" data-testid="button-notifications">
              <Bell className="h-5 w-5" />
            </Button>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <span className="text-primary-foreground text-sm font-medium" data-testid="text-user-initials">JD</span>
              </div>
              <span className="text-sm font-medium text-foreground" data-testid="text-username">John Doe</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
