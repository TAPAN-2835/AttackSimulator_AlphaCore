import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { fetchRecentEvents, type EventOut } from "@/lib/api";

// Removed mock data

const actionColor: Record<string, string> = {
  EMAIL_OPEN: "bg-primary/10 text-primary border-primary/20 dark:text-primary-foreground dark:bg-primary/20",
  EMAIL_SENT: "bg-primary/10 text-primary border-primary/20 dark:text-primary-foreground dark:bg-primary/20",
  LINK_CLICK: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
  CREDENTIAL_ATTEMPT: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
  FILE_DOWNLOAD: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",
  EMAIL_REPORTED: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
};

interface LogEntry {
  user: string;
  action: string;
  campaign: string;
  time: string;
  ip: string;
  metaReason?: string;
}

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

const SystemLogs = () => {
  const [filter, setFilter] = useState("");
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    const toLogEntry = (e: EventOut): LogEntry => {
      let metaReason;
      if (e.event_type === "EMAIL_REPORTED" && e.metadata_?.reason_selected) {
         metaReason = formatIndicatorLabel(e.metadata_.reason_selected);
      }
      return {
        user: e.user_email || `user_${e.user_id ?? "—"}`,
        action: e.event_type,
        campaign: e.campaign_name || `campaign_${e.campaign_id ?? "—"}`,
        time: new Date(e.timestamp).toLocaleTimeString(),
        ip: e.ip_address || "—",
        metaReason
      };
    };

    // Fetch once immediately, then poll every 5 seconds
    const loadEvents = () => {
      fetchRecentEvents(100)
        .then((events: EventOut[]) => {
          if (events.length > 0) {
            setLogs(events.map(toLogEntry));
          }
        })
        .catch(() => {});
    };

    loadEvents();
    const intervalId = setInterval(loadEvents, 5000);

    return () => clearInterval(intervalId);
  }, []);

  const filtered = logs.filter(
    (l) =>
      l.user.toLowerCase().includes(filter.toLowerCase()) ||
      l.action.includes(filter.toUpperCase()) ||
      l.campaign.toLowerCase().includes(filter.toLowerCase()) ||
      (l.metaReason && l.metaReason.toLowerCase().includes(filter.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display">System Logs</h1>
        <p className="text-muted-foreground text-sm mt-1">All simulation activity logs</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Filter logs..."
          className="pl-9 bg-muted/50 border-border"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      <div className="glass rounded-lg overflow-hidden font-mono">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent text-xs">
              <TableHead>Timestamp</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Campaign</TableHead>
              <TableHead>IP Address</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((l, i) => (
              <TableRow key={i} className="border-border text-xs">
                <TableCell className="text-muted-foreground">{l.time}</TableCell>
                <TableCell>{l.user}</TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1 items-start">
                    <Badge variant="outline" className={actionColor[l.action] || "bg-muted text-muted-foreground border-border"}>{l.action}</Badge>
                    {l.metaReason && (
                      <span className="text-[10px] text-muted-foreground italic">Reason: {l.metaReason}</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{l.campaign}</TableCell>
                <TableCell className="text-muted-foreground">{l.ip}</TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No events recorded yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
    </div>
  );
};

export default SystemLogs;
