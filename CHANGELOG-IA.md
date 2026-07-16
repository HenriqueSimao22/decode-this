# Histórico de atualizações (Claude)

Este arquivo registra as mudanças feitas no projeto com ajuda do Claude, para manter um histórico entre sessões.

---

## 2026-07-16 — Reformulação completa do sistema de temas

**Arquivo alterado:** `src/styles.css` (somente CSS — nenhuma estrutura HTML ou lógica JS foi alterada)

**O que mudou:**

O projeto já usava 3 temas via classes no `<html>` (`:root` = claro, `.pergaminho` = retrô, `.dark` = escuro), controlados por `app-shell.tsx` a partir do campo `profiles.tema`. Só as variáveis de cor (`oklch`) foram substituídas — a estrutura permanece a mesma.

1. **Tema Claro (`:root`)** — reformulado para paleta bancária: fundo branco/cinza muito claro, cards brancos, sidebar cinza claro, verde financeiro (#2E7D32) como cor primária e azul discreto (#3B6EA5) como secundária.
2. **Tema Rústico / Livro Antigo (`.pergaminho`)** — reformulado com a paleta de "livro-caixa antigo": fundo `#F5EFE2`, cards `#EFE3CC`, sidebar em couro `#4E342E`, primária `#6D4C41`, destaque dourado fosco `#B08D57`, vermelho ferrugem `#A94442` para despesas (no estilo tinta de contabilidade antiga) e verde musgo para receitas.
3. **Tema Escuro (`.dark`)** — reformulado para `#121212` (fundo) / `#1E1E1E` (cards) / `#181818` (sidebar), com verde esmeralda como cor de destaque/foco e verde financeiro mais claro nos botões (para manter contraste em fundo escuro).

**Todas as cores foram convertidas de HEX para OKLCH** (convenção já usada no projeto) para manter consistência de luminosidade/contraste entre os 3 temas.

**Melhorias visuais adicionais (também só em CSS):**
- Transição suave (250ms) entre temas em todos os elementos (background, borda, texto, sombra).
- Foco (`:focus-visible`) mais destacado em inputs/botões, usando a cor de destaque do tema ativo.
- Sombra discreta nos cards (`.bg-card`) para sensação de profundidade.
- Scrollbar fina e discreta, acompanhando a cor de borda do tema (Chrome/Edge/Firefox).

**Validação:** build de produção (`npx vite build`) executado com sucesso, sem erros.

**Observação:** o hover dos botões (`bg-primary/90`, etc.) já era feito por opacidade (padrão do componente `Button` do shadcn) — não foi alterado, pois isso exigiria tocar em JS/componentes, fora do escopo pedido.

---

## 2026-07-16 — Tema Rústico (`.pergaminho`) passou a ter fundo escuro

**Arquivo alterado:** `src/styles.css`

**Pedido:** manter a identidade "livro-caixa antigo" (couro, madeira, dourado), mas com fundo escuro em vez do bege claro.

**O que mudou:**
- Fundo: de `#F5EFE2` (bege claro) → `#211811` (madeira/couro escuro).
- Cards: `#2B2116`, um tom de "capa de couro" ligeiramente mais claro que o fundo.
- Sidebar: `#160F09`, ainda mais escura, como a lombada do livro.
- Texto principal: `#E4D5B7` (creme/pergaminho), para leitura confortável sobre o fundo escuro.
- Cor primária (botões): dourado fosco `#B08D57` (mantido), agora com texto escuro em cima (`#2E2A26`) — efeito de "letras douradas gravadas".
- Verde (receita), vermelho/ferrugem (despesa) e azul petróleo (investimentos) foram clareados em relação à versão clara, para continuarem legíveis sobre o fundo escuro, mantendo a mesma identidade de cor.

**Validação:** build de produção rodado novamente, sem erros.
