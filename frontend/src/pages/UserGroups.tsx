import { useState } from "react";
import { Users, Upload, Plus, Search, MoreVertical, FileJson, FileSpreadsheet } from "lucide-react";
import GlassCard from "@/components/GlassCard";
import GlowButton from "@/components/GlowButton";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

const initialGroups = [
  { id: 1, name: "Finance Department", members: 45, risk: "High", lastActive: "2 days ago" },
  { id: 2, name: "HR & People", members: 28, risk: "Medium", lastActive: "5 days ago" },
  { id: 3, name: "Engineering Core", members: 124, risk: "Low", lastActive: "1 day ago" },
  { id: 4, name: "Sales Outreach", members: 56, risk: "Medium", lastActive: "3 days ago" },
  { id: 5, name: "Executive Suite", members: 12, risk: "High", lastActive: "1 week ago" },
];

const riskBadge: Record<string, string> = {
  Low: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
  Medium: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",
  High: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
};

const UserGroups = () => {
  const [groups, setGroups] = useState(initialGroups);
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = () => {
    setIsUploading(true);
    setTimeout(() => {
      setIsUploading(false);
      toast.success("User group imported successfully", {
        description: "52 new users added to 'Marketing Team'",
      });
      setGroups([...groups, { id: groups.length + 1, name: "Marketing Team", members: 52, risk: "Medium", lastActive: "Just now" }]);
    }, 1500);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display">User & Group Management</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage target demographics for attack simulations</p>
        </div>
        <div className="flex gap-2">
          <GlowButton variant="outline" glowColor="cyan" className="border-border text-foreground" onClick={handleUpload} disabled={isUploading}>
            <Upload className="h-4 w-4 mr-2" />
            {isUploading ? "Uploading..." : "Upload CSV"}
          </GlowButton>
          <GlowButton>
            <Plus className="h-4 w-4 mr-2" /> New Group
          </GlowButton>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <GlassCard className="flex items-center gap-4 py-4" glow="blue">
          <div className="p-3 rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Users</p>
            <p className="text-2xl font-bold font-display">2,548</p>
          </div>
        </GlassCard>
        <GlassCard className="flex items-center gap-4 py-4" glow="purple">
          <div className="p-3 rounded-xl bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400">
            <FileSpreadsheet className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Groups</p>
            <p className="text-2xl font-bold font-display">{groups.length}</p>
          </div>
        </GlassCard>
        <GlassCard className="flex items-center gap-4 py-4" glow="cyan">
          <div className="p-3 rounded-xl bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400">
            <FileJson className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Sync Status</p>
            <p className="text-2xl font-bold font-display">Active</p>
          </div>
        </GlassCard>
      </div>

      <GlassCard glow="blue">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search groups..." className="pl-10 bg-muted/50 border-border" />
          </div>
        </div>

        <div className="rounded-md border border-border/50 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent bg-muted/30">
                <TableHead>Group Name</TableHead>
                <TableHead>Members</TableHead>
                <TableHead>Risk Score</TableHead>
                <TableHead>Last Active</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.map((group) => (
                <TableRow key={group.id} className="border-border">
                  <TableCell className="font-medium">{group.name}</TableCell>
                  <TableCell>{group.members}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={riskBadge[group.risk]}>{group.risk}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{group.lastActive}</TableCell>
                  <TableCell>
                    <button className="text-muted-foreground hover:text-foreground">
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </GlassCard>
    </div>
  );
};

export default UserGroups;
