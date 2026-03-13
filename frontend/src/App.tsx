import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import DashboardLayout from "@/components/DashboardLayout";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Campaigns from "./pages/Campaigns";
import Simulations from "./pages/Simulations";
import Analytics from "./pages/Analytics";
import RiskScoring from "./pages/RiskScoring";
import SystemLogs from "./pages/SystemLogs";
import UserGroups from "./pages/UserGroups";
import Templates from "./pages/Templates";
import PasswordTest from "./pages/PasswordTest";
import ResponseDrills from "./pages/ResponseDrills";
import EmployeeDashboard from "./pages/EmployeeDashboard";
import NotFound from "./pages/NotFound";

import { useState, createContext, useContext } from "react";

const queryClient = new QueryClient();

export type UserRole = "admin" | "employee";

interface RoleContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export const useRole = () => {
  const context = useContext(RoleContext);
  if (!context) throw new Error("useRole must be used within a RoleProvider");
  return context;
};

const DashboardPage = ({ children, requiredRole }: { children: React.ReactNode, requiredRole?: UserRole }) => {
  const { role } = useRole();
  
  if (requiredRole && role !== requiredRole) {
    return <NotFound />;
  }
  
  return <DashboardLayout>{children}</DashboardLayout>
};

const App = () => {
  const [role, setRole] = useState<UserRole>("admin");

  return (
    <QueryClientProvider client={queryClient}>
      <RoleContext.Provider value={{ role, setRole }}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              
              {/* Admin Routes */}
              <Route path="/dashboard" element={<DashboardPage requiredRole="admin"><Dashboard /></DashboardPage>} />
              <Route path="/dashboard/campaigns" element={<DashboardPage requiredRole="admin"><Campaigns /></DashboardPage>} />
              <Route path="/dashboard/simulations" element={<DashboardPage requiredRole="admin"><Simulations /></DashboardPage>} />
              <Route path="/dashboard/analytics" element={<DashboardPage requiredRole="admin"><Analytics /></DashboardPage>} />
              <Route path="/dashboard/risk-scoring" element={<DashboardPage requiredRole="admin"><RiskScoring /></DashboardPage>} />
              <Route path="/dashboard/logs" element={<DashboardPage requiredRole="admin"><SystemLogs /></DashboardPage>} />
              <Route path="/dashboard/user-groups" element={<DashboardPage requiredRole="admin"><UserGroups /></DashboardPage>} />
              <Route path="/dashboard/templates" element={<DashboardPage requiredRole="admin"><Templates /></DashboardPage>} />
              
              {/* Shared/Utility Routes */}
              <Route path="/dashboard/password-test" element={<DashboardPage><PasswordTest /></DashboardPage>} />
              <Route path="/dashboard/drills" element={<DashboardPage><ResponseDrills /></DashboardPage>} />
              
              {/* Employee Routes */}
              <Route path="/dashboard/learning-portal" element={<DashboardPage requiredRole="employee"><EmployeeDashboard /></DashboardPage>} />
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </RoleContext.Provider>
    </QueryClientProvider>
  );
};

export default App;
