import { useEffect, useState } from "react";
import { Plus, Sparkles, Send } from "lucide-react";
import GlassCard from "@/components/GlassCard";
import GlowButton from "@/components/GlowButton";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchCampaigns, createCampaign, fetchDepartments, generateAIEmail, type CampaignOut } from "@/lib/api";
import { toast } from "sonner";

const attackTypeMap: Record<string, string> = {
  phishing: "Phishing Email",
  spear_phishing: "Spear Phishing",
  credential_harvest: "Credential Harvest",
  malware_download: "Malware Download",
  incident_drill: "Incident Drill",
  smishing: "Smishing (SMS)",
  vishing: "Vishing (Voice)",
  qr_phishing: "QR Code Phishing",
  business_email_compromise: "BEC Attack",
  whaling: "Whaling/Executive",
};

const statusColor: Record<string, string> = {
  Active: "bg-green-100 text-green-700 border-green-200",
  running: "bg-green-100 text-green-700 border-green-200",
  Completed: "bg-primary/10 text-primary border-primary/20",
  completed: "bg-primary/10 text-primary border-primary/20",
  Scheduled: "bg-blue-100 text-blue-700 border-blue-200",
  scheduled: "bg-blue-100 text-blue-700 border-blue-200",
  Draft: "bg-muted text-muted-foreground border-border",
  draft: "bg-muted text-muted-foreground border-border",
};

