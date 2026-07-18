import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

export type ModoPeriodo = "ano" | "mes" | "intervalo";

export interface EstadoPeriodo {
  modo: ModoPeriodo;
  ano: number;
  mes: number; // 0-11
  inicio: string; // yyyy-mm-dd, usado no modo "intervalo"
  fim: string;
}

export function periodoInicial(): EstadoPeriodo {
  const hoje = new Date();
  return {
    modo: "ano",
    ano: hoje.getFullYear(),
    mes: hoje.getMonth(),
    inicio: `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-01`,
    fim: hoje.toISOString().slice(0, 10),
  };
}

const MESES_ABREV = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const MESES_LONGOS = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

function fmtBr(iso: string) {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

export function calcularRange(p: EstadoPeriodo): { inicio: string; fim: string; label: string } {
  if (p.modo === "ano") {
    return { inicio: `${p.ano}-01-01`, fim: `${p.ano}-12-31`, label: String(p.ano) };
  }
  if (p.modo === "mes") {
    const fimData = new Date(p.ano, p.mes + 1, 0);
    const fim = `${p.ano}-${String(p.mes + 1).padStart(2, "0")}-${String(fimData.getDate()).padStart(2, "0")}`;
    return { inicio: `${p.ano}-${String(p.mes + 1).padStart(2, "0")}-01`, fim, label: `${MESES_LONGOS[p.mes]} de ${p.ano}` };
  }
  return { inicio: p.inicio, fim: p.fim, label: `${fmtBr(p.inicio)} a ${fmtBr(p.fim)}` };
}

export function FiltroPeriodo({ periodo, onChange }: { periodo: EstadoPeriodo; onChange: (n: Partial<EstadoPeriodo>) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={periodo.modo} onValueChange={(v: ModoPeriodo) => onChange({ modo: v })}>
        <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="ano">Ano</SelectItem>
          <SelectItem value="mes">Mês</SelectItem>
          <SelectItem value="intervalo">Intervalo</SelectItem>
        </SelectContent>
      </Select>
      {periodo.modo === "ano" && (
        <div className="flex items-center gap-1">
          <button onClick={() => onChange({ ano: periodo.ano - 1 })} className="p-1 hover:bg-accent rounded" aria-label="Ano anterior">‹</button>
          <span className="text-xs font-mono w-10 text-center">{periodo.ano}</span>
          <button onClick={() => onChange({ ano: periodo.ano + 1 })} className="p-1 hover:bg-accent rounded" aria-label="Próximo ano">›</button>
        </div>
      )}
      {periodo.modo === "mes" && (
        <>
          <Select value={String(periodo.mes)} onValueChange={(v) => onChange({ mes: Number(v) })}>
            <SelectTrigger className="w-24 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MESES_ABREV.map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input type="number" value={periodo.ano} onChange={(e) => onChange({ ano: Number(e.target.value) })} className="w-20 h-8 text-xs" />
        </>
      )}
      {periodo.modo === "intervalo" && (
        <>
          <Input type="date" value={periodo.inicio} onChange={(e) => onChange({ inicio: e.target.value })} className="h-8 text-xs w-[9.5rem]" />
          <span className="text-xs text-muted-foreground">até</span>
          <Input type="date" value={periodo.fim} onChange={(e) => onChange({ fim: e.target.value })} className="h-8 text-xs w-[9.5rem]" />
        </>
      )}
    </div>
  );
}

// ---------- Agregação dos dados no período ----------

export function bucketizeReceitasDespesas(rows: any[], inicio: string, fim: string) {
  const dIni = new Date(inicio + "T00:00:00");
  const dFim = new Date(fim + "T00:00:00");
  const dias = Math.round((dFim.getTime() - dIni.getTime()) / 86400000) + 1;

  if (dias <= 31) {
    const chaves: string[] = [];
    const labels: string[] = [];
    for (let d = new Date(dIni); d <= dFim; d.setDate(d.getDate() + 1)) {
      chaves.push(d.toISOString().slice(0, 10));
      labels.push(`${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`);
    }
    const receitas = new Array(chaves.length).fill(0);
    const despesas = new Array(chaves.length).fill(0);
    const idx = new Map(chaves.map((c, i) => [c, i]));
    for (const r of rows) {
      const i = idx.get(r.data as string);
      if (i === undefined) continue;
      if (r.tipo === "receita") receitas[i] += Number(r.valor);
      else despesas[i] += Number(r.valor);
    }
    return { labels, receitas, despesas };
  }

  const chaves: string[] = [];
  const labels: string[] = [];
  const cursor = new Date(dIni.getFullYear(), dIni.getMonth(), 1);
  const fimMes = new Date(dFim.getFullYear(), dFim.getMonth(), 1);
  while (cursor <= fimMes) {
    chaves.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`);
    labels.push(cursor.getMonth() === 0 ? `${MESES_ABREV[0]}/${cursor.getFullYear()}` : MESES_ABREV[cursor.getMonth()]);
    cursor.setMonth(cursor.getMonth() + 1);
  }
  const receitas = new Array(chaves.length).fill(0);
  const despesas = new Array(chaves.length).fill(0);
  const idx = new Map(chaves.map((c, i) => [c, i]));
  for (const r of rows) {
    const i = idx.get((r.data as string).slice(0, 7));
    if (i === undefined) continue;
    if (r.tipo === "receita") receitas[i] += Number(r.valor);
    else despesas[i] += Number(r.valor);
  }
  return { labels, receitas, despesas };
}

export function agruparDespesasPorCategoria(rows: any[]) {
  const mapa = new Map<string, { valor: number; cor: string | null }>();
  for (const r of rows) {
    if (r.tipo !== "despesa") continue;
    const nome = (r as any).categorias?.nome ?? "Sem categoria";
    const cor = (r as any).categorias?.cor ?? null;
    const atual = mapa.get(nome) ?? { valor: 0, cor };
    mapa.set(nome, { valor: atual.valor + Number(r.valor), cor });
  }
  return Array.from(mapa.entries()).sort((a, b) => b[1].valor - a[1].valor);
}
