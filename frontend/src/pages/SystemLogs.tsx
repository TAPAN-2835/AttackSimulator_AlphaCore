import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { fetchRecentEvents, type EventOut } from "@/lib/api";

// Removed mock data

const actionColor: Record<string, string> = {
  EMAIL_OPEN: "bg-primary/10 text-primary border-primary/20",
  EMAIL_SENT: "bg-primary/10 text-primary border-primary/20",
  LINK_CLICK: "bg-red-100 text-red-700 border-red-200",
  CREDENTIAL_ATTEMPT: "bg-red-100 text-red-700 border-red-200",
  FILE_DOWNLOAD: "bg-amber-100 text-amber-700 border-amber-200",
  EMAIL_REPORTED: "bg-green-100 text-green-700 border-green-200",
};

interface LogEntry {
  user: string;
  action: string;
  campaign: string;
  time: string;
  ip: string;
}

const SystemLogs = () => {
  const [filter, setFilter] = useState("");
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    const toLogEntry = (e: EventOut): LogEntry => ({
      user: e.user_email || `user_${e.user_id ?? "—"}`,
      action: e.event_type,
      campaign: e.campaign_name || `campaign_${e.campaign_id ?? "—"}`,
      time: new Date(e.timestamp).toLocaleTimeString(),
      ip: e.ip_address || "—",
    });

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
      l.campaign.toLowerCase().includes(filter.toLowerCase())
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
                  <Badge variant="outline" className={actionColor[l.action] || "bg-muted text-muted-foreground border-border"}>{l.action}</Badge>
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
