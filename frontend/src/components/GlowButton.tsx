import { cn } from "@/lib/utils";
import { Button, type ButtonProps } from "@/components/ui/button";

interface GlowButtonProps extends ButtonProps {
  glowColor?: "blue" | "purple" | "cyan";
}

const GlowButton = ({ className, glowColor = "blue", children, ...props }: GlowButtonProps) => (
  <Button
    className={cn(
      "relative font-semibold transition-all duration-300",
      glowColor === "blue" && "bg-primary hover:bg-primary/90 hover:glow-blue text-primary-foreground",
      glowColor === "purple" && "bg-secondary hover:bg-secondary/90 hover:glow-purple text-secondary-foreground",
      glowColor === "cyan" && "bg-accent hover:bg-accent/90 hover:glow-cyan text-accent-foreground",
      className
    )}
    {...props}
  >
    {children}
  </Button>
);

export default GlowButton;
