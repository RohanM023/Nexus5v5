"use client";

import { useState, useRef, useEffect } from "react";
import { useThemeStore } from "@/lib/stores/theme-store";
import { cn } from "@/lib/utils";
import type { ThemeDefinition } from "@/lib/themes";

function ThemeSwatch({ theme, size = 12 }: { theme: ThemeDefinition; size?: number }) {
  const colors = [
    theme.colors.background,
    theme.colors.surface,
    theme.colors.accent,
    theme.colors.textPrimary,
  ];
  return (
    <div className="flex gap-px">
      {colors.map((c, i) => (
        <div
          key={i}
          className="rounded-sm"
          style={{ width: size, height: size, backgroundColor: c }}
        />
      ))}
    </div>
  );
}

export function ThemePicker() {
  const { theme, availableThemes, setTheme } = useThemeStore();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const filtered = availableThemes.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  const darkThemes = filtered.filter((t) => t.category === "dark");
  const lightThemes = filtered.filter((t) => t.category === "light");

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-2 py-1 transition-colors hover:bg-[var(--color-surface-hover)] rounded"
      >
        <ThemeSwatch theme={theme} size={10} />
        <span className="font-mono text-[10px] tracking-wider text-[var(--color-text-muted)]">
          {theme.name}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-52 overflow-hidden rounded border border-[var(--color-border)] bg-[var(--background)] shadow-xl">
          <div className="p-2">
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent px-2 py-1 font-mono text-[10px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none"
              autoFocus
            />
          </div>
          <div className="max-h-56 overflow-y-auto">
            {darkThemes.length > 0 && (
              <>
                <p className="px-3 py-1 font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--color-text-muted)]">
                  Dark
                </p>
                {darkThemes.map((t) => (
                  <ThemeRow
                    key={t.id}
                    themeOption={t}
                    active={t.id === theme.id}
                    onSelect={() => { setTheme(t.id); setOpen(false); }}
                  />
                ))}
              </>
            )}
            {lightThemes.length > 0 && (
              <>
                <p className="px-3 py-1 font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--color-text-muted)]">
                  Light
                </p>
                {lightThemes.map((t) => (
                  <ThemeRow
                    key={t.id}
                    themeOption={t}
                    active={t.id === theme.id}
                    onSelect={() => { setTheme(t.id); setOpen(false); }}
                  />
                ))}
              </>
            )}
            {filtered.length === 0 && (
              <p className="px-3 py-2 font-mono text-[10px] text-[var(--color-text-muted)]">
                No themes found.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ThemeRow({
  themeOption,
  active,
  onSelect,
}: {
  themeOption: ThemeDefinition;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-2.5 px-3 py-1.5 transition-colors hover:bg-[var(--color-surface-hover)]",
        active && "bg-[var(--color-surface)]"
      )}
    >
      <ThemeSwatch theme={themeOption} size={10} />
      <span className="font-mono text-[10px] tracking-wider text-[var(--color-text-primary)]">
        {themeOption.name}
      </span>
    </button>
  );
}
