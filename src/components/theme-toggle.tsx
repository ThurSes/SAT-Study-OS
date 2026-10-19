"use client";

import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  function toggleTheme() {
    const theme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = theme;
    try {
      // Only the visual preference is stored; study answers remain in memory.
      window.localStorage.setItem("sat-study-os.theme", theme);
    } catch {
      // The toggle still works when browser storage is unavailable.
    }
  }

  return <Button type="button" variant="outline" size="icon" className="theme-toggle" onClick={toggleTheme}>
    <span className="theme-to-dark"><Moon size={18} aria-hidden="true" /><span className="sr-only">Ativar modo escuro</span></span>
    <span className="theme-to-light"><Sun size={18} aria-hidden="true" /><span className="sr-only">Ativar modo claro</span></span>
  </Button>;
}
