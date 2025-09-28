import { Link, useLocation } from "wouter";
import { 
  BarChart3, 
  Settings, 
  FileSpreadsheet, 
  LayoutDashboard,
  Factory
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

export default function Sidebar() {
  const [location] = useLocation();
  const { t } = useTranslation();
  
  const navItems = [
    { href: "/", label: t('nav.dashboard'), icon: LayoutDashboard },
    { href: "/tank-specifications", label: t('nav.tankSpecs'), icon: Factory },
    { href: "/reports", label: t('nav.reports'), icon: FileSpreadsheet },
  ];

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
                    data-testid={`nav-${item.href.replace(/\//g, '').replace(/^$/, 'dashboard')}`}
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
