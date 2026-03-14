import { cn } from "@/lib/utils";
import { type EventOut } from "@/lib/api";

const eventToColor: Record<string, string> = {
  EMAIL_OPEN: "text-primary",
  EMAIL_SENT: "text-primary",
  LINK_CLICK: "text-destructive",
  CREDENTIAL_ATTEMPT: "text-destructive",
  EMAIL_REPORTED: "text-green-400",
  FILE_DOWNLOAD: "text-secondary",
};

const LiveFeed = ({
  events = [],
  className,
}: {
  events?: EventOut[];
  className?: string;
}) => {
  const formatTime = (ts: string) => {
    try {
      return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      return new Date(ts).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return "--:--:--";
    }
  };

  return (
    <div className={cn("glass rounded-lg overflow-hidden", className)}>
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse-glow" />
        <span className="text-sm font-semibold font-display">Live Attack Activity</span>
      </div>
      <div className="h-64 overflow-hidden relative font-mono text-xs">
        <div className={cn(events.length > 8 ? "animate-scroll-feed" : "")}>
          {(events.length > 0 ? events : []).map((e, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-2 border-b border-border/50 hover:bg-muted/30">
              <span className="text-muted-foreground w-16 shrink-0">{formatTime(e.timestamp)}</span>
              <span className="text-foreground/70 w-40 shrink-0 truncate">{e.user_email || "unknown@user"}</span>
              <span className={cn("font-bold w-36 shrink-0", eventToColor[e.event_type] || "text-foreground")}>
                {e.event_type.replace("_", " ")}
              </span>
              <span className="text-muted-foreground truncate">{e.campaign_name || "Training"}</span>
            </div>
          ))}
          {events.length === 0 && (
            <div className="p-10 text-center text-muted-foreground h-full flex items-center justify-center">
              Waiting for attack simulation events...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LiveFeed;
