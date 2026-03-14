import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Shield } from "lucide-react";
import GridBackground from "@/components/GridBackground";
import GlowButton from "@/components/GlowButton";
import { Input } from "@/components/ui/input";
import { useRole } from "@/App";
import { login as apiLogin, setToken } from "@/lib/api";
import { toast } from "sonner";

const Login = ({ overrideRole }: { overrideRole?: "admin" | "employee" }) => {
  const navigate = useNavigate();
  const { setRole } = useRole();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleDemoLogin = (role: "admin" | "employee") => {
    setRole(role);
    navigate(role === "admin" ? "/dashboard" : "/dashboard/learning-portal");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    try {
      const res = await apiLogin({ email, password });
      const userRole = res.role === "admin" ? "admin" : "employee";
      
      // Enforce role if accessing via specific login page
      if (overrideRole && userRole !== overrideRole) {
        toast.error(`This account is registered as ${userRole}. Please use the correct login page.`);
        setLoading(false);
        return;
      }

      setToken(res.access_token);
      setRole(userRole);
      toast.success("Logged in successfully");
      navigate(userRole === "admin" ? "/dashboard" : "/dashboard/learning-portal");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Login failed";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative">
      <GridBackground />
      <div className="relative z-20 w-full max-w-md px-6">
        <div className="glass-strong rounded-xl p-8">
          <div className="flex items-center justify-center gap-2 mb-8">
            <Shield className="h-7 w-7 text-primary" />
            <span className="text-xl font-bold font-display">AttackSimulator</span>
          </div>
          <h1 className="text-2xl font-bold font-display text-center mb-2">
            {overrideRole === "admin" ? "Admin Login" : overrideRole === "employee" ? "Employee Login" : "Welcome back"}
          </h1>
          <p className="text-muted-foreground text-sm text-center mb-6">
            {overrideRole === "admin" ? "Manage campaigns and analytics" : overrideRole === "employee" ? "Access your learning portal" : "Sign in to your account"}
          </p>
          <form className="space-y-4" onSubmit={handleLogin}>
            <div>
              <label className="text-sm text-muted-foreground block mb-1.5">Email</label>
              <Input
                type="email"
                placeholder="you@organization.com"
                className="bg-muted/50 border-border focus:ring-primary focus:border-primary"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground block mb-1.5">Password</label>
              <Input
                type="password"
                placeholder="••••••••"
                className="bg-muted/50 border-border focus:ring-primary focus:border-primary"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <GlowButton className="w-full" type="submit" disabled={loading}>
              {loading ? "Signing in…" : "Sign In"}
            </GlowButton>
          </form>

          {!overrideRole && (
            <>
              <div className="relative my-8 text-center text-xs text-muted-foreground uppercase">
                <span className="bg-background-alt px-2 relative z-10">Quick Demo Access</span>
                <div className="absolute top-1/2 left-0 w-full h-px bg-border/50" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <GlowButton variant="outline" glowColor="blue" className="w-full text-xs" onClick={() => handleDemoLogin("admin")}>
                  Demo: Admin
                </GlowButton>
                <GlowButton variant="outline" glowColor="purple" className="w-full text-xs" onClick={() => handleDemoLogin("employee")}>
                  Demo: Employee
                </GlowButton>
              </div>
            </>
          )}

          <div className="mt-6 text-center">
            <a href="#" className="text-xs text-primary hover:underline">Forgot password?</a>
          </div>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Don't have an account? <Link to="/signup" className="text-primary hover:underline">Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
