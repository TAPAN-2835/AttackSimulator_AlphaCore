import { useState, useEffect } from "react";
import { Shield, ShieldAlert, ShieldCheck, GraduationCap, ArrowRight, MousePointerClick, KeyRound, Bug, Info, Loader2, FileDown } from "lucide-react";
import GlassCard from "@/components/GlassCard";
import VirusTotalCheck from "@/components/VirusTotalCheck";
import ReportPhishingForm from "@/components/ReportPhishingForm";
import GlowButton from "@/components/GlowButton";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { fetchMe, fetchLatestFeedback, fetchUserRisk, LatestFeedbackResponse, UserRiskResponse } from "@/lib/api";

const EmployeeDashboard = () => {
  const [feedback, setFeedback] = useState<LatestFeedbackResponse | null>(null);
  const [risk, setRisk] = useState<UserRiskResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const me = await fetchMe();
        const [fbData, riskData] = await Promise.all([
          fetchLatestFeedback(),
          fetchUserRisk(me.id)
        ]);
        setFeedback(fbData);
        setRisk(riskData);
      } catch (err) {
        console.error("Failed to load dashboard data", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground animate-pulse">Loading your security profile...</p>
        </div>
      </div>
    );
  }

  const isHighRisk = risk?.risk_level === 'CRITICAL' || risk?.risk_level === 'HIGH';

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display">Employee Learning Portal</h1>
          <p className="text-muted-foreground text-sm mt-1">Personal security awareness & training</p>
        </div>
        <div className={`px-4 py-2 rounded-lg glass-strong flex items-center gap-3 border ${isHighRisk ? 'border-destructive/20' : 'border-primary/20'}`}>
          <div className={`p-2 rounded-full ${isHighRisk ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>
            {isHighRisk ? <ShieldAlert className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase font-bold">Personal Risk Level</p>
            <p className={`text-sm font-bold ${isHighRisk ? 'text-destructive' : 'text-primary'}`}>
              {risk?.risk_level || 'LOW'} ({risk?.risk_score || 0}/100)
            </p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Why I'm here card */}
        <GlassCard glow={isHighRisk ? "purple" : "cyan"} className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-2 text-primary">
            {isHighRisk ? <ShieldAlert className="h-5 w-5 text-destructive" /> : <ShieldCheck className="h-5 w-5" />}
            <h3 className="font-bold font-display">Last Simulation Feedback</h3>
          </div>
          
          {feedback ? (
            <>
              <p className="text-sm border-l-2 border-primary/30 pl-4 py-1 text-muted-foreground">
                You recently interacted with a simulated phishing attack titled <span className="text-foreground font-semibold">"{feedback.campaign_name}"</span>.
              </p>
              
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                {feedback.link_clicked && (
                  <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/10 space-y-1">
                    <div className="flex items-center gap-2 text-destructive">
                      <MousePointerClick className="h-4 w-4" />
                      <span className="text-xs font-bold uppercase">Action Detected</span>
                    </div>
                    <p className="text-sm font-medium">You clicked the link</p>
                  </div>
                )}
                
                {feedback.credential_attempt && (
                  <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/10 space-y-1">
                    <div className="flex items-center gap-2 text-destructive">
                      <KeyRound className="h-4 w-4" />
                      <span className="text-xs font-bold uppercase">Critical Failure</span>
                    </div>
                    <p className="text-sm font-medium">Credentials were entered</p>
                  </div>
                )}

                {feedback.file_download && (
                  <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/10 space-y-1">
                    <div className="flex items-center gap-2 text-destructive">
                      <FileDown className="h-4 w-4" />
                      <span className="text-xs font-bold uppercase">Security Gap</span>
                    </div>
                    <p className="text-sm font-medium">File was downloaded</p>
                  </div>
                )}

                {!feedback.link_clicked && !feedback.credential_attempt && !feedback.file_download && (
                  <div className="p-3 rounded-lg bg-primary/5 border border-primary/10 space-y-1 sm:col-span-2">
                    <div className="flex items-center gap-2 text-primary">
                      <ShieldCheck className="h-4 w-4" />
                      <span className="text-xs font-bold uppercase">Safe Interaction</span>
                    </div>
                    <p className="text-sm font-medium">No dangerous actions were detected in this campaign.</p>
                  </div>
                )}
              </div>
              
              {feedback.attack_indicators.length > 0 && (
                <div className="pt-4 space-y-3">
                  <h4 className="text-sm font-bold flex items-center gap-2">
                    <Info className="h-4 w-4 text-primary" /> Warning Signs You Missed
                  </h4>
                  <ul className="grid sm:grid-cols-2 gap-2">
                    {feedback.attack_indicators.map((sign, i) => (
                      <li key={i} className="flex gap-2 text-xs text-muted-foreground bg-muted/30 p-2 rounded border border-border/50">
                        <span className="text-primary font-bold">•</span> {sign}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center space-y-3">
              <div className="p-4 rounded-full bg-primary/10 text-primary">
                <ShieldCheck className="h-8 w-8" />
              </div>
              <div>
                <h4 className="font-bold">No Recent Incidents</h4>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                  You haven't participated in any recent simulations. Great job staying secure!
                </p>
              </div>
            </div>
          )}
        </GlassCard>

        <div className="space-y-6">
          {/* Report Phishing Action */}
          <ReportPhishingForm campaignId={feedback?.campaign_name ? 1 : undefined} />
          
          {/* Check suspicious link (VirusTotal) */}
          <VirusTotalCheck
            title="Check a suspicious link"
            glow="cyan"
          />
        </div>

      </div>
    </div>
  );
};

export default EmployeeDashboard;
