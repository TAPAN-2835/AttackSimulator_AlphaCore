import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Mail, KeyRound, Bug, Eye, Copy, X, PlusCircle } from "lucide-react";
import GlassCard from "@/components/GlassCard";
import GlowButton from "@/components/GlowButton";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export interface SimTemplate {
  id: string;
  name: string;
  type: "Phishing" | "Credential" | "Malware";
  difficulty: string;
  usage: number;
  color: string;
  subject: string;
  body: string;
  cta_text: string;
  landing_page: string;
}

export const TEMPLATE_REGISTRY: SimTemplate[] = [
  {
    id: "urgent_invoice",
    name: "Urgent Invoice #4821",
    type: "Phishing",
    difficulty: "Medium",
    usage: 452,
    color: "blue",
    subject: "URGENT: Invoice #4821 – Immediate Payment Required",
    body:
      "Dear {employee_name},\n\nWe have received an outstanding invoice (#4821) associated with your account that requires immediate attention.\n\nFailure to review and approve this invoice within 24 hours may result in service interruption.\n\nPlease click the button below to view and approve the invoice securely.\n\n[View Invoice]\n\nFinance & Accounts Team",
    cta_text: "View Invoice",
    landing_page: "/phish/invoice",
  },
  {
    id: "m365_reauth",
    name: "Microsoft 365 Re-authentication",
    type: "Credential",
    difficulty: "High",
    usage: 890,
    color: "purple",
    subject: "Action Required: Microsoft 365 Session Expiring",
    body:
      "Dear {employee_name},\n\nYour Microsoft 365 session has expired due to a recent security policy update.\n\nTo avoid service disruption and maintain access to your emails, files, and Teams meetings, please re-authenticate your account immediately.\n\nClick the button below to verify your identity and restore access.\n\n[Re-authenticate Now]\n\nIT Security Team",
    cta_text: "Re-authenticate Now",
    landing_page: "/phish/m365-login",
  },
  {
    id: "salary_increase",
    name: "Salary Increase Notification",
    type: "Phishing",
    difficulty: "High",
    usage: 120,
    color: "blue",
    subject: "Confidential: Your Salary Increase Notification",
    body:
      "Dear {employee_name},\n\nWe are pleased to inform you that based on your recent performance review, you have been approved for a salary increase effective this quarter.\n\nDetails of your updated compensation package are available in a confidential document. Please click below to securely view your offer letter.\n\n[View Details]\n\nHuman Resources Department",
    cta_text: "View Details",
    landing_page: "/phish/salary",
  },
  {
    id: "it_maintenance",
    name: "IT System Maintenance",
    type: "Malware",
    difficulty: "Low",
    usage: 230,
    color: "cyan",
    subject: "Scheduled: Mandatory IT Maintenance Tool Update",
    body:
      "Dear {employee_name},\n\nOur IT department will be conducting essential system maintenance this weekend. All employees are required to run the diagnostic tool to ensure your workstation is compatible with the upcoming infrastructure upgrade.\n\nPlease download and run the tool before Friday 5:00 PM to avoid any disruption to your access credentials.\n\n[Download Tool]\n\nIT Operations Team",
    cta_text: "Download Tool",
    landing_page: "/phish/it-tool",
  },
  {
    id: "parking_ticket",
    name: "Unpaid Parking Ticket",
    type: "Phishing",
    difficulty: "Medium",
    usage: 567,
    color: "blue",
    subject: "Notice: Unpaid Parking Violation – Action Required",
    body:
      "Dear {employee_name},\n\nOur records indicate that you have an outstanding parking violation associated with your registered vehicle on company premises.\n\nTo avoid an escalation fee, please settle the amount within 48 hours using our secure payment portal.\n\n[Pay Fine]\n\nFacilities Management Office",
    cta_text: "Pay Fine",
    landing_page: "/phish/parking",
  },
  {
    id: "vpn_update",
    name: "Corporate VPN Update",
    type: "Credential",
    difficulty: "Medium",
    usage: 310,
    color: "purple",
    subject: "Action Required: Corporate VPN Certificate Renewal",
    body:
      "Dear {employee_name},\n\nYour corporate VPN certificate is expiring in 48 hours. To maintain secure remote access, you must update your VPN credentials before the deadline.\n\nFailure to update may result in loss of remote access to internal systems and files.\n\nClick below to update your VPN credentials securely.\n\n[Update Now]\n\nNetwork Security Team",
    cta_text: "Update Now",
    landing_page: "/phish/vpn",
  },
];

// ── Preview Modal ──────────────────────────────────────────────────────────────

