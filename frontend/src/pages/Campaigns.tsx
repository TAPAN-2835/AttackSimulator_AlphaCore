import { useState } from "react";
import { Plus } from "lucide-react";
import GlassCard from "@/components/GlassCard";
import GlowButton from "@/components/GlowButton";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const campaigns = [
  { name: "Q1 Phishing Test", type: "Phishing Email", status: "Active", targets: 450, clickRate: "23.4%" },
  { name: "Cred Harvest #4", type: "Credential Harvest", status: "Active", targets: 200, clickRate: "12.1%" },
  { name: "Malware Sim #2", type: "Malware Download", status: "Completed", targets: 380, clickRate: "4.2%" },
  { name: "Exec Spear Phish", type: "Phishing Email", status: "Scheduled", targets: 25, clickRate: "—" },
  { name: "New Hire Baseline", type: "Phishing Email", status: "Draft", targets: 120, clickRate: "—" },
];

const statusColor: Record<string, string> = {
  Active: "bg-green-500/20 text-green-400 border-green-500/30",
  Completed: "bg-primary/20 text-primary border-primary/30",
  Scheduled: "bg-secondary/20 text-secondary border-secondary/30",
  Draft: "bg-muted text-muted-foreground border-border",
};

const Campaigns = () => {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">Campaign Manager</h1>
          <p className="text-muted-foreground text-sm mt-1">Create and manage attack simulations</p>
        </div>
        <GlowButton onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-1" /> New Campaign
        </GlowButton>
      </div>

      {showForm && (
        <GlassCard glow="blue">
          <h3 className="font-semibold font-display mb-4">Create Campaign</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted-foreground block mb-1.5">Campaign Name</label>
              <Input placeholder="Q2 Awareness Test" className="bg-muted/50 border-border" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground block mb-1.5">Attack Type</label>
              <select className="flex h-10 w-full rounded-md border border-border bg-muted/50 px-3 py-2 text-sm">
                <option>Phishing Email</option>
                <option>Credential Harvest</option>
                <option>Malware Download</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground block mb-1.5">Target User Group</label>
              <select className="flex h-10 w-full rounded-md border border-border bg-muted/50 px-3 py-2 text-sm">
                <option>All Employees</option>
                <option>Finance</option>
                <option>Engineering</option>
                <option>Executive Team</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground block mb-1.5">Schedule Date</label>
              <Input type="date" className="bg-muted/50 border-border" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground block mb-1.5">Difficulty Level</label>
              <select className="flex h-10 w-full rounded-md border border-border bg-muted/50 px-3 py-2 text-sm">
                <option>Low (Basic Red Flags)</option>
                <option>Medium (Sophisticated)</option>
                <option>High (Targeted/Spear Phish)</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground block mb-1.5">Simulation Template</label>
              <select className="flex h-10 w-full rounded-md border border-border bg-muted/50 px-3 py-2 text-sm">
                <option>Invoice Overdue #4821</option>
                <option>Microsoft 365 Re-auth</option>
                <option>Internal Policy Update</option>
                <option>IT System Maintenance</option>
              </select>
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <GlowButton size="sm">Launch Campaign</GlowButton>
            <GlowButton variant="outline" size="sm" glowColor="cyan" className="border-border text-foreground" onClick={() => setShowForm(false)}>Cancel</GlowButton>
          </div>
        </GlassCard>
      )}

      <div className="glass rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead>Campaign</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Targets</TableHead>
              <TableHead>Click Rate</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {campaigns.map((c) => (
              <TableRow key={c.name} className="border-border">
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell className="text-muted-foreground">{c.type}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={statusColor[c.status]}>{c.status}</Badge>
                </TableCell>
                <TableCell>{c.targets}</TableCell>
                <TableCell>{c.clickRate}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default Campaigns;
