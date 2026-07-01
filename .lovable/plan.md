
## Objetivo

Transformar o `controle-financeiro.html` (app local que guarda tudo no `localStorage`) em uma **plataforma online multiusuário**, onde cada pessoa cria uma conta e tem seu próprio livro caixa privado no banco de dados. Vamos entregar em fases; nesta primeira o foco é o MVP.

## Fase 1 — MVP (esta entrega)

Inclui: autenticação, dashboard "Visão geral", módulo de "Receitas e despesas" e importação do backup JSON gerado pelo app antigo. Categorias, tema claro/escuro e a identidade visual do original (fontes Fraunces/Source Sans, tipografia de "recibo", paleta bege/verde/vermelho) são mantidas.

### Telas
1. **/auth** — Cadastro/login por e-mail e senha + botão "Entrar com Google". Recuperação de senha.
2. **/** (protegida) — **Visão geral**: cards de saldo do mês, total de receitas e despesas, gráfico de barras (receitas x despesas por mês) e gráfico de pizza (despesas por categoria). Botões rápidos "+ Receita" / "+ Despesa".
3. **/transacoes** — Lista de receitas e despesas com navegação por mês, busca, filtros (tipo/categoria) e CRUD completo em modal.
4. **/configuracoes** — Perfil (nome), tema claro/escuro, **Importar backup** (JSON do app antigo) e **Exportar backup** (JSON), sair da conta.

### Fases futuras (não entram agora)
- Contas a pagar/receber
- Cartões de crédito e faturas
- Metas de economia
- Investimentos

Cada uma vira uma nova aba/rota reaproveitando o mesmo padrão de dados.

---

## Detalhes técnicos

### Stack
- Frontend: TanStack Start (já configurado) + Tailwind + shadcn/ui + Chart.js (react-chartjs-2).
- Backend: **Lovable Cloud** (PostgreSQL gerenciado, gratuito no plano inicial) — habilitado via `supabase--enable`.
- Auth: Lovable Cloud Auth com **e-mail/senha + Google** (`supabase--configure_social_auth` com `google`).
- Server functions: `createServerFn` com `requireSupabaseAuth` para todo CRUD; RLS garante isolamento por usuário.

### Schema (migration inicial)
```sql
-- profiles: dados do usuário além do auth.users
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text,
  tema text not null default 'claro',
  created_at timestamptz not null default now()
);

-- categorias por usuário (com defaults semeados no signup)
create table public.categorias (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null,
  tipo text not null check (tipo in ('receita','despesa')),
  cor text,
  created_at timestamptz not null default now()
);

-- transações
create table public.transacoes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tipo text not null check (tipo in ('receita','despesa')),
  descricao text not null,
  valor numeric(14,2) not null check (valor >= 0),
  categoria_id uuid references public.categorias(id) on delete set null,
  data date not null,
  observacao text,
  created_at timestamptz not null default now()
);
create index on public.transacoes (user_id, data desc);
```
- GRANTs para `authenticated`/`service_role` em todas as tabelas.
- RLS habilitada + políticas `auth.uid() = user_id` para SELECT/INSERT/UPDATE/DELETE.
- Trigger `on_auth_user_created` que cria `profiles` e semeia categorias padrão (Alimentação, Moradia, Transporte, Salário, etc.) no cadastro.

### Server functions (`src/lib/*.functions.ts`)
- `listarTransacoes({ mes?, tipo?, categoriaId?, busca? })`
- `criarTransacao`, `atualizarTransacao`, `excluirTransacao`
- `resumoMensal({ ano })` → agregações para os gráficos (barras e pizza)
- `listarCategorias`, `criarCategoria`
- `importarBackup({ payload })` → parseia o JSON do app antigo (chaves `transacoes`, `categorias`, `perfil`) e faz insert em lote validado com Zod
- `exportarBackup()` → devolve JSON compatível com o formato original

### Roteamento
- `src/routes/auth.tsx` (público, com login + Google).
- `src/routes/_authenticated/route.tsx` (gate gerenciado — apenas criado se ainda não existir).
- `src/routes/_authenticated/index.tsx` (visão geral).
- `src/routes/_authenticated/transacoes.tsx`.
- `src/routes/_authenticated/configuracoes.tsx`.

### Padrão de dados
Loader chama `queryClient.ensureQueryData(queryOptions)`; componente usa `useSuspenseQuery`. Mutações via `useMutation` + `queryClient.invalidateQueries`. Toasts com `sonner`.

### Design
Reaproveitar a identidade do HTML original:
- Fontes Google: Fraunces (títulos), Source Sans 3 (texto), Space Mono (valores monetários) — carregadas via `<link>` em `__root.tsx`.
- Tokens semânticos em `src/styles.css`: bege papel `oklch(...)`, verde receita, vermelho despesa, dourado destaque; variantes claro/escuro.
- Componentes shadcn (Button, Dialog, Input, Select, Card, Tabs) customizados via CSS vars.

### Importação do backup
- Botão em Configurações abre `<input type="file" accept="application/json">`.
- Cliente lê arquivo, envia payload para `importarBackup`.
- Server function valida com Zod, mapeia categorias por nome (cria as que faltarem) e insere transações. Ignora silenciosamente registros duplicados por `(user_id, data, descricao, valor)`.
- Retorna resumo: X transações importadas, Y categorias criadas.

### Segurança
- RLS em todas as tabelas + policies escritas com `auth.uid()`.
- Validação Zod em toda entrada (client e server).
- Nenhum `service_role` no client; nenhum segredo em código.
- Google OAuth via helper `lovable.auth.signInWithOAuth("google", ...)`.

### SEO / metadata
- Título: "Livro Caixa — Controle Financeiro Online".
- Descrição PT-BR (< 160 chars) em `__root.tsx`; `og:title`, `og:description`, `twitter:card` correspondentes.

---

## O que você precisa fazer
Depois que eu implementar:
1. Confirmar o cadastro por e-mail (Cloud envia link de confirmação).
2. Se quiser Google já ativo em produção: eu configuro o provider automaticamente; nenhuma ação sua é necessária para o preview.
3. Testar importando um backup JSON que você exportar do app HTML atual.

Quando quiser, seguimos com a Fase 2 (Contas a pagar/receber → Cartões → Metas → Investimentos).
