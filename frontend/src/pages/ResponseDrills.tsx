import { useState } from "react";
import { ShieldCheck, AlertTriangle, ArrowRight, RotateCcw, HelpCircle, Shield, HandMetal, Eye, BellRing, Info } from "lucide-react";
import GlassCard from "@/components/GlassCard";
import GlowButton from "@/components/GlowButton";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const scenarios = [
  {
    id: 1,
    title: "The Mysterious USB Drive",
    description: "You find an unlabeled USB flash drive on the floor of the breakroom. It's high quality and looks expensive.",
    options: [
      { label: "Plug it in to see who it belongs to", score: -50, feedback: "DANGEROUS: USB drives are a common vector for hardware-level malware (BadUSB). Never plug in unknown hardware.", icon: AlertTriangle },
      { label: "Leave it there and ignore it", score: 0, feedback: "NEUTRAL: While safe for you, another employee might plug it in. Reporting it is better.", icon: Eye },
      { label: "Take it to the IT Security desk immediately", score: 100, feedback: "EXCELLENT: Reporting unknown hardware to professionals is the standard security protocol.", icon: ShieldCheck },
    ],
    difficulty: "Low"
  },
  {
    id: 2,
    title: "The Urgent Phone Call",
    description: "A caller claiming to be from 'Internal IT' says your workstation is sending out error logs. They need you to install a remote support tool 'immediately' to prevent a system crash.",
    options: [
      { label: "Follow their instructions and install the tool", score: -70, feedback: "DANGEROUS: This is a classic social engineering attack. IT will never ask you to install unverified software.", icon: AlertTriangle },
      { label: "Ask for their employee ID and call back on the official IT number", score: 100, feedback: "EXCELLENT: Out-of-band verification is the best way to stop social engineering.", icon: ShieldCheck },
      { label: "Tell them you're busy and hang up", score: 30, feedback: "GOOD: You avoided the trap, but the attacker might target someone else. You should also report the call.", icon: BellRing },
    ],
    difficulty: "Medium"
  }
];

const ResponseDrills = () => {
  const [currentScenario, setCurrentScenario] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [userScore, setUserScore] = useState(0);
  const [drillCompleted, setDrillCompleted] = useState(false);

  const handleOptionSelect = (index: number) => {
    setSelectedOption(index);
    setUserScore(prev => prev + scenarios[currentScenario].options[index].score);
  };

  const nextScenario = () => {
    if (currentScenario < scenarios.length - 1) {
      setCurrentScenario(prev => prev + 1);
      setSelectedOption(null);
    } else {
      setDrillCompleted(true);
    }
  };

  const restartDrill = () => {
    setCurrentScenario(0);
    setSelectedOption(null);
    setUserScore(0);
    setDrillCompleted(false);
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

  const scenario = scenarios[currentScenario];

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">Incident Response Drill</h1>
          <p className="text-muted-foreground text-sm mt-1">Scenario {currentScenario + 1} of {scenarios.length}</p>
        </div>
        <Badge variant="outline" className="px-3 py-1 bg-muted/50 border-border text-xs uppercase tracking-wider">
          Difficulty: {scenario.difficulty}
        </Badge>
      </div>

      <GlassCard glow="blue" className="p-8 space-y-6">
        <div className="space-y-4">
          <h3 className="text-xl font-bold font-display flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary" /> {scenario.title}
          </h3>
          <p className="text-foreground leading-relaxed bg-muted/20 p-4 rounded-lg border border-border/30">
            {scenario.description}
          </p>
        </div>

        <div className="grid gap-3">
          {scenario.options.map((option, idx) => (
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
                <option.icon className={`h-5 w-5 ${selectedOption === idx ? (option.score > 50 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400") : "text-muted-foreground"}`} />
              </div>
              <span className="font-medium flex-1">{option.label}</span>
              {selectedOption === idx && (
                <span className={`font-bold ${option.score > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {option.score > 0 ? `+${option.score}` : option.score}
                </span>
              )}
            </button>
          ))}
        </div>

        {selectedOption !== null && (
          <div className={`p-4 rounded-lg animate-in fade-in slide-in-from-top-2 duration-500 ${
            scenario.options[selectedOption].score > 50 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
          }`}>
            <p className="text-sm font-semibold mb-1">Feedback:</p>
            <p className="text-xs text-foreground opacity-90">{scenario.options[selectedOption].feedback}</p>
            <div className="mt-4 flex justify-end">
              <GlowButton size="sm" onClick={nextScenario}>
                {currentScenario === scenarios.length - 1 ? "Finish Drill" : "Next Scenario"} <ArrowRight className="h-4 w-4 ml-2" />
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
