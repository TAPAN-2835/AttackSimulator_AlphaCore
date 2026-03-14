import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Mail,
  KeyRound,
  Bug,
  Send,
  Clock,
  ChevronDown,
} from "lucide-react";
import GlassCard from "@/components/GlassCard";
import GlowButton from "@/components/GlowButton";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { createCampaign, fetchDepartments } from "@/lib/api";
import { TEMPLATE_REGISTRY, SimTemplate } from "./Templates";

// ── Helpers ────────────────────────────────────────────────────────────────────

const typeToAttackType: Record<string, string> = {
  Phishing: "phishing",
  Credential: "credential_harvest",
  Malware: "malware_download",
};

const TypeIcon = ({ type }: { type: string }) => {
  const cls = "h-5 w-5";
  if (type === "Phishing") return <Mail className={`${cls} text-primary`} />;
  if (type === "Credential") return <KeyRound className={`${cls} text-secondary`} />;
  return <Bug className={`${cls} text-accent`} />;
};

const difficultyColor: Record<string, string> = {
  Low: "bg-green-500/20 text-green-400 border-green-500/30",
  Medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  High: "bg-red-500/20 text-red-400 border-red-500/30",
};

// ── Component ──────────────────────────────────────────────────────────────────

const CreateCampaign = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const templateId = searchParams.get("templateId") ?? "";

  // Resolve template from the local registry (no round-trip needed)
  const template: SimTemplate | undefined = TEMPLATE_REGISTRY.find((t) => t.id === templateId);

  // ── Form state ───────────────────────────────────────────────────────────────
  const [campaignName, setCampaignName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [department, setDepartment] = useState("all");
  const [sendMode, setSendMode] = useState<"immediate" | "scheduled">("immediate");
  const [scheduleDate, setScheduleDate] = useState("");
  const [departments, setDepartments] = useState<string[]>([]);
  const [launching, setLaunching] = useState(false);

  // Pre-fill from template on mount
  useEffect(() => {
    if (template) {
      setSubject(template.subject);
      setBody(template.body);
      const today = new Date().toISOString().slice(0, 10);
      setCampaignName(`${template.name} — ${today}`);
    }
  }, [template]);

  // Load departments from backend
  useEffect(() => {
    fetchDepartments()
      .then(setDepartments)
      .catch(() => {
        // fallback to known departments if API not yet running
        setDepartments(["Finance", "HR", "IT", "Marketing"]);
      });
  }, []);

  const handleLaunch = async () => {
    if (!template) {
      toast.error("No template selected.");
      return;
    }
    if (!campaignName.trim()) {
      toast.error("Campaign name is required.");
      return;
    }
    if (!subject.trim()) {
      toast.error("Email subject is required.");
      return;
    }

    setLaunching(true);
    try {
      await createCampaign({
        campaign_name: campaignName,
        attack_type: typeToAttackType[template.type] || "phishing",
        template_name: template.id,
        subject: subject,
        body: body,
        target_group: department === "all" ? undefined : department,
        schedule_date:
          sendMode === "scheduled" && scheduleDate
            ? new Date(scheduleDate).toISOString()
            : undefined,
      });
      toast.success("Campaign launched successfully!");
      navigate("/dashboard/campaigns");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to launch campaign";
      toast.error(message);
    } finally {
      setLaunching(false);
    }
  };

  // ── No template found ─────────────────────────────────────────────────────────
  if (!template) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
        <Mail className="h-12 w-12 text-muted-foreground/40" />
        <h2 className="text-xl font-bold font-display">No Template Selected</h2>
        <p className="text-muted-foreground text-sm max-w-xs">
          Please go back to the Template Library and click "Use Template" on a simulation card.
        </p>
        <GlowButton onClick={() => navigate("/dashboard/templates")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Template Library
        </GlowButton>
      </div>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Page header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/dashboard/templates")}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold font-display">Create Campaign</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Customize and launch a phishing simulation
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* ── Left column: Template info + config ────────────────────────── */}
        <div className="lg:col-span-2 space-y-5">
          {/* Template badge */}
          <GlassCard glow={template.color as any} className="flex items-center gap-4">
            <div
              className={`p-3 rounded-lg bg-${
                template.color === "blue"
                  ? "primary"
                  : template.color === "purple"
                  ? "secondary"
                  : "accent"
              }/10 shrink-0`}
            >
              <TypeIcon type={template.type} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">
                Selected Template
              </p>
              <h3 className="font-semibold font-display text-base leading-tight">
                {template.name}
              </h3>
            </div>
            <Badge
              variant="outline"
              className={`ml-auto shrink-0 text-[10px] uppercase tracking-wider ${
                difficultyColor[template.difficulty] || ""
              }`}
            >
              {template.difficulty}
            </Badge>
          </GlassCard>

          {/* Campaign Name */}
          <GlassCard>
            <label className="text-sm font-medium text-foreground block mb-1.5">
              Campaign Name
            </label>
            <Input
              id="campaign-name"
              placeholder="e.g. Q2 Finance Phishing Test"
              className="bg-muted/50 border-border"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
            />
          </GlassCard>

          {/* Email Subject */}
          <GlassCard>
            <label className="text-sm font-medium text-foreground block mb-1.5">
              Email Subject
              <span className="ml-2 text-xs text-muted-foreground font-normal">(editable)</span>
            </label>
            <Input
              id="email-subject"
              placeholder="Email subject line..."
              className="bg-muted/50 border-border"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </GlassCard>

          {/* Email Body */}
          <GlassCard>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium text-foreground">
                Email Body
                <span className="ml-2 text-xs text-muted-foreground font-normal">(editable)</span>
              </label>
              <span className="text-[10px] text-muted-foreground bg-muted/60 px-2 py-0.5 rounded">
                [Button Text] → tracked phishing link
              </span>
            </div>
            <textarea
              id="email-body"
              rows={12}
              placeholder="Write your email body here..."
              className="w-full rounded-md border border-border bg-muted/50 px-3 py-2.5 text-sm font-mono resize-y focus:outline-none focus:ring-1 focus:ring-primary/50 leading-relaxed"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground mt-1.5">
              Use <code className="bg-muted px-1 rounded">{"{employee_name}"}</code> for personalization.
              Wrap CTA text in square brackets like{" "}
              <code className="bg-muted px-1 rounded">[Click Here]</code> to insert a tracked link.
            </p>
          </GlassCard>
        </div>

        {/* ── Right column: Department + Send mode ───────────────────────── */}
        <div className="space-y-5">
          {/* Department */}
          <GlassCard className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Target Department</h3>
            <div className="relative">
              <select
                id="department-select"
                className="w-full appearance-none rounded-md border border-border bg-muted/50 px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 pr-8"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              >
                <option value="all">All Employees</option>
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
                {/* Fallback options in case DB has no departments yet */}
                {departments.length === 0 && (
                  <>
                    <option value="Finance">Finance</option>
                    <option value="HR">HR</option>
                    <option value="IT">IT</option>
                    <option value="Marketing">Marketing</option>
                  </>
                )}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Select a department to target. Choose "All Employees" to send to everyone.
            </p>
          </GlassCard>

          {/* Send Mode */}
          <GlassCard className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Send Mode</h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                id="send-immediate"
                type="button"
                onClick={() => setSendMode("immediate")}
                className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-lg border text-xs font-medium transition-all ${
                  sendMode === "immediate"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-muted/30 text-muted-foreground hover:text-foreground"
                }`}
              >
                <Send className="h-4 w-4" />
                Immediate
              </button>
              <button
                id="send-scheduled"
                type="button"
                onClick={() => setSendMode("scheduled")}
                className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-lg border text-xs font-medium transition-all ${
                  sendMode === "scheduled"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-muted/30 text-muted-foreground hover:text-foreground"
                }`}
              >
                <Clock className="h-4 w-4" />
                Scheduled
              </button>
            </div>

            {sendMode === "scheduled" && (
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Schedule Date & Time</label>
                <Input
                  id="schedule-datetime"
                  type="datetime-local"
                  className="bg-muted/50 border-border text-sm"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                />
              </div>
            )}
          </GlassCard>

          {/* Summary */}
          <GlassCard className="space-y-2 text-xs text-muted-foreground">
            <h3 className="text-sm font-semibold text-foreground mb-2">Campaign Summary</h3>
            <div className="flex justify-between">
              <span>Template</span>
              <span className="text-foreground font-medium truncate max-w-[120px] text-right">
                {template.name}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Type</span>
              <span className="text-foreground font-medium">{template.type}</span>
            </div>
            <div className="flex justify-between">
              <span>Department</span>
              <span className="text-foreground font-medium">
                {department === "all" ? "All Employees" : department}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Send Mode</span>
              <span className="text-foreground font-medium capitalize">{sendMode}</span>
            </div>
          </GlassCard>

          {/* Launch button */}
          <GlowButton
            className="w-full justify-center"
            onClick={handleLaunch}
            disabled={launching}
          >
            {launching ? (
              <>
                <div className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin mr-2" />
                Launching…
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Launch Campaign
              </>
            )}
          </GlowButton>
        </div>
      </div>
    </div>
  );
};

export default CreateCampaign;
