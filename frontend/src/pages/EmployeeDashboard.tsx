import { Shield, ShieldAlert, ShieldCheck, GraduationCap, ArrowRight, MousePointerClick, KeyRound, Bug, Info } from "lucide-react";
import GlassCard from "@/components/GlassCard";
import VirusTotalCheck from "@/components/VirusTotalCheck";
import ReportPhishingForm from "@/components/ReportPhishingForm";
import GlowButton from "@/components/GlowButton";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

const EmployeeDashboard = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display">Employee Learning Portal</h1>
          <p className="text-muted-foreground text-sm mt-1">Personal security awareness & training</p>
        </div>
        <div className="px-4 py-2 rounded-lg glass-strong flex items-center gap-3 border border-primary/20">
          <div className="p-2 rounded-full bg-destructive/10 text-destructive">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase font-bold">Personal Risk Level</p>
            <p className="text-sm font-bold text-destructive">HIGH RISK (42/100)</p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Why I'm here card */}
        <GlassCard glow="cyan" className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-2 text-primary">
            <ShieldAlert className="h-5 w-5" />
            <h3 className="font-bold font-display">Last Simulation Feedback</h3>
          </div>
          <p className="text-sm border-l-2 border-primary/30 pl-4 py-1 text-muted-foreground">
            You recently interacted with a simulated phishing attack titled <span className="text-foreground font-semibold">"Urgent Invoice #4821"</span>.
          </p>
          <div className="grid sm:grid-cols-2 gap-4 pt-2">
            <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/10 space-y-1">
              <div className="flex items-center gap-2 text-destructive">
                <MousePointerClick className="h-4 w-4" />
                <span className="text-xs font-bold uppercase">Action Detected</span>
              </div>
              <p className="text-sm font-medium">You clicked the link</p>
            </div>
            <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/10 space-y-1">
              <div className="flex items-center gap-2 text-destructive">
                <KeyRound className="h-4 w-4" />
                <span className="text-xs font-bold uppercase">Critical Failure</span>
              </div>
              <p className="text-sm font-medium">Credentials were entered</p>
            </div>
          </div>
          
          <div className="pt-4 space-y-3">
            <h4 className="text-sm font-bold flex items-center gap-2">
              <Info className="h-4 w-4 text-primary" /> Warning Signs You Missed
            </h4>
            <ul className="grid sm:grid-cols-2 gap-2">
              {[
                "Sender domain was mismatching official records",
                "The email created an artificial sense of urgency",
                "The link destination didn't match the button text",
                "Request for sensitive login info via email"
              ].map((sign, i) => (
                <li key={i} className="flex gap-2 text-xs text-muted-foreground bg-muted/30 p-2 rounded border border-border/50">
                  <span className="text-primary font-bold">•</span> {sign}
                </li>
              ))}
            </ul>
          </div>
        </GlassCard>

        <div className="space-y-6">
          {/* Report Phishing Action */}
          <ReportPhishingForm campaignId={1} />
          
          {/* Check suspicious link (VirusTotal) */}
          <VirusTotalCheck
            title="Check a suspicious link"
            glow="cyan"
          />
        </div>

        {/* Training Card */}
        <GlassCard glow="purple" className="flex flex-col lg:col-span-3">
          <div className="flex items-center gap-2 text-secondary mb-4">
            <GraduationCap className="h-5 w-5" />
            <h3 className="font-bold font-display">Required Training</h3>
          </div>
          <div className="grid md:grid-cols-3 gap-4 flex-1">
            {[
              { title: "Phishing 101", desc: "Spotting common red flags", prog: 0 },
              { title: "Credential Security", desc: "Protecting your corporate identity", prog: 0 },
              { title: "Report-a-Phish", desc: "Using the IT reporting button", prog: 65 }
            ].map((t) => (
              <div key={t.title} className="bg-muted/30 p-3 rounded-xl border border-border/50 space-y-2">
                <div className="flex justify-between items-center">
                  <p className="text-sm font-bold">{t.title}</p>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
                <Progress value={t.prog} className="h-1 bg-muted" />
                <p className="text-[10px] text-muted-foreground">{t.desc}</p>
              </div>
            ))}
          </div>
          <GlowButton glowColor="purple" size="sm" className="w-full mt-6">Continue All Training</GlowButton>
        </GlassCard>
      </div>

      {/* Security Quiz */}
      <GlassCard glow="blue">
        <div className="flex flex-col md:flex-row gap-6 items-center">
          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-2 text-primary">
              <ShieldCheck className="h-5 w-5" />
              <h3 className="font-bold font-display">Quick Security Quiz</h3>
            </div>
            <p className="text-lg font-medium">Which of these is the most reliable way to verify a suspicious internal email?</p>
            <div className="grid gap-2">
              {[
                "Check for the official company logo in the email",
                "Reply to the email and ask if it's real",
                "Contact the sender via an official, verified channel (e.g., Slack or Phone)",
                "Click the link to see if it asks for a password"
              ].map((opt, i) => (
                <button key={i} className="text-left p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-sm group">
                  <span className="mr-3 text-muted-foreground group-hover:text-primary font-bold font-mono">{String.fromCharCode(65 + i)}.</span>
                  {opt}
                </button>
              ))}
            </div>
          </div>
          <div className="w-full md:w-64 glass p-6 rounded-2xl bg-primary/5 border-primary/20 text-center space-y-4">
            <div className="relative inline-block">
              <svg className="h-32 w-32 -rotate-90">
                <circle cx="64" cy="64" r="60" fill="transparent" stroke="currentColor" strokeWidth="8" className="text-muted/30" />
                <circle cx="64" cy="64" r="60" fill="transparent" stroke="currentColor" strokeWidth="8" className="text-primary" strokeDasharray={377} strokeDashoffset={377 - (377 * 0.42)} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-3xl font-bold font-display text-primary">42%</p>
                <p className="text-[10px] text-muted-foreground uppercase font-bold">Score</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Answer 3 more quizzes to improve your risk score.</p>
          </div>
        </div>
      </GlassCard>
    </div>
  );
};

export default EmployeeDashboard;