const Campaigns = () => {
  const [showForm, setShowForm] = useState(false);
  const [showAIForm, setShowAIForm] = useState(false);
  const [campaigns, setCampaigns] = useState<CampaignOut[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Default Form state
  const [formName, setFormName] = useState("");
  const [formAttackType, setFormAttackType] = useState("phishing");
  const [formTargetGroup, setFormTargetGroup] = useState("");
  const [formTemplate, setFormTemplate] = useState("password_reset");
  const [formSchedule, setFormSchedule] = useState("");

  // AI Form state
  const [aiName, setAiName] = useState("");
  const [aiAttackType, setAiAttackType] = useState("phishing");
  const [aiTheme, setAiTheme] = useState("Microsoft Login");
  const [aiDifficulty, setAiDifficulty] = useState("Medium");
  const [aiDepartment, setAiDepartment] = useState("");
  const [aiModel, setAiModel] = useState("OpenAI GPT");
  const [aiTone, setAiTone] = useState("Professional");
  
  // AI Generated Output State
  const [aiSubject, setAiSubject] = useState("");
  const [aiBody, setAiBody] = useState("");
  const [aiCta, setAiCta] = useState("");
  const [hasGenerated, setHasGenerated] = useState(false);

  useEffect(() => {
    fetchCampaigns()
      .then(setCampaigns)
      .catch(() => toast.error("Failed to load campaigns"));
    fetchDepartments()
      .then(setDepartments)
      .catch(() => toast.error("Failed to load departments"));
  }, []);

  const handleCreateStandard = async () => {
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
      setFormName("");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create campaign";
      toast.error(message);
    } finally {
      setCreating(false);
    }
  };

  const handleGenerateAI = async () => {
    if (!aiDepartment) { toast.error("Please select a target department"); return; }
    setGenerating(true);
    try {
      const response = await generateAIEmail({
        attack_type: aiAttackType,
        theme: aiTheme,
        difficulty: aiDifficulty,
        department: aiDepartment,
        tone: aiTone,
        model: aiModel
      });
      setAiSubject(response.subject);
      setAiBody(response.body);
      setAiCta(response.cta_text);
      setHasGenerated(true);
      toast.success("AI Email generated successfully");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "AI generation failed";
      toast.error(message);
    } finally {
      setGenerating(false);
    }
  };

  const handleSendAICampaign = async () => {
    if (!aiName) { toast.error("Campaign name is required"); return; }
    if (!hasGenerated || !aiSubject || !aiBody) { toast.error("Please generate an email first"); return; }
    
    setCreating(true);
    try {
      const newCampaign = await createCampaign({
        campaign_name: aiName,
        attack_type: aiAttackType,
        target_group: aiDepartment,
        template_name: "custom_ai",
        subject: aiSubject,
        body: aiBody,
        // AI Tracking Metadata
        ai_model: aiModel,
        ai_theme: aiTheme,
        ai_difficulty: aiDifficulty,
        ai_tone: aiTone
      });
      setCampaigns((prev) => [newCampaign, ...prev]);
      toast.success("AI Campaign launched successfully!");
      setShowAIForm(false);
      setHasGenerated(false);
      setAiName("");
      setAiSubject("");
      setAiBody("");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to send AI campaign";
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
        <div className="flex gap-3">
          <GlowButton onClick={() => { setShowAIForm(true); setShowForm(false); }} glowColor="cyan" className="bg-cyan-100 text-cyan-700 border border-cyan-200 hover:bg-cyan-200">
            <Sparkles className="h-4 w-4 mr-2" /> AI Generator
          </GlowButton>
          <GlowButton onClick={() => { setShowForm(true); setShowAIForm(false); }}>
            <Plus className="h-4 w-4 mr-1" /> Custom Campaign
          </GlowButton>
        </div>
      </div>

      {showForm && (
        <GlassCard glow="blue">
          <h3 className="font-semibold font-display mb-4">Create Standard Campaign</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted-foreground block mb-1.5">Campaign Name</label>
              <Input placeholder="Q2 Awareness Test" className="bg-muted/50 border-border" value={formName} onChange={(e) => setFormName(e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-muted-foreground block mb-1.5">Attack Type</label>
              <select className="flex h-10 w-full rounded-md border border-border bg-muted/50 px-3 py-2 text-sm" value={formAttackType} onChange={(e) => setFormAttackType(e.target.value)}>
                <option value="phishing">Phishing Email</option>
                <option value="spear_phishing">Spear Phishing</option>
                <option value="credential_harvest">Credential Harvest</option>
                <option value="malware_download">Malware Download</option>
                <option value="incident_drill">Incident Drill</option>
                <option value="smishing">Smishing (SMS)</option>
                <option value="vishing">Vishing (Voice)</option>
                <option value="qr_phishing">QR Phishing</option>
                <option value="business_email_compromise">BEC (Business Email Comp.)</option>
                <option value="whaling">Whaling (Exec. Target)</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground block mb-1.5">Target User Group</label>
              <select className="flex h-10 w-full rounded-md border border-border bg-muted/50 px-3 py-2 text-sm" value={formTargetGroup} onChange={(e) => setFormTargetGroup(e.target.value)}>
                <option value="">All Users</option>
                {departments.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground block mb-1.5">Email Template</label>
              <select className="flex h-10 w-full rounded-md border border-border bg-muted/50 px-3 py-2 text-sm" value={formTemplate} onChange={(e) => setFormTemplate(e.target.value)}>
                <option value="password_reset">Standard Password Reset</option>
                <option value="security_alert">Microsoft Security Alert</option>
              </select>
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <GlowButton size="sm" onClick={handleCreateStandard} disabled={creating}>{creating ? "Creating…" : "Launch Campaign"}</GlowButton>
            <GlowButton variant="outline" size="sm" glowColor="cyan" className="border-border text-foreground" onClick={() => setShowForm(false)}>Cancel</GlowButton>
          </div>
        </GlassCard>
      )}

      {showAIForm && (
        <GlassCard glow="cyan" className="border-cyan-200">
          <div className="flex items-center gap-2 mb-6">
            <Sparkles className="h-5 w-5 text-cyan-600" />
            <h3 className="text-lg font-semibold font-display text-cyan-700">Generate AI Phishing Email</h3>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            <div>
              <label className="text-sm text-muted-foreground block mb-1.5">Campaign Name</label>
              <Input placeholder="AI Generated Test 1" className="bg-muted/50 border-border" value={aiName} onChange={(e) => setAiName(e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-muted-foreground block mb-1.5">Target Department</label>
              <select className="flex h-10 w-full rounded-md border border-border bg-muted/50 px-3 py-2 text-sm" value={aiDepartment} onChange={(e) => setAiDepartment(e.target.value)}>
                <option value="" disabled>Select Department</option>
                {departments.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground block mb-1.5">Attack Type</label>
              <select className="flex h-10 w-full rounded-md border border-border bg-muted/50 px-3 py-2 text-sm" value={aiAttackType} onChange={(e) => setAiAttackType(e.target.value)}>
                <option value="phishing">Phishing Email</option>
                <option value="spear_phishing">Spear Phishing</option>
                <option value="credential_harvest">Credential Harvesting</option>
                <option value="malware_download">Malware Attachment</option>
                <option value="smishing">SMS Phishing (Smishing)</option>
                <option value="vishing">Voice Phishing (Vishing)</option>
                <option value="qr_phishing">QR Code Phishing</option>
                <option value="business_email_compromise">Business Email Compromise</option>
              </select>
            </div>
            
            <div>
              <label className="text-sm text-muted-foreground block mb-1.5">Target Theme</label>
              <select className="flex h-10 w-full rounded-md border border-border bg-muted/50 px-3 py-2 text-sm" value={aiTheme} onChange={(e) => setAiTheme(e.target.value)}>
                <option value="Microsoft Login">Microsoft Login</option>
                <option value="VPN Access">VPN Access</option>
                <option value="Salary Increase">Salary Increase</option>
                <option value="Urgent Invoice">Urgent Invoice</option>
                <option value="IT Maintenance">IT Maintenance</option>
                <option value="Security Alert">Security Alert</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground block mb-1.5">Tone Style</label>
              <select className="flex h-10 w-full rounded-md border border-border bg-muted/50 px-3 py-2 text-sm" value={aiTone} onChange={(e) => setAiTone(e.target.value)}>
                <option value="Urgent">Urgent</option>
                <option value="Professional">Professional</option>
                <option value="Friendly">Friendly</option>
                <option value="Threatening">Threatening</option>
              </select>
            </div>
             <div>
              <label className="text-sm text-muted-foreground block mb-1.5">Difficulty Level</label>
              <select className="flex h-10 w-full rounded-md border border-border bg-muted/50 px-3 py-2 text-sm" value={aiDifficulty} onChange={(e) => setAiDifficulty(e.target.value)}>
                <option value="Easy">Easy (Obvious errors)</option>
                <option value="Medium">Medium (Realistic but general)</option>
                <option value="Hard">Hard (Highly targeted & flawless)</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground block mb-1.5">AI Model</label>
              <select className="flex h-10 w-full rounded-md border border-border bg-muted/50 px-3 py-2 text-sm" value={aiModel} onChange={(e) => setAiModel(e.target.value)}>
                <option value="OpenAI GPT">OpenAI GPT</option>
                <option value="Claude">Claude</option>
                <option value="Llama">Llama</option>
                <option value="Gemini">Gemini</option>
              </select>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <GlowButton size="sm" glowColor="cyan" onClick={handleGenerateAI} disabled={generating || !aiDepartment}>
              <Sparkles className="h-4 w-4 mr-2" />
              {generating ? "Generating..." : "Generate AI Email"}
            </GlowButton>
            <GlowButton variant="outline" size="sm" onClick={() => setShowAIForm(false)} className="border-border text-foreground">
              Cancel
            </GlowButton>
          </div>

          {hasGenerated && (
            <div className="mt-8 pt-6 border-t border-border space-y-4 animate-in fade-in slide-in-from-bottom-4">
              <h4 className="font-semibold text-cyan-700">Email Composer</h4>
              <p className="text-sm text-muted-foreground">The AI has generated the following email. You may edit it before launching.</p>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Subject Line</label>
                  <Input value={aiSubject} onChange={(e) => setAiSubject(e.target.value)} className="font-mono text-sm bg-background border-border" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Email Body</label>
                  <Textarea value={aiBody} onChange={(e) => setAiBody(e.target.value)} rows={8} className="font-mono text-sm bg-background border-border" />
                  <p className="text-xs text-muted-foreground mt-2">Use {'{employee_name}'} to insert the target's name.</p>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Call-To-Action Text</label>
                  <Input value={aiCta} onChange={(e) => setAiCta(e.target.value)} className="font-mono text-sm bg-background border-border" />
                </div>
                
                <div className="pt-4 flex justify-end">
                  <GlowButton size="sm" onClick={handleSendAICampaign} disabled={creating} glowColor="blue">
                    <Send className="h-4 w-4 mr-2" />
                    {creating ? "Sending..." : "Send AI Campaign"}
                  </GlowButton>
                </div>
              </div>
            </div>
          )}
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
