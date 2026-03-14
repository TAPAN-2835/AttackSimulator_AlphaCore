import { useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import GlassCard from "@/components/GlassCard";
import { reportPhishing, type ReportPhishingResponse } from "@/lib/api";

const INDICATORS = [
  { id: "urgent_language", label: "Urgent or Threatening Language" },
  { id: "suspicious_link", label: "Suspicious Link Destination" },
  { id: "domain_mismatch", label: "Sender Domain Mismatch" },
  { id: "fake_login_page", label: "Fake/Spoofed Login Page" },
  { id: "suspicious_attachment", label: "Unexpected/Suspicious Attachment" },
  { id: "unusual_request", label: "Unusual Request for Sensitive Info" },
];

export const ReportPhishingForm = ({ campaignId = 1, compact = false }: { campaignId?: number, compact?: boolean }) => {
  const [selectedReason, setSelectedReason] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ReportPhishingResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!selectedReason) return;
    
    setLoading(true);
    setError(null);
    setResult(null);
    
    try {
      // In a real app we'd get the actual user ID from context. 
      // Using 2 as a placeholder for the demo employee user.
      const res = await reportPhishing({
        user_id: 2, 
        campaign_id: campaignId,
        reason_selected: selectedReason
      });
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to report phishing");
    } finally {
      setLoading(false);
    }
  };

  return (
    <GlassCard glow="purple" className={compact ? "p-4" : "p-6"}>
      <div className="flex items-center gap-2 text-primary mb-4">
        <ShieldAlert className="h-5 w-5" />
        <h3 className="font-bold font-display text-lg">Report Suspicious Email</h3>
      </div>
      
      {!result ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Did you spot a phishing email in your inbox? Select the primary warning indicator you noticed to earn detection points!
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
            {INDICATORS.map((indicator) => (
              <button
                key={indicator.id}
                onClick={() => setSelectedReason(indicator.id)}
                className={`text-left p-3 rounded-lg border text-sm transition-all flex items-center gap-2 ${
                  selectedReason === indicator.id 
                    ? "border-primary bg-primary/10 shadow-[0_0_10px_rgba(var(--primary),0.2)]" 
                    : "border-border hover:border-primary/50 hover:bg-muted/50"
                }`}
              >
                <div className={`h-4 w-4 rounded-full border flex items-center justify-center flex-shrink-0 ${
                  selectedReason === indicator.id ? "border-primary" : "border-muted-foreground"
                }`}>
                  {selectedReason === indicator.id && <div className="h-2 w-2 rounded-full bg-primary" />}
                </div>
                {indicator.label}
              </button>
            ))}
          </div>
          
          {error && (
            <div className="text-xs text-destructive bg-destructive/10 p-2 rounded border border-destructive/20 mt-2">
              {error}
            </div>
          )}
          
          <Button 
            className="w-full mt-2" 
            disabled={!selectedReason || loading}
            onClick={handleSubmit}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <AlertTriangle className="h-4 w-4 mr-2" />}
            {loading ? "Reporting..." : "Report to IT Security"}
          </Button>
        </div>
      ) : (
        <div className="space-y-4 py-2 animate-in fade-in zoom-in duration-300">
          <div className="flex flex-col items-center justify-center text-center space-y-2">
            <div className={`p-3 rounded-full ${result.reason_matched ? 'bg-green-500/20 text-green-500' : 'bg-primary/20 text-primary'}`}>
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h4 className="font-bold text-lg">Email Reported!</h4>
            <p className="text-sm text-muted-foreground">
              {result.reason_matched 
                ? "Excellent catch! You correctly identified the primary attack indicator." 
                : "Good catch! Thanks for staying vigilant and reporting this to security."}
            </p>
          </div>
          
          <div className="bg-muted/30 border border-border rounded-xl p-4 mt-4 text-center">
             <p className="text-xs font-bold uppercase text-muted-foreground mb-3">Score Updates</p>
             <div className="grid grid-cols-3 gap-2">
                <div>
                  <p className="text-2xl font-bold text-green-500">+{result.reason_matched ? 10 : 2}</p>
                  <p className="text-[10px] text-muted-foreground uppercase">Awareness</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-500">+{result.reason_matched ? 5 : 0}</p>
                  <p className="text-[10px] text-muted-foreground uppercase">Accuracy</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-primary">-{result.reason_matched ? 5 : 0}</p>
                  <p className="text-[10px] text-muted-foreground uppercase">Vulnerability</p>
                </div>
             </div>
          </div>
          
          <Button variant="outline" className="w-full" onClick={() => { setSelectedReason(""); setResult(null); }}>
             Report Another
          </Button>
        </div>
      )}
    </GlassCard>
  );
};

export default ReportPhishingForm;
