import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { fetchRecentEvents, type EventOut } from "@/lib/api";

const actionColor: Record<string, string> = {
  EMAIL_OPEN: "text-primary",
  EMAIL_SENT: "text-primary",
  LINK_CLICK: "text-destructive",
  CREDENTIAL_ATTEMPT: "text-destructive",
  FILE_DOWNLOAD: "text-secondary",
  EMAIL_REPORTED: "text-green-400",
};

const formatIndicatorLabel = (raw: string) => {
  const map: Record<string, string> = {
    urgent_language: "Urgent/Threatening Language",
    suspicious_link: "Suspicious Link",
    domain_mismatch: "Domain Mismatch",
    fake_login_page: "Fake Login Page",
    suspicious_attachment: "Suspicious Attachment",
    unusual_request: "Unusual Request",
  };
  return map[raw] || raw;
};

interface FeedEntry {
  time: string;
  user: string;
  event: string;
  campaign: string;
  color: string;
}

const LiveFeed = ({ className }: { className?: string }) => {
  const [events, setEvents] = useState<FeedEntry[]>([]);

  useEffect(() => {
    const loadEvents = async () => {
      try {
        const data = await fetchRecentEvents(15);
        const mapped = data.map((e: EventOut): FeedEntry => {
          let campaignStr = e.campaign_name || `campaign_${e.campaign_id ?? "—"}`;
          if (e.event_type === "EMAIL_REPORTED" && e.metadata_?.reason_selected) {
            campaignStr += ` (Reason: ${formatIndicatorLabel(e.metadata_.reason_selected)})`;
          }
          return {
            time: new Date(e.timestamp).toLocaleTimeString(),
            user: e.user_email || `user_${e.user_id ?? "—"}`,
            event: e.event_type,
            campaign: campaignStr,
            color: actionColor[e.event_type] || "text-foreground",
          };
        });
        setEvents(mapped);
      } catch (err) {
        // silently fail for active dashboard polling
      }
    };

    loadEvents();
    const interval = setInterval(loadEvents, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={cn("glass rounded-lg overflow-hidden", className)}>
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse-glow" />
        <span className="text-sm font-semibold font-display">Live Attack Activity</span>
      </div>
      <div className="h-64 overflow-hidden relative font-mono text-xs">
        <div className="animate-scroll-feed flex flex-col">
          {events.length > 0 ? (
            [...events, ...events].map((e, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2 border-b border-border/50 hover:bg-muted/30 whitespace-nowrap">
                <span className="text-muted-foreground w-16 shrink-0">{e.time}</span>
                <span className="text-foreground/70 w-40 shrink-0 truncate">{e.user}</span>
                <span className={cn("font-bold w-36 shrink-0", e.color)}>{e.event}</span>
                <span className="text-muted-foreground truncate flex-grow">{e.campaign}</span>
              </div>
            ))
          ) : (
            <div className="p-4 text-muted-foreground text-center">Waiting for live data...</div>
          )}
        </div>
      </div>
    </div>
  );
};
import { type EventOut } from "@/lib/api";

const eventToColor: Record<string, string> = {
  EMAIL_OPEN: "text-primary",
  LINK_CLICK: "text-destructive",
  CREDENTIAL_ATTEMPT: "text-destructive",
  EMAIL_REPORTED: "text-green-400",
  FILE_DOWNLOAD: "text-secondary",
};

const LiveFeed = ({ 
  events = [], 
  className 
}: { 
  events?: EventOut[];
  className?: string;
}) => {
  const formatTime = (ts: string) => {
    try {
      return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
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
