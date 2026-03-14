import { Link, NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Target, Play, Users, Mail, BarChart3,
  ShieldAlert, ScrollText, Settings, Menu, X, Shield, KeyRound, GraduationCap,
  User, ShieldCheck
} from "lucide-react";
import { useState } from "react";
import { useRole } from "@/App";

import { Badge } from "@/components/ui/badge";
import ThemeToggle from "./ThemeToggle";

const navItems = [
  { label: "Learning Portal", path: "/dashboard/learning-portal", icon: GraduationCap, role: "employee" },
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard, role: "admin" },
  { label: "Analytics", path: "/dashboard/analytics", icon: BarChart3, role: "admin" },
  { label: "Risk Scoring", path: "/dashboard/risk-scoring", icon: ShieldAlert, role: "admin" },
  { label: "System Logs", path: "/dashboard/logs", icon: ScrollText, role: "admin" },
  { label: "Campaigns", path: "/dashboard/campaigns", icon: Target, role: "admin" },
  { label: "Simulations", path: "/dashboard/simulations", icon: Play, role: "admin" },
  { label: "User Groups", path: "/dashboard/user-groups", icon: Users, role: "admin" },
  { label: "Templates", path: "/dashboard/templates", icon: Mail, role: "admin" },
  { label: "Password Test", path: "/dashboard/password-test", icon: KeyRound, role: "employee" },
  { label: "Response Drills", path: "/dashboard/drills", icon: Shield, role: "employee" },
];

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { role, setRole } = useRole();
  const location = useLocation();

  const filteredNavItems = navItems.filter(item => !item.role || item.role === role);

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-full z-40 glass-strong transition-all duration-300 flex flex-col",
          sidebarOpen ? "w-60" : "w-16"
        )}
      >
        <Link to="/" className="flex items-center gap-2 p-4 border-b border-border hover:opacity-80 transition-opacity">
          <Shield className="h-6 w-6 text-primary shrink-0" />
          {sidebarOpen && <span className="font-bold font-display text-foreground">AttackSim</span>}
        </Link>
        <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto">
          {filteredNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/dashboard"}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all duration-200",
                  isActive
                    ? "bg-primary/15 text-primary glow-blue font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )
              }
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {sidebarOpen && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 px-4 py-2 text-sm text-muted-foreground">
            <Settings className="h-4 w-4 shrink-0" />
            {sidebarOpen && <span>Settings</span>}
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className={cn("flex-1 transition-all duration-300", sidebarOpen ? "ml-60" : "ml-16")}>
        <header className="h-14 glass-strong border-b border-border flex items-center px-4 sticky top-0 z-30">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-muted-foreground hover:text-foreground transition-colors">
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <div className="ml-auto flex items-center gap-3">
            <Badge variant="outline" className={cn(
              "text-[10px] font-bold px-2 py-0 border-primary/30",
              role === "admin" ? "text-primary" : "text-secondary"
            )}>
              {role.toUpperCase()} MODE
            </Badge>
            <ThemeToggle />
          </div>
        </header>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
};

export default DashboardLayout;