const PreviewModal = ({
  template,
  onClose,
}: {
  template: SimTemplate;
  onClose: () => void;
}) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl bg-background border border-border rounded-xl shadow-2xl p-6 space-y-4 overflow-y-auto max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Email Preview</p>
            <h2 className="text-lg font-bold font-display">{template.name}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors mt-1"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Simulated email card */}
        <div className="rounded-lg border border-border bg-muted/30 overflow-hidden">
          {/* Email header bar */}
          <div className="bg-muted/60 px-4 py-3 border-b border-border">
            <p className="text-[11px] text-muted-foreground mb-0.5">
              <span className="font-medium text-foreground">From:</span> security-noreply@alphacore.io
            </p>
            <p className="text-[11px] text-muted-foreground">
              <span className="font-medium text-foreground">Subject:</span>{" "}
              <span className="text-foreground">{template.subject}</span>
            </p>
          </div>


          {/* Email body */}
          <div className="p-5 space-y-3 text-sm text-foreground/90">
            {template.body.split("\n").map((line, i) => {
              const ctaMatch = line.match(/^\[(.+)\]$/);
              if (ctaMatch) {
                return (
                  <div key={i} className="py-1">
                    <span className="inline-block bg-primary/80 text-primary-foreground px-4 py-2 rounded text-sm font-semibold cursor-default">
                      {ctaMatch[1]}
                    </span>
                    <span className="ml-2 text-[10px] text-muted-foreground italic">← tracked link</span>
                  </div>
                );
              }
              if (line.trim() === "") return <br key={i} />;
              return <p key={i} className="leading-relaxed">{line}</p>;
            })}
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Close preview
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main component ─────────────────────────────────────────────────────────────

const Templates = () => {
  const [filter, setFilter] = useState("All");
  const [previewTemplate, setPreviewTemplate] = useState<SimTemplate | null>(null);
  const navigate = useNavigate();

  const filteredTemplates =
    filter === "All"
      ? TEMPLATE_REGISTRY
      : TEMPLATE_REGISTRY.filter((t) => t.type === filter);

  const handleUseTemplate = (template: SimTemplate) => {
    navigate(`/dashboard/create-campaign?templateId=${template.id}`);
  };

  return (
    <>
      {previewTemplate && (
        <PreviewModal
          template={previewTemplate}
          onClose={() => setPreviewTemplate(null)}
        />
      )}

      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-display">Simulation Template Library</h1>
            <p className="text-muted-foreground text-sm mt-1">Pre-built attack scenarios and templates</p>
          </div>
          <GlowButton>
            <PlusCircle className="h-4 w-4 mr-2" /> Create Custom
          </GlowButton>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search templates..." className="pl-10 bg-muted/50 border-border" />
          </div>
          <div className="flex gap-2">
            {["All", "Phishing", "Credential", "Malware"].map((t) => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={`px-4 py-2 rounded-md text-sm transition-all ${
                  filter === t
                    ? "bg-primary text-primary-foreground font-medium glow-blue"
                    : "bg-muted/50 border border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <GlassCard key={template.id} glow={template.color as "blue" | "purple" | "cyan"} className="group flex flex-col h-full">
              <div className="flex items-center justify-between mb-4">
                <div
                  className={`p-2 rounded-lg ${
                    template.color === "blue"
                      ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                      : template.color === "purple"
                      ? "bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400"
                      : "bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400"
                  }`}
                >
                  {template.type === "Phishing" && <Mail className="h-5 w-5" />}
                  {template.type === "Credential" && <KeyRound className="h-5 w-5" />}
                  {template.type === "Malware" && <Bug className="h-5 w-5" />}
                </div>
                <Badge variant="outline" className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {template.difficulty}
                </Badge>
              </div>

              <h3 className="font-semibold font-display text-lg mb-1 group-hover:text-primary transition-colors">
                {template.name}
              </h3>
              <p className="text-xs text-muted-foreground mb-1 italic truncate">
                Subject: {template.subject}
              </p>
              <p className="text-sm text-muted-foreground mb-6 flex-1">
                Used in {template.usage} simulations this month. {template.difficulty} detection rate.
              </p>

              <div className="flex items-center justify-between pt-4 border-t border-border/50">
                <button
                  className="text-xs flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setPreviewTemplate(template)}
                >
                  <Eye className="h-3.5 w-3.5" /> Preview
                </button>
                <button
                  className="text-xs flex items-center gap-1.5 text-primary hover:text-primary/80 font-medium transition-colors"
                  onClick={() => handleUseTemplate(template)}
                >
                  <Copy className="h-3.5 w-3.5" /> Use Template
                </button>
              </div>
            </GlassCard>
          ))}
        </div>
      </div>
    </>
  );
};

export default Templates;
