import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  className?: string;
}

const StatCard = ({ title, value, icon: Icon, trend, trendUp, className }: StatCardProps) => (
  <div className={cn("glass rounded-lg p-5 hover:glow-blue transition-all duration-300 group", className)}>
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="text-2xl font-bold mt-1 font-display">{value}</p>
        {trend && (
          <p className={cn("text-xs mt-1", trendUp ? "text-green-400" : "text-destructive")}>
            {trend}
          </p>
        )}
      </div>
      <div className="p-2.5 rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
        <Icon className="h-5 w-5" />
      </div>
    </div>
  </div>
);

export default StatCard;
