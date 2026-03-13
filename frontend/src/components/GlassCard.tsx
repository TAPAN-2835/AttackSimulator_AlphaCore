import { cn } from "@/lib/utils";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  glow?: "blue" | "purple" | "cyan" | "none";
}

const GlassCard = ({ className, glow = "none", children, ...props }: GlassCardProps) => (
  <div
    className={cn(
      "glass rounded-lg p-6 transition-all duration-300 hover:scale-[1.02]",
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
