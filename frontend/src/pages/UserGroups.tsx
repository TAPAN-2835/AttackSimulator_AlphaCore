import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Upload, Plus, Search, MoreVertical, FileJson, FileSpreadsheet } from "lucide-react";
import GlassCard from "@/components/GlassCard";
import GlowButton from "@/components/GlowButton";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { fetchGroups, fetchUsers, uploadEmployeesCsv, createGroup, type GroupSummary, type UserWithRisk } from "@/lib/api";

const riskBadge: Record<string, string> = {
  Low: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
  Medium: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",
  High: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
};

function deriveRisk(members: number): "Low" | "Medium" | "High" {
  if (members > 100) return "High";
  if (members > 30) return "Medium";
  return "Low";
}

const UserGroups = () => {
  const [activeTab, setActiveTab] = useState<"groups" | "users">("groups");
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [users, setUsers] = useState<UserWithRisk[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDescription, setNewGroupDescription] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch both on mount to have accurate counts in cards
    fetchGroups()
      .then(setGroups)
      .catch(() => setGroups([]));
    fetchUsers()
      .then(setUsers)
      .catch(() => setUsers([]));
  }, []);

  useEffect(() => {
    // Refresh the active tab specifically if needed
    if (activeTab === "groups") {
      fetchGroups().then(setGroups);
    } else {
      fetchUsers().then(setUsers);
    }
  }, [activeTab]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const summary = await uploadEmployeesCsv(file);
      toast.success(`${summary.imported} employees imported successfully.`, {
        description:
          summary.new_groups_created > 0
            ? `${summary.new_groups_created} new groups created.`
            : undefined,
      });
      if (activeTab === "groups") {
        const latest = await fetchGroups();
        setGroups(latest);
      } else {
        const latest = await fetchUsers();
        setUsers(latest);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "CSV upload failed";
      toast.error(message);
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      toast.error("Group name is required");
      return;
    }
    setIsCreatingGroup(true);
    try {
      const created = await createGroup({
        group_name: newGroupName.trim(),
        description: newGroupDescription.trim() || undefined,
      });
      setGroups((prev) => [...prev, created]);
      setNewGroupName("");
      setNewGroupDescription("");
      toast.success("Group created");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create group";
      toast.error(message);
    } finally {
      setIsCreatingGroup(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display">User & Group Management</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage target demographics for attack simulations</p>
        </div>
        <div className="flex gap-2">
          <input
            type="file"
            accept=".csv,text/csv"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileChange}
          />
          <GlowButton
            variant="outline"
            glowColor="cyan"
            className="border-border text-foreground"
            onClick={handleUploadClick}
            disabled={isUploading}
          >
            <Upload className="h-4 w-4 mr-2" />
            {isUploading ? "Uploading..." : "Upload CSV"}
          </GlowButton>
          <GlowButton onClick={handleCreateGroup} disabled={isCreatingGroup}>
            <Plus className="h-4 w-4 mr-2" /> New Group
          </GlowButton>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-border/50 pb-px">
        <button
          onClick={() => setActiveTab("groups")}
          className={`pb-3 text-sm font-medium transition-colors relative ${
            activeTab === "groups" ? "text-primary" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Groups
          {activeTab === "groups" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("users")}
          className={`pb-3 text-sm font-medium transition-colors relative ${
            activeTab === "users" ? "text-primary" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Users
          {activeTab === "users" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
          )}
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <GlassCard className="flex items-center gap-4 py-4" glow="blue">
          <div className="p-3 rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Users</p>
            <p className="text-2xl font-bold font-display">
              {users.length}
            </p>
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
            <Input
              placeholder={activeTab === "groups" ? "Search groups..." : "Search users..."}
              className="pl-10 bg-muted/50 border-border"
            />
          </div>
          {activeTab === "groups" && (
            <div className="flex flex-col md:flex-row gap-2 md:items-center">
              <Input
                placeholder="New group name"
                className="bg-muted/50 border-border"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
              />
              <Input
                placeholder="Description (optional)"
                className="bg-muted/50 border-border"
                value={newGroupDescription}
                onChange={(e) => setNewGroupDescription(e.target.value)}
              />
            </div>
          )}
        </div>

        <div className="rounded-md border border-border/50 overflow-hidden">
          {activeTab === "groups" ? (
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
                {groups.map((group) => {
                  const risk = deriveRisk(group.members);
                  return (
                    <TableRow key={group.group_id} className="border-border">
                      <TableCell className="font-medium">{group.group_name}</TableCell>
                      <TableCell>{group.members}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={riskBadge[risk]}>
                          {risk}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {group.last_activity
                          ? new Date(group.last_activity).toLocaleDateString()
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <GlowButton
                          size="sm"
                          variant="outline"
                          glowColor="blue"
                          onClick={() => navigate(`/dashboard/templates`)}
                        >
                          Send Campaign
                        </GlowButton>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent bg-muted/30">
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Risk Level</TableHead>
                  <TableHead className="w-[120px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} className="border-border">
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell className="text-sm">{user.email}</TableCell>
                    <TableCell className="text-sm">{user.phone_number || "—"}</TableCell>
                    <TableCell className="text-sm">{user.department || "—"}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={riskBadge[user.risk_level || "Low"]}
                      >
                        {user.risk_level || "Low"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <GlowButton
                        size="sm"
                        variant="outline"
                        glowColor="blue"
                        onClick={() => navigate(`/dashboard/templates`)}
                      >
                        Campaign
                      </GlowButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </GlassCard>
    </div>
  );
};

export default UserGroups;
