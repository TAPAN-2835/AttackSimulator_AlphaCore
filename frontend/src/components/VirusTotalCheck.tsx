import { useState } from "react";
import { ShieldCheck, ExternalLink, Loader2, AlertCircle, FileSearch, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { checkUrlWithVirusTotal, checkFileUrlWithVirusTotal, type VirusTotalResult } from "@/lib/api";
import GlassCard from "@/components/GlassCard";

interface VirusTotalCheckProps {
  /** Optional compact layout for sidebar */
  compact?: boolean;
  /** Optional card title override */
  title?: string;
  /** Optional glow for the card */
  glow?: "blue" | "purple" | "cyan" | "none";
}

const VirusTotalCheck = ({ compact = false, title, glow = "cyan" }: VirusTotalCheckProps) => {
  const [url, setUrl] = useState("");
  const [mode, setMode] = useState<"web" | "file">("web");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VirusTotalResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCheck = async () => {
    const u = url.trim();
    if (!u) return;
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const res = mode === "web" 
        ? await checkUrlWithVirusTotal({ url: u })
        : await checkFileUrlWithVirusTotal({ url: u });
        
      if (res.checked && res.result) {
        setResult(res.result);
      } else {
        setError(res.error || "Check failed. Ensure VirusTotal API key is configured.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  };

  const displayTitle = title ?? "VirusTotal Scanner";

  return (
    <GlassCard glow={glow} className={compact ? "p-4" : "p-5"}>
      <div className="flex items-center justify-between mb-3">
        <h3 className={`font-semibold font-display flex items-center gap-2 ${compact ? "text-xs" : "text-sm"}`}>
          <ShieldCheck className="h-4 w-4 text-primary" />
          {displayTitle}
        </h3>
        
        <div className="flex bg-muted rounded-md p-1 border">
           <button 
             onClick={() => setMode("web")}
             className={`px-2 py-1 text-xs rounded-sm outline-none transition-colors flex items-center gap-1 ${mode === "web" ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"}`}
           >
             <Globe className="h-3 w-3" /> <span className={compact ? "hidden sm:inline" : ""}>Web</span>
           </button>
           <button 
             onClick={() => setMode("file")}
             className={`px-2 py-1 text-xs rounded-sm outline-none transition-colors flex items-center gap-1 ${mode === "file" ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"}`}
           >
             <FileSearch className="h-3 w-3" /> <span className={compact ? "hidden sm:inline" : ""}>File</span>
           </button>
        </div>
      </div>
      
      <div className="space-y-3">
        <div className="flex gap-2">
          <Input
            placeholder={mode === "web" ? "https://example.com/suspicious-link" : "https://example.com/invoice.pdf"}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCheck()}
            className="flex-1 text-sm"
            disabled={loading}
          />
          <Button onClick={handleCheck} disabled={loading || !url.trim()} size={compact ? "sm" : "default"}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Check"}
          </Button>
        </div>
        
        {mode === "file" && (
           <p className="text-[10px] text-muted-foreground mt-1">
             <AlertCircle className="inline h-3 w-3 mr-1" />
             Safe scanner: File is downloaded securely by the server, hashed, and checked.
           </p>
        )}
        
        {error && (
          <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 p-2 rounded border border-destructive/20 mt-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span className="break-all">{error}</span>
          </div>
        )}
        {result && (
          <div className="space-y-2 text-xs border border-border rounded-lg p-3 bg-muted/30 mt-2">
            {result.status && result.status.includes("queued") ? (
               <div className="text-amber-500 font-medium mb-2 flex items-center gap-1">
                 <Loader2 className="h-3 w-3 animate-spin inline" />
                 File uploaded to VirusTotal. Analysis is queued!
               </div>
            ) : (
                <div className="grid grid-cols-2 gap-2">
                  <span className="text-muted-foreground">Malicious</span>
                  <span className={result.malicious > 0 ? "text-destructive font-semibold" : "text-foreground"}>{result.malicious}</span>
                  <span className="text-muted-foreground">Suspicious</span>
                  <span className={result.suspicious > 0 ? "text-amber-500 font-semibold" : "text-foreground"}>{result.suspicious}</span>
                  <span className="text-muted-foreground">Harmless</span>
                  <span className="text-green-600 dark:text-green-400">{result.harmless}</span>
                  <span className="text-muted-foreground">Undetected</span>
                  <span className="text-foreground">{result.undetected}</span>
                </div>
            )}
            
            {result.error && <p className="text-muted-foreground italic mt-2">{result.error}</p>}
            {result.permalink && (
              <a
                href={result.permalink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline mt-2"
              >
                View full report <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        )}
      </div>
    </GlassCard>
  );
};

export default VirusTotalCheck;
