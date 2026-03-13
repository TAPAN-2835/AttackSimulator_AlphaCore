import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useState } from "react";

const logs = [
  { user: "j.smith@acme.co", action: "EMAIL_OPEN", campaign: "Q1 Phishing Test", time: "2026-03-13 14:32:01", ip: "192.168.1.45" },
  { user: "m.jones@acme.co", action: "LINK_CLICK", campaign: "Q1 Phishing Test", time: "2026-03-13 14:32:15", ip: "192.168.1.102" },
  { user: "a.wilson@acme.co", action: "CREDENTIAL_ATTEMPT", campaign: "Cred Harvest #4", time: "2026-03-13 14:33:02", ip: "10.0.0.55" },
  { user: "r.davis@acme.co", action: "EMAIL_REPORTED", campaign: "Q1 Phishing Test", time: "2026-03-13 14:33:44", ip: "192.168.1.78" },
  { user: "k.brown@acme.co", action: "FILE_DOWNLOAD", campaign: "Malware Sim #2", time: "2026-03-13 14:34:10", ip: "10.0.0.12" },
  { user: "l.garcia@acme.co", action: "EMAIL_OPEN", campaign: "Exec Spear Phish", time: "2026-03-13 14:34:55", ip: "172.16.0.33" },
  { user: "t.nguyen@acme.co", action: "LINK_CLICK", campaign: "Cred Harvest #4", time: "2026-03-13 14:35:22", ip: "10.0.0.88" },
  { user: "s.patel@acme.co", action: "EMAIL_REPORTED", campaign: "Malware Sim #2", time: "2026-03-13 14:35:48", ip: "192.168.2.15" },
  { user: "d.kim@acme.co", action: "EMAIL_OPEN", campaign: "Q1 Phishing Test", time: "2026-03-13 14:36:01", ip: "172.16.0.44" },
  { user: "c.lee@acme.co", action: "CREDENTIAL_ATTEMPT", campaign: "Exec Spear Phish", time: "2026-03-13 14:36:30", ip: "10.0.0.99" },
];

const actionColor: Record<string, string> = {
  EMAIL_OPEN: "bg-primary/20 text-primary border-primary/30",
  LINK_CLICK: "bg-destructive/20 text-destructive border-destructive/30",
  CREDENTIAL_ATTEMPT: "bg-destructive/20 text-destructive border-destructive/30",
  FILE_DOWNLOAD: "bg-secondary/20 text-secondary border-secondary/30",
  EMAIL_REPORTED: "bg-green-500/20 text-green-400 border-green-500/30",
};

const SystemLogs = () => {
  const [filter, setFilter] = useState("");
  const filtered = logs.filter(
    (l) =>
      l.user.includes(filter.toLowerCase()) ||
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
                  <Badge variant="outline" className={actionColor[l.action]}>{l.action}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{l.campaign}</TableCell>
                <TableCell className="text-muted-foreground">{l.ip}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default SystemLogs;
