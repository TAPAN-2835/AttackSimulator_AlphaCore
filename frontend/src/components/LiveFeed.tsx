import { cn } from "@/lib/utils";

const events = [
  { time: "14:32:01", user: "j.smith@acme.co", event: "EMAIL_OPEN", campaign: "Q1 Phishing Test", color: "text-primary" },
  { time: "14:32:15", user: "m.jones@acme.co", event: "LINK_CLICK", campaign: "Q1 Phishing Test", color: "text-destructive" },
  { time: "14:33:02", user: "a.wilson@acme.co", event: "CREDENTIAL_ATTEMPT", campaign: "Cred Harvest #4", color: "text-destructive" },
  { time: "14:33:44", user: "r.davis@acme.co", event: "EMAIL_REPORTED", campaign: "Q1 Phishing Test", color: "text-green-400" },
  { time: "14:34:10", user: "k.brown@acme.co", event: "FILE_DOWNLOAD", campaign: "Malware Sim #2", color: "text-secondary" },
  { time: "14:34:55", user: "l.garcia@acme.co", event: "EMAIL_OPEN", campaign: "Exec Spear Phish", color: "text-primary" },
  { time: "14:35:22", user: "t.nguyen@acme.co", event: "LINK_CLICK", campaign: "Cred Harvest #4", color: "text-destructive" },
  { time: "14:35:48", user: "s.patel@acme.co", event: "EMAIL_REPORTED", campaign: "Malware Sim #2", color: "text-green-400" },
  { time: "14:36:01", user: "d.kim@acme.co", event: "EMAIL_OPEN", campaign: "Q1 Phishing Test", color: "text-primary" },
  { time: "14:36:30", user: "c.lee@acme.co", event: "CREDENTIAL_ATTEMPT", campaign: "Exec Spear Phish", color: "text-destructive" },
];

const LiveFeed = ({ className }: { className?: string }) => (
  <div className={cn("glass rounded-lg overflow-hidden", className)}>
    <div className="px-4 py-3 border-b border-border flex items-center gap-2">
      <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse-glow" />
      <span className="text-sm font-semibold font-display">Live Attack Activity</span>
    </div>
    <div className="h-64 overflow-hidden relative font-mono text-xs">
      <div className="animate-scroll-feed">
        {[...events, ...events].map((e, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-2 border-b border-border/50 hover:bg-muted/30">
            <span className="text-muted-foreground w-16 shrink-0">{e.time}</span>
            <span className="text-foreground/70 w-40 shrink-0 truncate">{e.user}</span>
            <span className={cn("font-bold w-36 shrink-0", e.color)}>{e.event}</span>
            <span className="text-muted-foreground truncate">{e.campaign}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default LiveFeed;
