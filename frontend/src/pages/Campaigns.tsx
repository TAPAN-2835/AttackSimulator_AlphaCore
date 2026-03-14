import { useEffect, useState } from "react";
import { Plus, Sparkles, Send, Trash2, Target, MessageCircle, ExternalLink, Loader2 } from "lucide-react";
import GlassCard from "@/components/GlassCard";
import GlowButton from "@/components/GlowButton";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
} from "@/components/ui/dialog";
import { fetchCampaigns, createCampaign, fetchDepartments, generateAIEmail, clearAllCampaigns, fetchCampaignDetail, fetchWhatsAppLink, type CampaignOut, type CampaignDetail, type TargetOut } from "@/lib/api";
import { toast } from "sonner";
import { attackOptionsByChannel, type ChannelKey } from "@/config/attackChannels";

const attackTypeMap: Record<string, string> = Object.values(attackOptionsByChannel)
  .flat()
  .reduce<Record<string, string>>((acc, opt) => {
    acc[opt.value] = opt.label;
    return acc;
  }, {});

const statusColor: Record<string, string> = {
  Active: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
  running: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
  Completed: "bg-primary/10 text-primary border-primary/20 dark:bg-primary/20 dark:text-primary-foreground",
  completed: "bg-primary/10 text-primary border-primary/20 dark:bg-primary/20 dark:text-primary-foreground",
  Scheduled: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
  scheduled: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
  Draft: "bg-muted text-muted-foreground border-border",
  draft: "bg-muted text-muted-foreground border-border",
};

