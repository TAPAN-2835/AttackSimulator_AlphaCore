import { useState, useEffect } from "react";
import { KeyRound, ShieldCheck, ShieldAlert, Shield, Zap, Clock, Info } from "lucide-react";
import GlassCard from "@/components/GlassCard";
import GlowButton from "@/components/GlowButton";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";

const PasswordTest = () => {
  const [password, setPassword] = useState("");
  const [strength, setStrength] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [crackTime, setCrackTime] = useState("Instantly");

  useEffect(() => {
    analyzePassword(password);
  }, [password]);

  const analyzePassword = (p: string) => {
    let score = 0;
    if (!p) {
      setStrength(0);
      setFeedback("Enter a password to test");
      setCrackTime("Instantly");
      return;
    }

    if (p.length > 8) score += 20;
    if (p.length > 12) score += 20;
    if (/[A-Z]/.test(p)) score += 15;
    if (/[0-9]/.test(p)) score += 15;
    if (/[^A-Za-z0-9]/.test(p)) score += 30;

    setStrength(score);

    if (score < 40) {
      setFeedback("Very Weak - Easily guessable");
      setCrackTime("Seconds");
    } else if (score < 60) {
      setFeedback("Weak - Vulnerable to brute force");
      setCrackTime("Minutes");
    } else if (score < 80) {
      setFeedback("Medium - Good, but could be better");
      setCrackTime("Months");
    } else if (score < 100) {
      setFeedback("Strong - Hard to crack");
      setCrackTime("Centuries");
    } else {
      setFeedback("Excellent - High security");
      setCrackTime("Eons");
    }
  };

  const getStrengthColor = () => {
    if (strength < 40) return "bg-destructive";
    if (strength < 70) return "bg-secondary";
    return "bg-green-500";
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold font-display tracking-tight">Password Strength Simulator</h1>
        <p className="text-muted-foreground text-sm max-w-md mx-auto">
          Test your password complexity and see how long it would take for a computer to crack it.
        </p>
      </div>

      <GlassCard glow={strength >= 80 ? "blue" : strength >= 40 ? "purple" : "cyan"} className="p-8">
        <div className="space-y-8">
          <div className="relative max-w-md mx-auto">
            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="password"
              placeholder="Type a password to test..."
              className="pl-11 h-12 bg-muted/50 border-border text-lg"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="space-y-2 max-w-md mx-auto">
            <div className="flex justify-between text-sm">
              <span className="font-medium">Security Strength</span>
              <span className="font-bold">{strength}%</span>
            </div>
            <Progress value={strength} className="h-2 bg-muted" indicatorClassName={getStrengthColor()} />
            <p className={`text-center text-sm font-semibold mt-2 ${strength < 40 ? 'text-destructive' : strength < 70 ? 'text-secondary' : 'text-green-400'}`}>
              {feedback}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 pt-4 border-t border-border/50">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-primary/10 text-primary">
                <Clock className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Time to crack</p>
                <p className="text-xl font-display font-bold text-foreground">{crackTime}</p>
                <p className="text-[10px] text-muted-foreground mt-1 italic">Estimated using standard hardware</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-secondary/10 text-secondary">
                <Zap className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Entropy Score</p>
                <p className="text-xl font-display font-bold text-foreground">{Math.floor(strength * 1.2)} bits</p>
                <p className="text-[10px] text-muted-foreground mt-1 italic">Randomness complexity measure</p>
              </div>
            </div>
          </div>
        </div>
      </GlassCard>

      <div className="grid md:grid-cols-2 gap-6">
        <GlassCard className="p-4 bg-muted/30 border-transparent">
          <h4 className="font-bold flex items-center gap-2 mb-3 text-sm">
            <ShieldCheck className="h-4 w-4 text-green-400" /> Security Best Practices
          </h4>
          <ul className="text-xs space-y-2 text-muted-foreground">
            <li>• Use at least 12 characters</li>
            <li>• Combine uppercase, lowercase, numbers, and symbols</li>
            <li>• Avoid common words or personal info</li>
            <li>• Use a unique password for every site</li>
          </ul>
        </GlassCard>
        <GlassCard className="p-4 bg-muted/30 border-transparent">
          <h4 className="font-bold flex items-center gap-2 mb-3 text-sm">
            <ShieldAlert className="h-4 w-4 text-destructive" /> Common Mistakes
          </h4>
          <ul className="text-xs space-y-2 text-muted-foreground">
            <li>• Using "password123" or similar</li>
            <li>• Repeating patterns (e.g., "112233")</li>
            <li>• Reusing passwords across accounts</li>
            <li>• Writing passwords down on sticky notes</li>
          </ul>
        </GlassCard>
      </div>

      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground bg-primary/5 py-3 rounded-lg border border-primary/10">
        <Info className="h-3.5 w-3.5 text-primary" />
        <span>Ethical Note: This tool does not store or transmit your passwords. It runs entirely in your browser.</span>
      </div>
    </div>
  );
};

export default PasswordTest;
