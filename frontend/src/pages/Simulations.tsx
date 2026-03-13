import { useState } from "react";
import { Mail, KeyRound, Bug, AlertTriangle, CheckCircle, X } from "lucide-react";
import GlassCard from "@/components/GlassCard";
import GlowButton from "@/components/GlowButton";
import { Input } from "@/components/ui/input";

const Simulations = () => {
  const [credSubmitted, setCredSubmitted] = useState(false);
  const [malwarePopup, setMalwarePopup] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display">Simulation Previews</h1>
        <p className="text-muted-foreground text-sm mt-1">Preview attack simulations before deploying</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Phishing Email */}
        <GlassCard glow="blue" className="space-y-3">
          <div className="flex items-center gap-2 text-primary">
            <Mail className="h-5 w-5" />
            <h3 className="font-semibold font-display">Phishing Email</h3>
          </div>
          <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>From: accounts@acme-billing.net</span>
              <span>10:32 AM</span>
            </div>
            <p className="font-semibold">Urgent: Invoice #4821 Requires Immediate Action</p>
            <p className="text-muted-foreground text-xs">Dear Employee, your latest invoice is overdue. Please review immediately to avoid penalties.</p>
            <a href="#" className="inline-block mt-2 text-xs text-primary underline" onClick={(e) => e.preventDefault()}>
              → Review Invoice Now
            </a>
          </div>
          <p className="text-xs text-muted-foreground italic">Simulated phishing email with suspicious link</p>
        </GlassCard>

        {/* Credential Harvest */}
        <GlassCard glow="purple" className="space-y-3">
          <div className="flex items-center gap-2 text-secondary">
            <KeyRound className="h-5 w-5" />
            <h3 className="font-semibold font-display">Credential Harvest</h3>
          </div>
          {!credSubmitted ? (
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <p className="text-sm font-semibold text-center">Sign in to continue</p>
              <Input placeholder="Username" className="bg-background/50 border-border text-sm h-9" />
              <Input type="password" placeholder="Password" className="bg-background/50 border-border text-sm h-9" />
              <GlowButton size="sm" glowColor="purple" className="w-full" onClick={() => setCredSubmitted(true)}>
                Sign In
              </GlowButton>
            </div>
          ) : (
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 text-center space-y-2">
              <CheckCircle className="h-8 w-8 text-green-400 mx-auto" />
              <p className="text-sm font-semibold text-green-400">Training Simulation</p>
              <p className="text-xs text-muted-foreground">This was a security awareness exercise. Never enter credentials on unfamiliar pages.</p>
              <button className="text-xs text-primary hover:underline" onClick={() => setCredSubmitted(false)}>Reset</button>
            </div>
          )}
        </GlassCard>

        {/* Malware Download */}
        <GlassCard glow="cyan" className="space-y-3">
          <div className="flex items-center gap-2 text-accent">
            <Bug className="h-5 w-5" />
            <h3 className="font-semibold font-display">Malware Download</h3>
          </div>
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <p className="text-sm font-semibold mb-3">Attachments</p>
            {["invoice.pdf.exe", "report.docm", "update.zip"].map((file) => (
              <button
                key={file}
                onClick={() => setMalwarePopup(file)}
                className="w-full text-left text-sm px-3 py-2 rounded bg-background/50 hover:bg-muted transition-colors flex items-center gap-2"
              >
                <Bug className="h-3 w-3 text-destructive" />
                <span>{file}</span>
              </button>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* Malware Warning Popup */}
      {malwarePopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="glass-strong rounded-xl p-6 max-w-sm text-center space-y-3 glow-cyan">
            <AlertTriangle className="h-10 w-10 text-accent mx-auto" />
            <h3 className="font-bold font-display text-lg">Security Warning</h3>
            <p className="text-sm text-muted-foreground">
              You attempted to download <span className="text-destructive font-semibold">{malwarePopup}</span>. This was a simulated malware test.
            </p>
            <p className="text-xs text-muted-foreground">Never download unexpected files from unverified sources.</p>
            <GlowButton glowColor="cyan" onClick={() => setMalwarePopup(null)}>
              <X className="h-4 w-4 mr-1" /> Acknowledge
            </GlowButton>
          </div>
        </div>
      )}
    </div>
  );
};

export default Simulations;