const Campaigns = () => {
  const [showForm, setShowForm] = useState(false);
  const [showAIForm, setShowAIForm] = useState(false);
  const [showDirectForm, setShowDirectForm] = useState(false);
  const [campaigns, setCampaigns] = useState<CampaignOut[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Target List Modal State
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isLinking, setIsLinking] = useState(false);

  // Default Form state
  const [formName, setFormName] = useState("");
  const [formChannelType, setFormChannelType] = useState<ChannelKey>("EMAIL");
  const [formAttackType, setFormAttackType] = useState<string>(
    attackOptionsByChannel["EMAIL"][0]?.value ?? "phishing",
  );
  const [formTargetGroup, setFormTargetGroup] = useState("");
  const [formTemplate, setFormTemplate] = useState("password_reset");
  const [formSchedule, setFormSchedule] = useState("");

  // Direct Attack Form state
  const [directEmail, setDirectEmail] = useState("");
  const [directName, setDirectName] = useState("");
  const [directPhone, setDirectPhone] = useState("");
  const [directTargetType, setDirectTargetType] = useState<"email" | "phone">("email");
  const [directDept, setDirectDept] = useState("");
  const [directChannel, setDirectChannel] = useState<ChannelKey>("EMAIL");
  const [directAttack, setDirectAttack] = useState<string>(
    attackOptionsByChannel["EMAIL"][0]?.value ?? "phishing"
  );

  // AI Form state
  const [aiName, setAiName] = useState("");
  const [aiChannelType, setAiChannelType] = useState<ChannelKey>("EMAIL");
  const [aiAttackType, setAiAttackType] = useState<string>(
    attackOptionsByChannel["EMAIL"][0]?.value ?? "phishing",
  );
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

  // When the standard form channel changes, reset the attack type list + selection
  const handleFormChannelChange = (next: ChannelKey) => {
    setFormChannelType(next);
    const first = attackOptionsByChannel[next][0];
    setFormAttackType(first ? first.value : "");
  };

  // When the AI generator channel changes, reset its attack types as well
  const handleAiChannelChange = (next: ChannelKey) => {
    setAiChannelType(next);
    const first = attackOptionsByChannel[next][0];
    setAiAttackType(first ? first.value : "");
  };

  const handleCreateStandard = async () => {
    if (!formName) { toast.error("Campaign name is required"); return; }
    setCreating(true);
    try {
      const newCampaign = await createCampaign({
        campaign_name: formName,
        channel_type: formChannelType,
        attack_type: formAttackType,
        target_group: formTargetGroup || undefined,
        template_name: formTemplate,
        schedule_date: formSchedule ? new Date(formSchedule).toISOString() : undefined,
      });
      setCampaigns((prev) => [newCampaign, ...prev]);
      toast.success("Campaign created!");
      setShowForm(false);
      setFormName("");
      setFormChannelType("EMAIL");
      setFormAttackType(attackOptionsByChannel["EMAIL"][0]?.value ?? "phishing");
      setFormTargetGroup("");
      setFormTemplate("password_reset");
      setFormSchedule("");
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
      const attackOptions = attackOptionsByChannel[aiChannelType];
      const attackLabel =
        attackOptions.find((opt) => opt.value === aiAttackType)?.label ?? aiAttackType;

      const response = await generateAIEmail({
        attack_type: `Channel: ${aiChannelType} | Attack Type: ${attackLabel}`,
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
        channel_type: aiChannelType,
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
      setAiChannelType("EMAIL");
      setAiAttackType(attackOptionsByChannel["EMAIL"][0]?.value ?? "phishing");
      setAiSubject("");
      setAiBody("");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to send AI campaign";
      toast.error(message);
    } finally {
      setCreating(false);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm("Are you sure you want to clear all campaigns? This action cannot be undone.")) return;
    try {
      await clearAllCampaigns();
      setCampaigns([]);
      toast.success("All campaigns cleared");
    } catch (err) {
      toast.error("Failed to clear campaigns");
    }
  };

  const handleViewTargets = async (campaignId: number) => {
    setIsLoadingDetail(true);
    try {
      const detail = await fetchCampaignDetail(campaignId);
      setSelectedCampaign(detail);
    } catch (err) {
      toast.error("Failed to load campaign targets");
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleSendWhatsApp = async (campaignId: number, target: TargetOut) => {
    setIsLinking(true);
    try {
      const { whatsapp_link } = await fetchWhatsAppLink(campaignId, target.id);
      window.open(whatsapp_link, "_blank");
      toast.success(`WhatsApp message prepared for ${target.name || target.email}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to generate WhatsApp link");
    } finally {
      setIsLinking(false);
    }
  };

  const rows = campaigns.map((c) => ({
    key: String(c.id), name: c.name,
    channel: c.channel_type || "EMAIL",
    type: attackTypeMap[c.attack_type] || c.attack_type,
    status: c.status, targets: "—", clickRate: "—",
  }));

  const handleCreateDirect = async () => {
    const targetValue = directTargetType === "email" ? directEmail : directPhone;
    if (!targetValue) { 
        toast.error(`Target ${directTargetType} is required for direct attack`); 
        return; 
    }
    setCreating(true);
    try {
      const newCampaign = await createCampaign({
        campaign_name: `Direct Attack: ${targetValue.split('@')[0]}`,
        channel_type: directChannel,
        attack_type: directAttack,
        target_group: directDept || "General",
        direct_target_email: directTargetType === "email" ? directEmail : undefined,
        direct_target_name: directName || undefined,
        direct_target_phone: directTargetType === "phone" ? directPhone : undefined,
        template_name: directChannel === "EMAIL" ? "password_reset" : undefined,
      });
      setCampaigns((prev) => [newCampaign, ...prev]);
      
      if (directChannel === "WHATSAPP") {
          toast.success("Direct attack created! Preparing WhatsApp link...");
          // Need to fetch details to get the target.id
          const detail = await fetchCampaignDetail(newCampaign.id);
          const target = detail.targets[0];
          if (target) {
             const { whatsapp_link } = await fetchWhatsAppLink(newCampaign.id, target.id);
             window.open(whatsapp_link, "_blank");
          } else {
             toast.info("WhatsApp link couldn't be auto-opened. Please check campaign targets.");
          }
      } else {
          toast.success("Direct attack launched!");
      }
      
      setShowDirectForm(false);
      setDirectEmail("");
      setDirectName("");
      setDirectPhone("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to launch attack");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">Campaign Manager</h1>
          <p className="text-muted-foreground text-sm mt-1">Create and manage attack simulations</p>
        </div>
        <div className="flex gap-3">
          <GlowButton onClick={handleClearAll} variant="outline" glowColor="purple" className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/30 dark:text-red-400 dark:hover:bg-red-900/20">
            <Trash2 className="h-4 w-4 mr-2" /> Clear All
          </GlowButton>
          <GlowButton onClick={() => { setShowDirectForm(true); setShowForm(false); setShowAIForm(false); }} glowColor="purple" className="bg-orange-100 text-orange-700 border border-orange-200 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800 dark:hover:bg-orange-900/50">
            <Target className="h-4 w-4 mr-2" /> Direct Attack
          </GlowButton>
          <GlowButton onClick={() => { setShowAIForm(true); setShowForm(false); setShowDirectForm(false); }} glowColor="cyan" className="bg-cyan-100 text-cyan-700 border border-cyan-200 hover:bg-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-400 dark:border-cyan-800 dark:hover:bg-cyan-900/50">
            <Sparkles className="h-4 w-4 mr-2" /> AI Generator
          </GlowButton>
          <GlowButton onClick={() => { setShowForm(true); setShowAIForm(false); setShowDirectForm(false); }}>
            <Plus className="h-4 w-4 mr-1" /> Custom Campaign
          </GlowButton>
        </div>
      </div>

      {showDirectForm && (
        <GlassCard glow="purple" className="border-orange-200 dark:border-orange-800">
          <div className="flex items-center gap-2 mb-6">
            <Target className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            <h3 className="text-lg font-semibold font-display text-orange-700 dark:text-orange-500">Fast Attack (Single Target)</h3>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            <div>
              <label className="text-sm text-muted-foreground block mb-1.5">Target Type</label>
              <select
                className="flex h-10 w-full rounded-md border border-border bg-muted/50 px-3 py-2 text-sm"
                value={directTargetType}
                onChange={(e) => setDirectTargetType(e.target.value as "email" | "phone")}
              >
                <option value="email">Email</option>
                <option value="phone">Phone Number</option>
              </select>
            </div>
            {directTargetType === "email" ? (
              <div>
                <label className="text-sm text-muted-foreground block mb-1.5">Target Email</label>
                <Input placeholder="victim@company.com" className="bg-muted/50 border-border" value={directEmail} onChange={(e) => setDirectEmail(e.target.value)} />
              </div>
            ) : (
              <div>
                <label className="text-sm text-muted-foreground block mb-1.5">Target Phone</label>
                <Input placeholder="+91..." className="bg-muted/50 border-border" value={directPhone} onChange={(e) => setDirectPhone(e.target.value)} />
              </div>
            )}
            <div>
              <label className="text-sm text-muted-foreground block mb-1.5">Target Name (Optional)</label>
              <Input placeholder="John Doe" className="bg-muted/50 border-border" value={directName} onChange={(e) => setDirectName(e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-muted-foreground block mb-1.5">Department</label>
              <select className="flex h-10 w-full rounded-md border border-border bg-muted/50 px-3 py-2 text-sm" value={directDept} onChange={(e) => setDirectDept(e.target.value)}>
                <option value="">General</option>
                {departments.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground block mb-1.5">Channel</label>
              <select
                className="flex h-10 w-full rounded-md border border-border bg-muted/50 px-3 py-2 text-sm"
                value={directChannel}
                onChange={(e) => {
                  setDirectChannel(e.target.value as ChannelKey);
                  const first = attackOptionsByChannel[e.target.value as ChannelKey][0];
                  setDirectAttack(first ? first.value : "");
                }}
              >
                <option value="EMAIL">Email</option>
                <option value="SMS">SMS</option>
                <option value="WHATSAPP">WhatsApp</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground block mb-1.5">Attack Type</label>
              <select
                className="flex h-10 w-full rounded-md border border-border bg-muted/50 px-3 py-2 text-sm"
                value={directAttack}
                onChange={(e) => setDirectAttack(e.target.value)}
              >
                {attackOptionsByChannel[directChannel].map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-6 flex gap-3">
            <GlowButton size="sm" glowColor="purple" onClick={handleCreateDirect} disabled={creating || (directTargetType === "email" ? !directEmail : !directPhone)}>
              <Send className="h-4 w-4 mr-2" />
              {creating ? "Launching..." : "Launch Direct Attack"}
            </GlowButton>
            <GlowButton variant="outline" size="sm" onClick={() => setShowDirectForm(false)} className="border-border text-foreground">
              Cancel
            </GlowButton>
          </div>
        </GlassCard>
      )}
      {showForm && (
        <GlassCard glow="blue">
          <h3 className="font-semibold font-display mb-4">Create Standard Campaign</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted-foreground block mb-1.5">Campaign Name</label>
              <Input placeholder="Q2 Awareness Test" className="bg-muted/50 border-border" value={formName} onChange={(e) => setFormName(e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-muted-foreground block mb-1.5">Channel</label>
              <select
                className="flex h-10 w-full rounded-md border border-border bg-muted/50 px-3 py-2 text-sm"
                value={formChannelType}
                onChange={(e) => handleFormChannelChange(e.target.value as ChannelKey)}
              >
                <option value="EMAIL">Email</option>
                <option value="SMS">SMS</option>
                <option value="WHATSAPP">WhatsApp</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground block mb-1.5">Attack Type</label>
              <select
                className="flex h-10 w-full rounded-md border border-border bg-muted/50 px-3 py-2 text-sm"
                value={formAttackType}
                onChange={(e) => setFormAttackType(e.target.value)}
              >
                {attackOptionsByChannel[formChannelType].map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
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
        <GlassCard glow="cyan" className="border-cyan-200 dark:border-cyan-800">
          <div className="flex items-center gap-2 mb-6">
            <Sparkles className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
            <h3 className="text-lg font-semibold font-display text-cyan-700 dark:text-cyan-500">Generate AI Phishing Email</h3>
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
              <label className="text-sm text-muted-foreground block mb-1.5">Channel</label>
              <select
                className="flex h-10 w-full rounded-md border border-border bg-muted/50 px-3 py-2 text-sm"
                value={aiChannelType}
                onChange={(e) => handleAiChannelChange(e.target.value as ChannelKey)}
              >
                <option value="EMAIL">Email</option>
                <option value="SMS">SMS</option>
                <option value="WHATSAPP">WhatsApp</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground block mb-1.5">Attack Type</label>
              <select
                className="flex h-10 w-full rounded-md border border-border bg-muted/50 px-3 py-2 text-sm"
                value={aiAttackType}
                onChange={(e) => setAiAttackType(e.target.value)}
              >
                {attackOptionsByChannel[aiChannelType].map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
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
              <h4 className="font-semibold text-cyan-700 dark:text-cyan-500">Email Composer</h4>
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
              <TableHead>Channel</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Targets</TableHead>
              <TableHead>Click Rate</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((c) => (
               <TableRow key={c.key} className="border-border">
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell className="text-muted-foreground">{c.channel}</TableCell>
                <TableCell className="text-muted-foreground">{c.type}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={statusColor[c.status] || "bg-muted text-muted-foreground border-border"}>{c.status}</Badge>
                </TableCell>
                <TableCell>{c.targets}</TableCell>
                <TableCell>{c.clickRate}</TableCell>
                <TableCell className="text-right">
                   <GlowButton 
                     size="sm" 
                     variant="outline" 
                     glowColor="blue" 
                     className="h-8 px-2"
                     onClick={() => handleViewTargets(Number(c.key))}
                   >
                     <Target className="h-4 w-4 mr-1" />
                     View Targets
                   </GlowButton>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No campaigns found. Create your first simulation.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

      {/* Target Details Modal */}
      <Dialog open={!!selectedCampaign} onOpenChange={(open) => !open && setSelectedCampaign(null)}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto glass border-border/50">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold font-display flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Campaign Targets: {selectedCampaign?.name}
            </DialogTitle>
            <DialogDescription>
              Manage individual targets and manual outreach for this campaign.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead>Target</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Activity</TableHead>
                  <TableHead className="text-right">Outreach</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedCampaign?.targets.map((t) => (
                  <TableRow key={t.id} className="border-border/40">
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{t.name || "Unknown User"}</span>
                        <span className="text-[10px] text-muted-foreground">{t.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-muted/50 font-normal">
                        {t.department || "General"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {t.email_sent && <span className="text-[10px] text-green-500 flex items-center gap-1">• Email Sent</span>}
                        {t.sms_sent && <span className="text-[10px] text-green-500 flex items-center gap-1">• SMS Sent</span>}
                        {t.whatsapp_sent && <span className="text-[10px] text-green-500 flex items-center gap-1">• WA Sent</span>}
                        {!t.email_sent && !t.sms_sent && !t.whatsapp_sent && <span className="text-[10px] text-orange-500 flex items-center gap-1">• Pending</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                         {t.email_opened && <Badge className="text-[9px] bg-blue-500/10 text-blue-500 border-blue-500/20">Opened</Badge>}
                         {t.link_clicked && <Badge className="text-[9px] bg-orange-500/10 text-orange-500 border-orange-500/20">Clicked</Badge>}
                         {t.credential_attempt && <Badge className="text-[9px] bg-red-500/10 text-red-500 border-red-500/20">PW Entered</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <GlowButton 
                        size="sm" 
                        glowColor="cyan" 
                        className="h-8 bg-green-500/10 hover:bg-green-500/20 text-green-600 border-green-500/20 dark:text-green-400"
                        onClick={() => handleSendWhatsApp(selectedCampaign.id, t)}
                        disabled={isLinking}
                      >
                        <MessageCircle className="h-4 w-4 mr-1" />
                        WA
                      </GlowButton>
                    </TableCell>
                  </TableRow>
                ))}
                {selectedCampaign?.targets.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No targets found for this campaign.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Campaigns;
