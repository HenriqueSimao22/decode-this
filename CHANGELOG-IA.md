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

---

## 2026-07-17 — Cartões (bloqueio por limite), Fatura em Contas, tema Pergaminho marrom café, abas de Metas e Investimentos

### 1. Banco de dados (nova migração `20260717003201_add_bloqueio_metas_investimentos.sql`)
- `cartoes.bloqueado` (boolean) — novo campo.
- Tabela `metas` + `metas_aportes` (histórico de aportes/retiradas).
- Tabela `investimentos`.
- RLS habilitada nas três, seguindo o mesmo padrão de `private.is_workspace_member(...)` já usado no restante do projeto.
- **Você precisa aplicar essa migração no seu projeto Supabase** (`supabase db push` ou colando o SQL no editor do Supabase) antes de usar essas funcionalidades. Também atualizei manualmente `src/integrations/supabase/types.ts` para refletir o novo schema (o ideal, depois de aplicar a migração, é rodar `supabase gen types` para regenerar esse arquivo automaticamente a partir do banco real).

### 2. Cartões de crédito
- **Bloqueio por limite excedido**: ao lançar uma compra que ultrapasse o limite, o cartão é marcado como bloqueado automaticamente (`recalcularBloqueio`). Um cartão bloqueado não aceita novas compras (erro claro no back-end) até que a fatura seja paga (ou a compra removida) e o total em aberto volte a ficar dentro do limite — nesse momento ele desbloqueia sozinho.
- Aviso visual: banner vermelho na tela do cartão, badge "Bloqueado" na listagem e no detalhe, valor da fatura exibido em vermelho com o quanto excedeu, e o botão "Nova compra" fica desabilitado.
- Extrato de compras da fatura (tela de detalhe do cartão) agora segue o mesmo padrão visual da lista de Transações (barra de cor lateral, sinal "−", mesmo espaçamento).

### 3. Fatura na aba Contas
- Faturas em aberto de todos os cartões agora aparecem automaticamente na aba **Contas** como "Fatura {Mês} — {Cartão}", com ícone de cartão, vencimento e valor total.
- Clicar em "pagar" nessa linha chama a mesma função que a tela de cartão usa (`pagarFatura`) — ou seja, é a fatura de verdade sendo paga, não uma cópia solta.
- Não é possível editar/excluir essas linhas por ali (faz sentido só pelo cartão), mas o nome é um link direto para a tela do cartão.

### 4. Tema Pergaminho → Marrom café
- Trocado o visual anterior (couro escuro) por uma paleta "grão de café torrado" (`#3C2A21`) com destaques em bronze/dourado quente (`#C4975B`), verde sálvia para receitas e terracota para despesas — mantendo a proposta rústica/elegante, agora com uma cara mais atual.
- Temas Claro e Escuro não foram tocados.

### 5. Nova aba: Metas
- Dois tipos de meta: **economia** (juntar dinheiro para um objetivo, com aportes/retiradas manuais e histórico) e **limite de gasto por categoria** (progresso calculado automaticamente a partir das despesas do mês na categoria escolhida — sem precisar lançar nada à parte).
- Barra de progresso dinâmica, com aviso visual quando o limite de gasto é ultrapassado e celebração 🎉 quando a meta de economia é concluída.
- As metas também aparecem resumidas na **Visão Geral**, com barra de % dinâmica, como pedido.

### 6. Nova aba: Investimentos
- Cadastro manual de ações, FIIs, renda fixa, criptomoedas, fundos e outros — com quantidade, preço médio e valor atual por unidade (editável a qualquer momento).
- Cálculo automático de valor investido, valor atual (patrimônio), rentabilidade % e distribuição por tipo.
- Atualização de cotação é 100% manual por enquanto — ficou combinado que a automação (buscar cotação real periodicamente) é assunto para uma próxima conversa.

### Validação
- `npx vite build` ✅ sem erros
- `npx tsc --noEmit` ✅ zero erros de tipo (incluindo os tipos do Supabase atualizados manualmente para as tabelas novas)
