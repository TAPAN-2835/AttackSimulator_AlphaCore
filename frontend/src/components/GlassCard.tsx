import { cn } from "@/lib/utils";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  glow?: "blue" | "purple" | "cyan" | "none";
}

const GlassCard = ({ className, glow = "none", children, ...props }: GlassCardProps) => (
  <div
    className={cn(
      "glass rounded-xl p-6 transition-all duration-300 hover:scale-[1.01] hover:shadow-soft border border-border/40",
      glow === "blue" && "hover:glow-blue",
      glow === "purple" && "hover:glow-purple",
      glow === "cyan" && "hover:glow-cyan",
      className
    )}
    {...props}
  >
    {children}
  </div>
);

export default GlassCard;
