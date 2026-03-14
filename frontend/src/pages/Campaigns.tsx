import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import GlassCard from "@/components/GlassCard";
import GlowButton from "@/components/GlowButton";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchCampaigns, createCampaign, type CampaignOut } from "@/lib/api";
import { toast } from "sonner";

const attackTypeMap: Record<string, string> = {
  phishing: "Phishing Email",
  credential_harvest: "Credential Harvest",
  malware_download: "Malware Download",
  incident_drill: "Incident Drill",
};

const statusColor: Record<string, string> = {
  Active: "bg-green-500/20 text-green-400 border-green-500/30",
  running: "bg-green-500/20 text-green-400 border-green-500/30",
  Completed: "bg-primary/20 text-primary border-primary/30",
  completed: "bg-primary/20 text-primary border-primary/30",
  Scheduled: "bg-secondary/20 text-secondary border-secondary/30",
  scheduled: "bg-secondary/20 text-secondary border-secondary/30",
  Draft: "bg-muted text-muted-foreground border-border",
  draft: "bg-muted text-muted-foreground border-border",
};


const Campaigns = () => {
  const [showForm, setShowForm] = useState(false);
  const [campaigns, setCampaigns] = useState<CampaignOut[]>([]);
  const [creating, setCreating] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formAttackType, setFormAttackType] = useState("phishing");
  const [formTargetGroup, setFormTargetGroup] = useState("");
  const [formTemplate, setFormTemplate] = useState("password_reset");
  const [formSchedule, setFormSchedule] = useState("");

  useEffect(() => {
    fetchCampaigns()
      .then(setCampaigns)
      .catch((err) => toast.error("Failed to load campaigns"));
  }, []);

  const handleCreate = async () => {
    if (!formName) { toast.error("Campaign name is required"); return; }
    setCreating(true);
    try {
      const newCampaign = await createCampaign({
        campaign_name: formName,
        attack_type: formAttackType,
        target_group: formTargetGroup || undefined,
        template_name: formTemplate,
        schedule_date: formSchedule ? new Date(formSchedule).toISOString() : undefined,
      });
      setCampaigns((prev) => [newCampaign, ...prev]);
      toast.success("Campaign created!");
      setShowForm(false);
      setFormName(""); setFormAttackType("phishing"); setFormTargetGroup(""); setFormTemplate("password_reset"); setFormSchedule("");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create campaign";
      toast.error(message);
    } finally {
      setCreating(false);
    }
  };

  const rows = campaigns.map((c) => ({
    key: String(c.id), name: c.name,
    type: attackTypeMap[c.attack_type] || c.attack_type,
    status: c.status, targets: "—", clickRate: "—",
  }));

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
              <Input placeholder="Q2 Awareness Test" className="bg-muted/50 border-border" value={formName} onChange={(e) => setFormName(e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-muted-foreground block mb-1.5">Attack Type</label>
              <select className="flex h-10 w-full rounded-md border border-border bg-muted/50 px-3 py-2 text-sm" value={formAttackType} onChange={(e) => setFormAttackType(e.target.value)}>
                <option value="phishing">Phishing Email</option>
                <option value="credential_harvest">Credential Harvest</option>
                <option value="malware_download">Malware Download</option>
                <option value="incident_drill">Incident Drill</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground block mb-1.5">Target User Group</label>
              <Input placeholder="e.g. Finance" className="bg-muted/50 border-border" value={formTargetGroup} onChange={(e) => setFormTargetGroup(e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-muted-foreground block mb-1.5">Email Template</label>
              <select className="flex h-10 w-full rounded-md border border-border bg-muted/50 px-3 py-2 text-sm" value={formTemplate} onChange={(e) => setFormTemplate(e.target.value)}>
                <option value="password_reset">Standard Password Reset</option>
                <option value="security_alert">Microsoft Security Alert</option>
                <option value="hr_policy_update">HR Policy Update</option>
                <option value="m365_shared_file">Microsoft 365 Shared File</option>
                <option value="zoom_invite">Zoom Meeting Invitation</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground block mb-1.5">Schedule Date</label>
              <Input type="datetime-local" className="bg-muted/50 border-border" value={formSchedule} onChange={(e) => setFormSchedule(e.target.value)} />
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <GlowButton size="sm" onClick={handleCreate} disabled={creating}>{creating ? "Creating…" : "Launch Campaign"}</GlowButton>
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
            {rows.map((c) => (
              <TableRow key={c.key} className="border-border">
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell className="text-muted-foreground">{c.type}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={statusColor[c.status] || "bg-muted text-muted-foreground border-border"}>{c.status}</Badge>
                </TableCell>
                <TableCell>{c.targets}</TableCell>
                <TableCell>{c.clickRate}</TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No campaigns found. Create your first simulation.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
    </div>
  );
};

export default Campaigns;
