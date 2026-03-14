import { Link } from "react-router-dom";
import { Shield, Mail, KeyRound, Bug, Brain, BarChart3, Terminal, AlertTriangle } from "lucide-react";
import GridBackground from "@/components/GridBackground";
import GlassCard from "@/components/GlassCard";
import GlowButton from "@/components/GlowButton";

const features = [
  { icon: Mail, title: "Phishing Simulation Engine", desc: "Launch realistic phishing campaigns to evaluate employee awareness.", glow: "blue" as const },
  { icon: KeyRound, title: "Credential Harvest Simulation", desc: "Create controlled login page simulations to measure credential exposure risk.", glow: "purple" as const },
  { icon: Bug, title: "Malware Attachment Simulation", desc: "Test employee response to suspicious file downloads.", glow: "cyan" as const },
  { icon: Brain, title: "Behavioral Risk Scoring", desc: "AI-powered analysis to identify vulnerable users and departments.", glow: "purple" as const },
  { icon: BarChart3, title: "Security Analytics Dashboard", desc: "Visualize attack results and risk levels across teams.", glow: "blue" as const },
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 glass-strong">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg font-display">AttackSimulator</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            {["Docs", "SDK", "Community", "Pricing"].map((item) => (
              <a key={item} href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{item}</a>
            ))}
          </div>
          <Link to="/login">
            <GlowButton size="sm">Start Simulation</GlowButton>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center pt-16">
        <GridBackground />

        {/* Floating panels */}
        <div className="absolute inset-0 z-10 overflow-hidden pointer-events-none">
          <div className="absolute top-32 left-[8%] animate-float opacity-60">
            <div className="glass rounded-lg p-3 w-56 text-xs font-mono">
              <div className="flex items-center gap-2 mb-2 text-primary">
                <Terminal className="h-3 w-3" /> <span className="font-semibold">attack.log</span>
              </div>
              <div className="text-muted-foreground space-y-0.5">
                <p>[14:32] EMAIL_OPEN usr:j.smith</p>
                <p>[14:33] <span className="text-destructive">LINK_CLICK</span> usr:m.jones</p>
                <p>[14:34] <span className="text-green-400">REPORTED</span> usr:r.davis</p>
              </div>
            </div>
          </div>
          <div className="absolute top-48 right-[10%] animate-float-delayed opacity-50">
            <div className="glass rounded-lg p-3 w-52 text-xs">
              <div className="flex items-center gap-2 mb-2 text-destructive">
                <AlertTriangle className="h-3 w-3" /> <span className="font-semibold">Security Alert</span>
              </div>
              <p className="text-muted-foreground">Credential attempt detected from Finance dept.</p>
            </div>
          </div>
          <div className="absolute bottom-40 left-[15%] animate-float-delayed opacity-50">
            <div className="glass rounded-lg p-3 w-48 text-xs">
              <div className="flex items-center gap-2 mb-2 text-secondary">
                <Mail className="h-3 w-3" /> <span className="font-semibold">Phishing Preview</span>
              </div>
              <p className="text-muted-foreground">Subject: Urgent Invoice #4821</p>
              <p className="text-muted-foreground mt-1 truncate">From: accounts@...</p>
            </div>
          </div>
          <div className="absolute bottom-52 right-[12%] animate-float opacity-40">
            <div className="glass rounded-lg p-3 w-44 text-xs">
              <p className="text-primary font-semibold mb-1">Click Rate</p>
              <p className="text-2xl font-bold font-display">23.4%</p>
              <p className="text-destructive text-[10px]">↑ 5.2% from last campaign</p>
            </div>
          </div>
        </div>

        {/* Hero content */}
        <div className="relative z-20 text-center max-w-3xl mx-auto px-6">
          <h1 className="text-5xl md:text-7xl font-extrabold font-display leading-tight tracking-tight">
            Simulate Attacks.{" "}
            <span className="text-primary text-glow-blue">Strengthen Defenses.</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            A powerful cybersecurity simulation platform that helps organizations train employees, detect behavioral risks, and strengthen security awareness through realistic phishing and attack simulations.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Link to="/login/admin">
              <GlowButton size="lg">Admin Dashboard</GlowButton>
            </Link>
            <Link to="/login/user">
              <GlowButton variant="outline" size="lg" glowColor="purple" className="border-border text-foreground hover:text-accent-foreground">
                Employee Portal
              </GlowButton>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="relative z-20 max-w-6xl mx-auto px-6 py-24">
        <h2 className="text-3xl font-bold font-display text-center mb-4">Platform Capabilities</h2>
        <p className="text-muted-foreground text-center mb-12 max-w-xl mx-auto">
          Everything your security team needs to run controlled cyber attack simulations.
        </p>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <GlassCard key={f.title} glow={f.glow} className="group">
              <div className="p-2 rounded-lg bg-primary/10 w-fit mb-4 group-hover:bg-primary/20 transition-colors">
                <f.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold font-display text-lg mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-20 border-t border-border py-8">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between text-sm text-muted-foreground">
          <span>© 2026 AttackSimulator. All rights reserved.</span>
          <div className="flex gap-6">
            <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
            <a href="#" className="hover:text-foreground transition-colors">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
