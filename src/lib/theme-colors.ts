import { useEffect, useState } from "react";

export type ThemeChartColors = {
  receita: string;
  despesa: string;
  dourado: string;
  foreground: string;
  mutedForeground: string;
  border: string;
};

function lerCores(): ThemeChartColors {
  if (typeof window === "undefined") {
    return { receita: "#5AAA78", despesa: "#D25A50", dourado: "#B08D57", foreground: "#333", mutedForeground: "#777", border: "#ddd" };
  }
  const style = getComputedStyle(document.documentElement);
  const v = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;
  return {
    receita: v("--color-receita", "#5AAA78"),
    despesa: v("--color-despesa", "#D25A50"),
    dourado: v("--color-dourado", "#B08D57"),
    foreground: v("--color-foreground", "#333333"),
    mutedForeground: v("--color-muted-foreground", "#777777"),
    border: v("--color-border", "#dddddd"),
  };
}

// Lê as cores do tema ativo direto das CSS vars, e re-lê automaticamente quando
// o usuário troca de tema (a classe no <html> muda), para os gráficos (Chart.js)
// sempre acompanharem visualmente o tema escolhido.
export function useThemeChartColors(): ThemeChartColors {
  const [cores, setCores] = useState<ThemeChartColors>(() => lerCores());

  useEffect(() => {
    setCores(lerCores());
    const obs = new MutationObserver(() => setCores(lerCores()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  return cores;
}
