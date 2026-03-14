import { cn } from "@/lib/utils";
import { Button, type ButtonProps } from "@/components/ui/button";

interface GlowButtonProps extends ButtonProps {
  glowColor?: "blue" | "purple" | "cyan";
}

const GlowButton = ({ className, glowColor = "blue", children, ...props }: GlowButtonProps) => (
  <Button
    className={cn(
      "relative font-semibold transition-all duration-300",
      glowColor === "blue" && "bg-primary hover:bg-primary/95 hover:glow-blue text-primary-foreground shadow-sm",
      glowColor === "purple" && "bg-secondary hover:bg-secondary/95 hover:glow-purple text-secondary-foreground shadow-sm",
      glowColor === "cyan" && "bg-accent hover:bg-accent/95 hover:glow-cyan text-accent-foreground shadow-sm",
      className
    )}
    {...props}
  >
    {children}
  </Button>
);

export default GlowButton;
