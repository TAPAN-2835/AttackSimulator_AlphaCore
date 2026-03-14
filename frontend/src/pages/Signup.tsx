import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Shield } from "lucide-react";
import GridBackground from "@/components/GridBackground";
import GlowButton from "@/components/GlowButton";
import { Input } from "@/components/ui/input";
import { useRole } from "@/App";
import { register as apiRegister } from "@/lib/api";
import { toast } from "sonner";

const Signup = () => {
  const navigate = useNavigate();
  const { setRole } = useRole();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleDemoLogin = (role: "admin" | "employee") => {
    setRole(role);
    navigate(role === "admin" ? "/dashboard" : "/dashboard/learning-portal");
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      await apiRegister({ name, email, password });
      toast.success("Account created! Please log in.");
      navigate("/login");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Registration failed";
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
          <h1 className="text-2xl font-bold font-display text-center mb-6">Create your account</h1>
          <form className="space-y-4" onSubmit={handleSignup}>
            <div>
              <label className="text-sm text-muted-foreground block mb-1.5">Full Name</label>
              <Input placeholder="John Doe" className="bg-muted/50 border-border" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-muted-foreground block mb-1.5">Email</label>
              <Input type="email" placeholder="admin@organization.com" className="bg-muted/50 border-border" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-muted-foreground block mb-1.5">Password</label>
              <Input type="password" placeholder="••••••••" className="bg-muted/50 border-border" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-muted-foreground block mb-1.5">Confirm Password</label>
              <Input type="password" placeholder="••••••••" className="bg-muted/50 border-border" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            </div>
            <GlowButton className="w-full" type="submit" disabled={loading}>
              {loading ? "Creating…" : "Create Account"}
            </GlowButton>
          </form>

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

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account? <Link to="/login" className="text-primary hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
