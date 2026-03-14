import { useState } from "react";
import { Search, Mail, KeyRound, Bug, Eye, Copy, Filter } from "lucide-react";
import GlassCard from "@/components/GlassCard";
import GlowButton from "@/components/GlowButton";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const templates = [
  { id: 1, title: "Urgent Invoice #4821", type: "Phishing", difficulty: "Medium", usage: 452, color: "blue" },
  { id: 2, title: "Microsoft 365 Re-authentication", type: "Credential", difficulty: "High", usage: 890, color: "purple" },
  { id: 3, title: "Salary Increase Notification", type: "Phishing", difficulty: "High", usage: 120, color: "blue" },
  { id: 4, title: "IT System Maintenance", type: "Malware", difficulty: "Low", usage: 230, color: "cyan" },
  { id: 5, title: "Unpaid Parking Ticket", type: "Phishing", difficulty: "Medium", usage: 567, color: "blue" },
  { id: 6, title: "Corporate VPN Update", type: "Credential", difficulty: "Medium", usage: 310, color: "purple" },
];

const Templates = () => {
  const [filter, setFilter] = useState("All");

  const filteredTemplates = filter === "All" 
    ? templates 
    : templates.filter(t => t.type === filter);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display">Simulation Template Library</h1>
          <p className="text-muted-foreground text-sm mt-1">Pre-built attack scenarios and templates</p>
        </div>
        <GlowButton>
          <PlusCircle className="h-4 w-4 mr-2" /> Create Custom
        </GlowButton>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search templates..." className="pl-10 bg-muted/50 border-border" />
        </div>
        <div className="flex gap-2">
          {["All", "Phishing", "Credential", "Malware"].map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`px-4 py-2 rounded-md text-sm transition-all ${
                filter === t 
                  ? "bg-primary text-primary-foreground font-medium glow-blue" 
                  : "bg-muted/50 border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map((template) => (
          <GlassCard key={template.id} glow={template.color as "blue" | "purple" | "cyan"} className="group flex flex-col h-full">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-2 rounded-lg ${template.color === 'blue' ? 'bg-blue-100' : template.color === 'purple' ? 'bg-violet-100' : 'bg-cyan-100'}`}>
                {template.type === "Phishing" && <Mail className="h-5 w-5 text-blue-600" />}
                {template.type === "Credential" && <KeyRound className="h-5 w-5 text-violet-600" />}
                {template.type === "Malware" && <Bug className="h-5 w-5 text-cyan-600" />}
              </div>
              <Badge variant="outline" className="text-[10px] uppercase tracking-wider text-muted-foreground">{template.difficulty}</Badge>
            </div>
            
            <h3 className="font-semibold font-display text-lg mb-2 group-hover:text-primary transition-colors">
              {template.title}
            </h3>
            <p className="text-sm text-muted-foreground mb-6 flex-1">
              Used in {template.usage} simulations this month. {template.difficulty} detection rate.
            </p>

            <div className="flex items-center justify-between pt-4 border-t border-border/50">
              <button 
                className="text-xs flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => toast.info("Showing preview for " + template.title)}
              >
                <Eye className="h-3.5 w-3.5" /> Preview
              </button>
              <button 
                className="text-xs flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => {
                  toast.success("Template copied to campaign creator");
                }}
              >
                <Copy className="h-3.5 w-3.5" /> Use Template
              </button>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
};

// Helper to avoid PlusCircle undefined error if not imported properly
const PlusCircle = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10"/><path d="M12 8v8"/><path d="M8 12h8"/>
  </svg>
);

export default Templates;
