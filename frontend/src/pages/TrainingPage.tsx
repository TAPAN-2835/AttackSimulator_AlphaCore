import { ShieldAlert, CheckCircle, AlertTriangle, ArrowRight, Info, ExternalLink, ShieldCheck } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import GlowButton from "@/components/GlowButton";
import GlassCard from "@/components/GlassCard";
import GridBackground from "@/components/GridBackground";

const TrainingPage = () => {
    const [searchParams] = useSearchParams();
    const campaignName = searchParams.get("campaign") || "a security simulation";

    const commonRedFlags = [
        {
            title: "Artificial Urgency",
            desc: "Phishers use words like 'Immediate', 'Urgent', or 'Action Required' to make you act without thinking.",
            icon: AlertTriangle
        },
        {
            title: "Mismatched Sender",
            desc: "Always check the actual email address, not just the name. Phishers often use addresses that look 'close' to real ones.",
            icon: Info
        },
        {
            title: "Suspicious Links",
            desc: "Hover over buttons or links before clicking. Does the URL in the bottom-left of your browser match where you expect to go?",
            icon: ExternalLink
        },
        {
            title: "Generic Greetings",
            desc: "Mass-produced phishing emails often use 'Dear Customer' or 'Valued Member' instead of your actual name.",
            icon: CheckCircle
        }
    ];

    return (
        <div className="min-h-screen bg-background relative flex flex-col items-center py-16 px-6">
            <GridBackground />
            
            <div className="relative z-10 max-w-4xl w-full space-y-12">
                {/* Hero Header */}
                <div className="text-center space-y-4">
                    <div className="inline-flex p-3 rounded-2xl bg-destructive/10 text-destructive mb-4 animate-bounce">
                        <ShieldAlert className="h-10 w-10" />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-extrabold font-display tracking-tight">
                        Wait! This was a <span className="text-primary">Simulated Attack.</span>
                    </h1>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                        You just interacted with <strong>{campaignName}</strong>. This was a safe simulation conducted by your organization to help you recognize real-world cyber threats.
                    </p>
                </div>

                {/* Educational Content */}
                <div className="grid md:grid-cols-2 gap-6">
                    <GlassCard glow="blue" className="space-y-6">
                        <div className="flex items-center gap-3 text-primary">
                            <ShieldCheck className="h-6 w-6" />
                            <h2 className="text-lg font-bold font-display">What Should You Have Checked?</h2>
                        </div>
                        <div className="space-y-4">
                            {commonRedFlags.map((flag, i) => (
                                <div key={i} className="flex gap-4 p-4 rounded-xl bg-muted/30 border border-border/50 group hover:border-primary/30 transition-all">
                                    <div className="p-2 h-fit rounded-lg bg-primary/10 text-primary">
                                        <flag.icon className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-sm mb-1">{flag.title}</h3>
                                        <p className="text-xs text-muted-foreground line-height-relaxed">{flag.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </GlassCard>

                    <div className="space-y-6">
                        <GlassCard glow="purple" className="flex flex-col h-full">
                            <div className="flex items-center gap-3 text-secondary mb-4">
                                <Info className="h-6 w-6" />
                                <h2 className="text-lg font-bold font-display">Your Next Step</h2>
                            </div>
                            <p className="text-sm text-muted-foreground mb-6 flex-1">
                                Cybersecurity is a shared responsibility. By recognizing these signs today, you protect the organization's data tomorrow. 
                                <br /><br />
                                We've updated your <strong>Learning Portal</strong> with a short training module to help you master these skills.
                            </p>
                            <Link to="/login/user">
                                <GlowButton glowColor="purple" className="w-full">
                                    Access Learning Portal <ArrowRight className="ml-2 h-4 w-4" />
                                </GlowButton>
                            </Link>
                        </GlassCard>
                    </div>
                </div>

                <div className="text-center pt-8">
                    <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">
                        Powered by AttackSimulator Platform
                    </p>
                </div>
            </div>
        </div>
    );
};

export default TrainingPage;
