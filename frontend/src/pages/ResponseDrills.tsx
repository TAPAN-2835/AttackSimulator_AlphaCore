import { useState, useEffect } from "react";
import { ShieldCheck, AlertTriangle, ArrowRight, RotateCcw, HelpCircle, Shield, HandMetal, Eye, BellRing, Info, Loader2 } from "lucide-react";
import GlassCard from "@/components/GlassCard";
import GlowButton from "@/components/GlowButton";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { fetchRandomDrill, type DrillScenario } from "@/lib/api";

const ResponseDrills = () => {
  const [drill, setDrill] = useState<DrillScenario | null>(null);
  const [loading, setLoading] = useState(true);
  const [drillCount, setDrillCount] = useState(1);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [userScore, setUserScore] = useState(0);
  const [drillCompleted, setDrillCompleted] = useState(false);

  // Maximum number of drills per session
  const MAX_DRILLS = 3;

  const loadDrill = async () => {
    setLoading(true);
    setSelectedOption(null);
    try {
      const data = await fetchRandomDrill();
      setDrill(data);
    } catch (err) {
      toast.error("Failed to generate a new AI scenario.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDrill();
  }, []);

  const handleOptionSelect = (index: number) => {
    if (!drill) return;
    setSelectedOption(index);
    setUserScore(prev => prev + drill.options[index].score);
  };

  const nextScenario = () => {
    if (drillCount < MAX_DRILLS) {
      setDrillCount(prev => prev + 1);
      loadDrill();
    } else {
      setDrillCompleted(true);
    }
  };

  const restartDrill = () => {
    setDrillCount(1);
    setSelectedOption(null);
    setUserScore(0);
    setDrillCompleted(false);
    loadDrill();
  };

  if (drillCompleted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 text-center">
        <div className={`p-6 rounded-full ${userScore > 100 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-primary/10 text-primary dark:bg-primary/20'}`}>
          <Shield className="h-16 w-16" />
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-bold font-display">Drill Completed!</h2>
          <p className="text-muted-foreground">Your Security Performance Score</p>
          <p className="text-5xl font-extrabold font-display text-primary">{userScore} pts</p>
        </div>
        <div className="flex gap-4">
          <GlowButton onClick={restartDrill}>
            <RotateCcw className="h-4 w-4 mr-2" /> Start New Drill
          </GlowButton>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="h-12 w-12 text-primary animate-spin" />
        <p className="text-muted-foreground font-mono">AI compiling targeted threat scenario...</p>
      </div>
    );
  }

  if (!drill) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <p className="text-muted-foreground font-mono">Failed to load scenario.</p>
        <GlowButton onClick={loadDrill}>Retry Connection</GlowButton>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">Incident Response Drill</h1>
          <p className="text-muted-foreground text-sm mt-1">AI Generated Scenario {drillCount} of {MAX_DRILLS}</p>
        </div>
        <Badge variant="outline" className="px-3 py-1 bg-muted/50 border-border text-xs uppercase tracking-wider">
          Difficulty: {drill.difficulty}
        </Badge>
      </div>

      <GlassCard glow="blue" className="p-8 space-y-6">
        <div className="space-y-4">
          <h3 className="text-xl font-bold font-display flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary" /> {drill.title}
          </h3>
          <p className="text-foreground leading-relaxed bg-muted/20 p-4 rounded-lg border border-border/30">
            {drill.description}
          </p>
        </div>

        <div className="grid gap-3">
          {drill.options.map((option, idx) => {
            // Assign a functional icon based on the score context
            const Icon = option.score > 50 ? ShieldCheck : option.score > 0 ? Eye : AlertTriangle;
            
            return (
              <button
                key={idx}
                disabled={selectedOption !== null}
                onClick={() => handleOptionSelect(idx)}
                className={`flex items-center gap-4 p-4 rounded-xl text-left transition-all border ${
                  selectedOption === idx
                    ? option.score > 50 
                      ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800" 
                      : "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800"
                    : selectedOption === null 
                      ? "bg-muted/50 border-border hover:border-primary/50 hover:bg-muted dark:hover:bg-muted/80" 
                      : "bg-muted/20 border-border/50 opacity-50 cursor-not-allowed"
                }`}
              >
                <div className={`p-2 rounded-lg ${selectedOption === idx ? "bg-background dark:bg-muted/30" : "bg-muted"}`}>
                  <Icon className={`h-5 w-5 ${selectedOption === idx ? (option.score > 50 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400") : "text-muted-foreground"}`} />
                </div>
                <span className="font-medium flex-1">{option.label}</span>
                {selectedOption === idx && (
                  <span className={`font-bold ${option.score > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {option.score > 0 ? `+${option.score}` : option.score}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {selectedOption !== null && (
          <div className={`p-4 rounded-lg animate-in fade-in slide-in-from-top-2 duration-500 ${
            drill.options[selectedOption].score > 50 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
          }`}>
            <p className="text-sm font-semibold mb-1">Feedback:</p>
            <p className="text-xs text-foreground opacity-90">{drill.options[selectedOption].feedback}</p>
            <div className="mt-4 flex justify-end">
              <GlowButton size="sm" onClick={nextScenario} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 
                  <>{drillCount === MAX_DRILLS ? "Finish Drill" : "Next Scenario"} <ArrowRight className="h-4 w-4 ml-2" /></>
                }
              </GlowButton>
            </div>
          </div>
        )}
      </GlassCard>

      <div className="flex items-center gap-4 bg-muted/30 p-4 rounded-xl border border-border/50">
        <Info className="h-5 w-5 text-primary shrink-0" />
        <p className="text-xs text-muted-foreground">
          Incident Response drills help train muscle memory for reporting security anomalies before they become breaches.
        </p>
      </div>
    </div>
  );
};

export default ResponseDrills;
