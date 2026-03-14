import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Progress } from "@/components/ui/progress";
import { fetchUserRiskList, type UserRiskListEntry } from "@/lib/api";
import { toast } from "sonner";
import { Loader2, ShieldAlert } from "lucide-react";

const riskBadge: Record<string, string> = {
  Low: "bg-green-100 text-green-700 border-green-200",
  Medium: "bg-amber-100 text-amber-700 border-amber-200",
  High: "bg-red-100 text-red-700 border-red-200",
  Critical: "bg-red-200 text-red-900 border-red-300 font-bold animate-pulse",
};

const RiskScoring = () => {
  const [users, setUsers] = useState<UserRiskListEntry[]>([]);
  const [distData, setDistData] = useState<{ level: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserRiskList()
      .then((data) => {
        setUsers(data.users);
        const distribution = Object.entries(data.distribution).map(([level, count]) => ({
          level,
          count,
        }));
        // Sort distribution to Low -> Medium -> High -> Critical
        const order = ["Low", "Medium", "High", "Critical"];
        distribution.sort((a, b) => order.indexOf(a.level) - order.indexOf(b.level));
        setDistData(distribution);
      })
      .catch((err) => {
        toast.error("Failed to load real-time risk data");
        console.error(err);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="h-12 w-12 text-primary animate-spin" />
        <p className="text-muted-foreground font-mono italic">
          AI Engine performing real-time behavioral risk analysis...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">Risk Scoring</h1>
          <p className="text-muted-foreground text-sm mt-1">AI-powered behavioral risk analysis</p>
        </div>
        <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
          Live Data Active
        </Badge>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 glass rounded-lg p-5">
          <h3 className="text-sm font-semibold font-display mb-4">Risk Distribution</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={distData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(226,20%,92%)" horizontal={false} />
              <XAxis type="number" stroke="hsl(225,36%,73%)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="level" stroke="hsl(225,36%,73%)" fontSize={12} width={60} tickLine={false} axisLine={false} />
              <Tooltip cursor={{ fill: 'hsl(226,20%,96%)' }} contentStyle={{ 
                background: "hsl(0,0%,100%)", 
                border: "1px solid hsl(226,20%,92%)", 
                borderRadius: "12px", 
                color: "hsl(222,47%,11%)",
                boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.05)"
              }} />
              <Bar dataKey="count" fill="hsl(262,83%,58%)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass rounded-lg p-5 flex flex-col justify-center items-center text-center space-y-2">
          <ShieldAlert className="h-10 w-10 text-red-500 mb-2" />
          <h4 className="font-bold text-lg">System Health</h4>
          <p className="text-xs text-muted-foreground px-4">
            Behavioral analysis is running against {users.length} active employees.
          </p>
          <div className="pt-2">
             <Badge variant="outline" className="text-[10px] uppercase">Engine: Llama-3-70B</Badge>
          </div>
        </div>
      </div>

      <div className="glass rounded-lg overflow-hidden border border-border/50 shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent bg-muted/20">
              <TableHead className="w-[200px]">Employee</TableHead>
              <TableHead>Dept</TableHead>
              <TableHead>Level</TableHead>
              <TableHead className="text-center">Clicks</TableHead>
              <TableHead className="text-center">Creds</TableHead>
              <TableHead className="text-center">Downloads</TableHead>
              <TableHead className="text-center">Reported</TableHead>
              <TableHead className="w-[120px]">Training</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.email} className="border-border hover:bg-muted/10 transition-colors">
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-semibold text-sm">{u.name}</span>
                    <span className="text-[10px] text-muted-foreground truncate max-w-[150px]">{u.email}</span>
                  </div>
                </TableCell>
                <TableCell>
                   <span className="text-xs font-medium">{u.department}</span>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={riskBadge[u.risk_level] || "bg-muted"}>
                    {u.risk_level}
                  </Badge>
                </TableCell>
                <TableCell className="text-center text-xs font-mono">{u.clicks}</TableCell>
                <TableCell className="text-center text-xs font-mono">{u.credentials}</TableCell>
                <TableCell className="text-center text-xs font-mono">{u.downloads}</TableCell>
                <TableCell className="text-center text-xs font-mono text-green-600 font-bold">{u.reported}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Progress value={u.training_progress} className="h-1.5 w-12 bg-muted transition-all" />
                    <span className="text-[10px] text-muted-foreground font-mono">{u.training_progress}%</span>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {users.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-20 text-muted-foreground italic">
                  No employee risk data found. Ensure simulations are active.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default RiskScoring;

