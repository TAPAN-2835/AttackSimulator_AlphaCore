import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const users = [
  { name: "John Smith", dept: "Finance", risk: "High", phishing: 82, cred: 75, reporting: 20, training: 15 },
  { name: "Mary Jones", dept: "HR", risk: "High", phishing: 70, cred: 60, reporting: 35, training: 45 },
  { name: "Alex Wilson", dept: "Engineering", risk: "Low", phishing: 15, cred: 10, reporting: 90, training: 100 },
  { name: "Rachel Davis", dept: "Sales", risk: "Medium", phishing: 45, cred: 38, reporting: 55, training: 75 },
  { name: "Kevin Brown", dept: "Finance", risk: "High", phishing: 78, cred: 65, reporting: 25, training: 30 },
  { name: "Lisa Garcia", dept: "Legal", risk: "Low", phishing: 22, cred: 18, reporting: 85, training: 100 },
  { name: "Tom Nguyen", dept: "Marketing", risk: "Medium", phishing: 50, cred: 42, reporting: 48, training: 60 },
  { name: "Sarah Patel", dept: "Engineering", risk: "Low", phishing: 12, cred: 8, reporting: 92, training: 100 },
];

import { Progress } from "@/components/ui/progress";

const distData = [
  { level: "Low", count: 1240 }, { level: "Medium", count: 890 }, { level: "High", count: 420 },
];

const riskBadge: Record<string, string> = {
  Low: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
  Medium: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",
  High: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
};

const RiskScoring = () => (
  <div className="space-y-6">
    <div>
      <h1 className="text-2xl font-bold font-display">Risk Scoring</h1>
      <p className="text-muted-foreground text-sm mt-1">AI-powered behavioral risk analysis</p>
    </div>

    <div className="glass rounded-lg p-5">
      <h3 className="text-sm font-semibold font-display mb-4">Risk Distribution</h3>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={distData} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
          <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis type="category" dataKey="level" stroke="hsl(var(--muted-foreground))" fontSize={12} width={60} tickLine={false} axisLine={false} />
          <Tooltip cursor={{ fill: 'hsl(var(--muted) / 0.5)' }} contentStyle={{ 
            background: "hsl(var(--card))", 
            border: "1px solid hsl(var(--border))", 
            borderRadius: "12px", 
            color: "hsl(var(--foreground))",
            boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)"
          }} />
          <Bar dataKey="count" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>

    <div className="glass rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-border hover:bg-transparent">
            <TableHead>User</TableHead>
            <TableHead>Department</TableHead>
            <TableHead>Risk Level</TableHead>
            <TableHead>Phishing Susceptibility</TableHead>
            <TableHead>Credential Exposure</TableHead>
            <TableHead>Reporting Awareness</TableHead>
            <TableHead>Training Progress</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((u) => (
            <TableRow key={u.name} className="border-border">
              <TableCell className="font-medium">{u.name}</TableCell>
              <TableCell className="text-muted-foreground">{u.dept}</TableCell>
              <TableCell>
                <Badge variant="outline" className={riskBadge[u.risk]}>{u.risk}</Badge>
              </TableCell>
              <TableCell>{u.phishing}%</TableCell>
              <TableCell>{u.cred}%</TableCell>
              <TableCell>{u.reporting}%</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Progress value={u.training} className="h-1.5 w-16 bg-muted" />
                  <span className="text-[10px] text-muted-foreground">{u.training}%</span>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  </div>
);

export default RiskScoring;
