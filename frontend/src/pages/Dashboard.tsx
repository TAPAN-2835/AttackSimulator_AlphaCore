import { useEffect, useState } from "react";
import { Target, Users, MousePointerClick, KeyRound, Bug, ShieldCheck, Brain, Sparkles } from "lucide-react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import StatCard from "@/components/StatCard";
import LiveFeed from "@/components/LiveFeed";
import GlassCard from "@/components/GlassCard";
import {
  fetchAdminDashboard, fetchAnalyticsDashboard, fetchRecentEvents, fetchUsers,
  type DashboardOverview, type AnalyticsOverview, type EventOut, type UserWithRisk,
} from "@/lib/api";

const Dashboard = () => {
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);
  const [highRiskUsers, setHighRiskUsers] = useState<UserWithRisk[]>([]);

  useEffect(() => {
    fetchAdminDashboard().then(setOverview).catch(() => {});
    fetchAnalyticsDashboard().then(setAnalytics).catch(() => {});
    fetchUsers()
      .then((users) => {
        const sorted = users
          .filter((u) => u.risk_score !== null)
          .sort((a, b) => (b.risk_score ?? 0) - (a.risk_score ?? 0))
          .slice(0, 3);
        setHighRiskUsers(sorted);
      })
      .catch(() => {});
  }, []);

  const deptData = analytics?.high_risk_departments?.length
    ? analytics.high_risk_departments.map((d) => ({ dept: d.name, risk: d.score }))
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display">Security Operations Center</h1>
        <p className="text-muted-foreground text-sm mt-1">Real-time attack simulation monitoring</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard title="Active Campaigns" value={overview?.active_campaigns ?? 0} icon={Target} />
        <StatCard title="Users Tested" value={overview?.employees_tested ?? 0} icon={Users} />
        <StatCard title="Click Rate" value={analytics ? `${analytics.click_rate}%` : "0%"} icon={MousePointerClick} />
        <StatCard title="Credential Rate" value={analytics ? `${analytics.credential_rate}%` : "0%"} icon={KeyRound} />
        <StatCard title="Malware Downloads" value={analytics ? `${analytics.download_rate}%` : "0%"} icon={Bug} />
        <StatCard title="Awareness Score" value={overview ? `${Math.round(100 - overview.avg_risk_score)}/100` : "0/100"} icon={ShieldCheck} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="glass rounded-lg p-5">
          <h3 className="text-sm font-semibold font-display mb-4">Phishing Click Rate Trend</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={[]}>
              <defs>
                <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(217,100%,60%)" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="hsl(217,100%,60%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ 
                background: "hsl(var(--card))", 
                border: "1px solid hsl(var(--border))", 
                borderRadius: "12px", 
                color: "hsl(var(--foreground))",
                boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)"
              }} />
              <Area type="monotone" dataKey="rate" stroke="hsl(var(--primary))" fill="url(#blueGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="glass rounded-lg p-5">
          <h3 className="text-sm font-semibold font-display mb-4">Department Risk Levels</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={deptData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="dept" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip cursor={{ fill: 'hsl(var(--muted) / 0.5)' }} contentStyle={{ 
                background: "hsl(var(--card))", 
                border: "1px solid hsl(var(--border))", 
                borderRadius: "12px", 
                color: "hsl(var(--foreground))",
                boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)"
              }} />
              <Bar dataKey="risk" fill="hsl(var(--neon-purple))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <LiveFeed />
        </div>
        <div className="space-y-6">
          <GlassCard glow="blue" className="p-5">
            <h3 className="text-sm font-semibold font-display mb-4 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> AI Security Insights
            </h3>
            <div className="space-y-4">
              {[
                { text: "Finance dept requires phishing training due to 30% click spike.", type: "warning" },
                { text: "High credential submission detected in Marketing team.", type: "danger" },
                { text: "Attachment-based attacks successful in HR; suggest drills.", type: "info" }
              ].map((insight, i) => (
                <div key={i} className="text-xs p-3 rounded-lg bg-muted/40 border-l-2 border-primary border-opacity-50">
                  {insight.text}
                </div>
              ))}
            </div>
          </GlassCard>

          <GlassCard glow="purple" className="p-5">
            <h3 className="text-sm font-semibold font-display mb-4 flex items-center gap-2">
              <Brain className="h-4 w-4 text-secondary" /> High Risk Users
            </h3>
            <div className="space-y-4">
              {highRiskUsers.length > 0 ? (
                highRiskUsers.map((u) => (
                  <div key={u.id} className="flex items-center justify-between border-b border-border/40 pb-2 last:border-0 last:pb-0">
                    <div>
                      <p className="text-sm font-medium">{u.name}</p>
                      <p className="text-[10px] text-muted-foreground">{u.risk_level ?? "LOW"}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-primary">{u.risk_score ?? 0}</p>
                      <p className="text-[10px] text-muted-foreground">Score</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-xs text-muted-foreground p-3 text-center">No high risk users detected.</div>
              )}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
