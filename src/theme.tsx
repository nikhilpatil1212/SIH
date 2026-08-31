import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Moon, Sun } from "lucide-react";

export type Theme = "dark" | "light";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("dhruva-theme") as Theme | null;
      if (saved === "light") return "light";
      localStorage.setItem("dhruva-theme", "light");
      return "light";
    }
    return "light";
  });

  const setTheme = (t: Theme) => {
    setThemeState(t);
    if (typeof window !== "undefined") {
      localStorage.setItem("dhruva-theme", t);
    }
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "light") {
      root.classList.add("light");
      root.classList.remove("dark");
      root.setAttribute("data-theme", "light");
      root.style.colorScheme = "light";
    } else {
      root.classList.add("dark");
      root.classList.remove("light");
      root.setAttribute("data-theme", "dark");
      root.style.colorScheme = "dark";
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}

export function ThemeToggle({
  className = "",
  variant = "pill",
}: {
  className?: string;
  variant?: "pill" | "icon" | "button";
}) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  if (variant === "pill") {
    return (
      <button
        onClick={toggleTheme}
        type="button"
        title={`Switch to ${isDark ? "Light" : "Dark"} theme`}
        aria-label={`Switch to ${isDark ? "Light" : "Dark"} theme`}
        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${
          isDark
            ? "border-[#1d445c] bg-[#0d2433] text-[#8ccfe0] hover:border-[#55d6e8]/60 hover:text-[#55d6e8]"
            : "border-[#dfd8cc] bg-[#f0eae0] text-[#425d6b] hover:border-[#2b7c92] hover:text-[#0d2433]"
        } ${className}`}
      >
        {isDark ? (
          <>
            <Sun size={14} className="text-[#f5b942]" />
            <span>Light Mode</span>
          </>
        ) : (
          <>
            <Moon size={14} className="text-[#2b7c92]" />
            <span>Dark Mode</span>
          </>
        )}
      </button>
    );
  }

  if (variant === "icon") {
    return (
      <button
        onClick={toggleTheme}
        type="button"
        title={`Switch to ${isDark ? "Light (Cream)" : "Dark"} theme`}
        aria-label={`Switch to ${isDark ? "Light (Cream)" : "Dark"} theme`}
        className={`flex h-8 w-8 items-center justify-center rounded-md border transition-all duration-200 ${
          isDark
            ? "border-[#1d445c] bg-[#0d2433] text-[#8ccfe0] hover:border-[#55d6e8]/60 hover:bg-[#132f40] hover:text-[#55d6e8]"
            : "border-[#dfd8cc] bg-[#f3ece1] text-[#3a5563] hover:border-[#2b7c92] hover:bg-[#eae2d4] hover:text-[#0d2433]"
        } ${className}`}
      >
        {isDark ? <Sun size={15} className="text-[#f5b942]" /> : <Moon size={15} className="text-[#2b7c92]" />}
      </button>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      type="button"
      className={`inline-flex items-center gap-2 rounded-md border px-3.5 py-2 text-[13px] font-semibold transition-all duration-200 ${
        isDark
          ? "border-[#1d445c] bg-[#132f40] text-[#eaf6f8] hover:border-[#55d6e8]/60 hover:text-[#55d6e8]"
          : "border-[#d8d0c2] bg-[#eae3d6] text-[#0d2433] hover:border-[#2b7c92] hover:bg-[#dfd7c9]"
      } ${className}`}
    >
      {isDark ? <Sun size={15} className="text-[#f5b942]" /> : <Moon size={15} className="text-[#2b7c92]" />}
      <span>{isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}</span>
    </button>
  );
}
