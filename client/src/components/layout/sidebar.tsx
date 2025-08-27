import { Link, useLocation } from "wouter";
import { 
  BarChart3, 
  Upload, 
  Settings, 
  FileSpreadsheet, 
  LayoutDashboard,
  Factory
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/import", label: "Import Data", icon: Upload },
  { href: "/tank-specifications", label: "Tank Specifications", icon: Factory },
  { href: "/cost-analysis", label: "Cost Analysis", icon: BarChart3 },
  { href: "/reports", label: "Reports", icon: FileSpreadsheet },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  const [location] = useLocation();

  return (
    <aside className="w-64 bg-sidebar border-r border-sidebar-border card-shadow">
      <nav className="mt-8">
        <div className="px-4">
          <ul className="space-y-2">
            {navItems.map((item) => {
              const isActive = location === item.href;
              return (
                <li key={item.href}>
                  <Link 
                    href={item.href}
                    className={cn(
                      "nav-item flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors",
                      isActive
                        ? "nav-item-active bg-sidebar-primary text-sidebar-primary-foreground"
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    )}
                    data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
                  >
                    <item.icon className="mr-3 h-4 w-4" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>
    </aside>
  );
}
