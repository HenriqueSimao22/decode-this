## O que vou fazer

### 1. Definir sua senha
Sua conta `henriquesimao.eng@gmail.com` foi criada via Google e não tinha senha. Vou definir `Jogador22` no seu registro existente — você continua entrando pelo Google **e** pelo e-mail/senha.

### 2. Conta conjunta (Workspaces)

Modelo novo: todo lançamento pertence a um **workspace** (não mais a um usuário). Cada workspace é `individual` (só você) ou `conjunta` (você + convidados). Cada registro guarda **quem lançou** para aparecer com nome e avatar de cor.

**Regras principais:**
- Todo usuário ganha automaticamente 1 workspace individual ao se cadastrar.
- Qualquer usuário pode criar workspaces conjuntos adicionais e convidar por e-mail.
- Ao entrar num workspace conjunto, **os lançamentos antigos do individual ficam separados** (não migram automaticamente). Você alterna pelo seletor no topo.
- Convite: dono gera link com token → outro usuário aceita entrando na conta dele.
- Cada membro tem uma cor definida (paleta pré-definida ou personalizada).

### 3. Banco de dados

**Novas tabelas:**
- `workspaces` — id, nome, tipo (individual/conjunta), criado_por
- `workspace_members` — workspace_id, user_id, cor, papel (dono/membro), entrou_em
- `workspace_invites` — workspace_id, email_convidado, token, status, expira_em

**Colunas novas em existentes:**
- `transacoes`, `contas`, `categorias` → `workspace_id` (obrigatório) e `criado_por` (quem lançou)
- Migração: cria 1 workspace individual pra cada usuário existente, aponta todos os registros dele pra esse workspace.

**RLS:** só membros ativos do workspace enxergam/editam. Convites só o dono gerencia.

### 4. Backend (server functions)

- `workspaces.functions.ts`: listar meus workspaces, criar conjunto, convidar por e-mail, aceitar convite, listar membros, mudar cor, remover membro (só dono), sair do workspace, definir workspace ativo (guardado no `profiles`).
- Ajustar `livrocaixa.functions.ts` e `contas.functions.ts` para filtrar por `workspace_id` ativo (guardado num campo `workspace_ativo` em `profiles`) e gravar `criado_por = userId`.
- Categorias passam a ser por workspace (workspaces novos ganham as 13 categorias padrão via seed).

### 5. Frontend

- **Seletor de workspace no topbar** (dropdown com nome + avatares dos membros; opção "Criar novo").
- **Página `/workspace`** — configurações: renomear, gerenciar membros (nome, cor, remover), gerar convite (link copiável), listar convites pendentes.
- **Página `/convite/$token`** — aceitar convite (precisa estar logado).
- **Nos lançamentos e contas**: mostrar avatar circular colorido + primeiro nome de quem lançou, ao lado do valor. Filtro adicional "Por pessoa" quando o workspace tem mais de 1 membro.
- **Cadastro atualizado**: primeira pergunta após signup → "Você quer usar sozinho ou vai compartilhar com alguém?" (só sugere criar conjunto; individual já existe).

### 6. Fora do escopo desta fase
- Notificação por e-mail do convite (por enquanto o dono copia o link e manda). Podemos adicionar e-mail transacional depois.
- Divisão de despesas / quem-deve-a-quem: por enquanto tudo é do casal, sem cálculo de acerto.
- Migração dos dados antigos: mantidos no individual conforme você decidiu.

---

**Se aprovar, executo nesta ordem:**
1. Migração SQL (senha + tabelas + RLS + backfill)
2. Server functions de workspace + ajustes nas existentes
3. Seletor + página de workspace + página de convite
4. Autoria visual nos lançamentos e contas