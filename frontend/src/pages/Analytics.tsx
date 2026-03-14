import { useEffect, useState } from "react";
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import { Download, TrendingUp } from "lucide-react";
import GlowButton from "@/components/GlowButton";
import { toast } from "sonner";
import { fetchAnalyticsDashboard, fetchDepartmentRisk, fetchCampaignTrend, type AnalyticsOverview, type DeptRiskRate, type TrendPoint } from "@/lib/api";

const COLORS = ["hsl(217,100%,60%)", "hsl(230,30%,18%)"];
const tooltipStyle = { background: "hsl(230,40%,8%)", border: "1px solid hsl(230,30%,18%)", borderRadius: "8px", color: "hsl(210,40%,95%)" };

const defaultOverview: AnalyticsOverview = {
  click_rate: 0,
  credential_rate: 0,
  download_rate: 0,
  report_rate: 0,
  high_risk_departments: []
};

const riskColor = (v: number) =>
  v >= 70 ? "bg-destructive/60" : v >= 40 ? "bg-secondary/60" : "bg-green-500/40";

const Analytics = () => {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [deptRisk, setDeptRisk] = useState<DeptRiskRate[]>([]);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshData = async () => {
    try {
      const [ov, dr, tr] = await Promise.all([
        fetchAnalyticsDashboard(),
        fetchDepartmentRisk(),
        fetchCampaignTrend()
      ]);
      setOverview(ov);
      setDeptRisk(dr);
      setTrend(tr);
    } catch (err) {
      console.error("Failed to refresh analytics:", err);
    }
  };

  useEffect(() => {
    refreshData().finally(() => setLoading(false));

    const interval = setInterval(refreshData, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-muted-foreground animate-pulse">Loading security analytics...</p>
        </div>
      </div>
    );
  }

  const data = overview || defaultOverview;

  const deptClickData = (deptRisk || []).map(d => ({ dept: d.department, rate: d.click_rate }));

  const reportPie = [
    { name: "Reported", value: data.report_rate },
    { name: "Not Reported", value: Math.max(0, 100 - data.report_rate) },
  ];

  const heatmapData = (deptRisk || []).map(d => ({
    dept: d.department,
    phishing: d.click_rate,
    cred: d.credential_rate,
    malware: d.download_rate,
  }));

  const handleExport = (type: string) => {
    toast.success(`Generating ${type} report...`, {
      description: "Simulation analytics report will be ready in a moment.",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display">Security Analytics</h1>
          <p className="text-muted-foreground text-sm mt-1">Cybersecurity insights across your organization</p>
        </div>
        <div className="flex gap-2">
          <GlowButton variant="outline" glowColor="cyan" className="border-border text-foreground" onClick={() => handleExport("PDF")}>
            <Download className="h-4 w-4 mr-2" /> Export PDF
          </GlowButton>
          <GlowButton variant="outline" glowColor="purple" className="border-border text-foreground" onClick={() => handleExport("CSV")}>
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </GlowButton>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="glass rounded-lg p-5">
          <h3 className="text-sm font-semibold font-display mb-4">Phishing Click Rate by Department</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={deptClickData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(230,30%,18%)" />
              <XAxis dataKey="dept" stroke="hsl(215,20%,55%)" fontSize={11} />
              <YAxis stroke="hsl(215,20%,55%)" fontSize={12} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="rate" fill="hsl(217,100%,60%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass rounded-lg p-5">
          <h3 className="text-sm font-semibold font-display mb-4">Credential Submission Rate</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(230,30%,18%)" />
              <XAxis dataKey="campaign" stroke="hsl(215,20%,55%)" fontSize={11} />
              <YAxis stroke="hsl(215,20%,55%)" fontSize={12} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="credentials" stroke="hsl(270,80%,60%)" strokeWidth={2} dot={{ fill: "hsl(270,80%,60%)" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="glass rounded-lg p-5">
          <h3 className="text-sm font-semibold font-display mb-4">Malware Download Attempts</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={trend}>
              <defs>
                <linearGradient id="cyanGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(185,100%,55%)" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="hsl(185,100%,55%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(230,30%,18%)" />
              <XAxis dataKey="campaign" stroke="hsl(215,20%,55%)" fontSize={11} />
              <YAxis stroke="hsl(215,20%,55%)" fontSize={12} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="downloads" stroke="hsl(185,100%,55%)" fill="url(#cyanGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="glass rounded-lg p-5">
          <h3 className="text-sm font-semibold font-display mb-4">Email Reporting Rate</h3>
          <div className="flex items-center justify-center h-[220px]">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={reportPie} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value">
                  {reportPie.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-primary" /> Reported: {reportPie[0]?.value ?? 0}%</div>
              <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-muted" /> Missed: {reportPie[1]?.value ?? 0}%</div>
            </div>
          </div>
        </div>
      </div>

      <div className="glass rounded-lg p-5">
        <h3 className="text-sm font-semibold font-display mb-4 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" /> Most Effective Attack Types
        </h3>
        <div className="space-y-6">
          {[
            { type: "Invoice Scam", rate: 58, color: "bg-primary" },
            { type: "Password Reset", rate: 41, color: "bg-secondary" },
            { type: "Package Delivery", rate: 33, color: "bg-accent" },
            { type: "System Update", rate: 22, color: "bg-muted" }
          ].map((item) => (
            <div key={item.type} className="space-y-2">
              <div className="flex justify-between text-xs font-medium">
                <span>{item.type}</span>
                <span className="text-primary">{item.rate}% Click Rate</span>
              </div>
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div className={`${item.color} h-full rounded-full`} style={{ width: `${item.rate}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="glass rounded-lg p-5">
        <h3 className="text-sm font-semibold font-display mb-4">Department Risk Heatmap</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground text-xs">
                <th className="text-left p-2">Department</th>
                <th className="p-2">Phishing</th>
                <th className="p-2">Credential</th>
                <th className="p-2">Malware</th>
              </tr>
            </thead>
            <tbody>
              {heatmapData.length > 0 ? (
                heatmapData.map((row) => (
                  <tr key={row.dept} className="border-t border-border/50">
                    <td className="p-2 font-medium">{row.dept}</td>
                    {[row.phishing, row.cred, row.malware].map((v, i) => (
                      <td key={i} className="p-2 text-center">
                        <span className={`inline-block px-3 py-1 rounded text-xs font-bold ${riskColor(v)}`}>{v}%</span>
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr className="border-t border-border/50">
                  <td colSpan={4} className="p-4 text-center text-muted-foreground">No departmental data available yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
