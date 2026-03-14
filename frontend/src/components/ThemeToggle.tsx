import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const ThemeToggle = () => {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== "undefined") {
      return (
        localStorage.getItem("theme") === "dark" ||
        (!localStorage.getItem("theme") &&
          window.matchMedia("(prefers-color-scheme: dark)").matches)
      );
    }
    return false;
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (isDark) {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDark]);

  return (
    <button
      onClick={() => setIsDark(!isDark)}
      className={cn(
        "flex items-center justify-center h-8 w-8 rounded-full transition-all duration-300",
        "bg-muted/50 text-muted-foreground hover:text-foreground border border-border",
        "hover:scale-110 active:scale-95"
      )}
      aria-label="Toggle theme"
    >
      <div className="relative h-4 w-4">
        <Sun
          className={cn(
            "h-4 w-4 absolute inset-0 transition-all duration-300 transform",
            isDark ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"
          )}
        />
        <Moon
          className={cn(
            "h-4 w-4 absolute inset-0 transition-all duration-300 transform",
            isDark ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0"
          )}
        />
      </div>
    </button>
  );
};

export default ThemeToggle;
