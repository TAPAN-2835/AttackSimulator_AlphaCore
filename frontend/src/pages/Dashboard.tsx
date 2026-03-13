import { Target, Users, MousePointerClick, KeyRound, Bug, ShieldCheck, Brain, Sparkles, AlertCircle } from "lucide-react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import StatCard from "@/components/StatCard";
import LiveFeed from "@/components/LiveFeed";
import GlassCard from "@/components/GlassCard";

const clickData = [
  { name: "Jan", rate: 32 }, { name: "Feb", rate: 28 }, { name: "Mar", rate: 24 },
  { name: "Apr", rate: 19 }, { name: "May", rate: 22 }, { name: "Jun", rate: 15 },
];

const deptData = [
  { dept: "Finance", risk: 78 }, { dept: "HR", risk: 62 }, { dept: "Engineering", risk: 25 },
  { dept: "Sales", risk: 55 }, { dept: "Legal", risk: 40 }, { dept: "Marketing", risk: 48 },
];

const Dashboard = () => (
  <div className="space-y-6">
    <div>
      <h1 className="text-2xl font-bold font-display">Security Operations Center</h1>
      <p className="text-muted-foreground text-sm mt-1">Real-time attack simulation monitoring</p>
    </div>

    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      <StatCard title="Active Campaigns" value={12} icon={Target} trend="↑ 3 this week" trendUp />
      <StatCard title="Users Tested" value="2,847" icon={Users} trend="↑ 124 today" trendUp />
      <StatCard title="Click Rate" value="23.4%" icon={MousePointerClick} trend="↓ 2.1%" trendUp />
      <StatCard title="Credential Rate" value="8.7%" icon={KeyRound} trend="↓ 1.3%" trendUp />
      <StatCard title="Malware Downloads" value="4.2%" icon={Bug} trend="↓ 0.8%" trendUp />
      <StatCard title="Awareness Score" value="76/100" icon={ShieldCheck} trend="↑ 5 pts" trendUp />
    </div>

    <div className="grid lg:grid-cols-2 gap-6">
      <div className="glass rounded-lg p-5">
        <h3 className="text-sm font-semibold font-display mb-4">Phishing Click Rate Trend</h3>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={clickData}>
            <defs>
              <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(217,100%,60%)" stopOpacity={0.4} />
                <stop offset="100%" stopColor="hsl(217,100%,60%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(230,30%,18%)" />
            <XAxis dataKey="name" stroke="hsl(215,20%,55%)" fontSize={12} />
            <YAxis stroke="hsl(215,20%,55%)" fontSize={12} />
            <Tooltip contentStyle={{ background: "hsl(230,40%,8%)", border: "1px solid hsl(230,30%,18%)", borderRadius: "8px", color: "hsl(210,40%,95%)" }} />
            <Area type="monotone" dataKey="rate" stroke="hsl(217,100%,60%)" fill="url(#blueGrad)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="glass rounded-lg p-5">
        <h3 className="text-sm font-semibold font-display mb-4">Department Risk Levels</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={deptData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(230,30%,18%)" />
            <XAxis dataKey="dept" stroke="hsl(215,20%,55%)" fontSize={11} />
            <YAxis stroke="hsl(215,20%,55%)" fontSize={12} />
            <Tooltip contentStyle={{ background: "hsl(230,40%,8%)", border: "1px solid hsl(230,30%,18%)", borderRadius: "8px", color: "hsl(210,40%,95%)" }} />
            <Bar dataKey="risk" fill="hsl(270,80%,60%)" radius={[4, 4, 0, 0]} />
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
            {[
              { name: "John Smith", score: 87, rank: "CRITICAL" },
              { name: "Mary Jones", score: 76, rank: "HIGH" },
              { name: "Kevin Brown", score: 68, rank: "ELEVATED" }
            ].map((user) => (
              <div key={user.name} className="flex items-center justify-between border-b border-border/40 pb-2 last:border-0 last:pb-0">
                <div>
                  <p className="text-sm font-medium">{user.name}</p>
                  <p className="text-[10px] text-muted-foreground">{user.rank}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-primary">{user.score}</p>
                  <p className="text-[10px] text-muted-foreground">Score</p>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  </div>
);

export default Dashboard;
