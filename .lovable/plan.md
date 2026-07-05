## O que vou fazer

### 1. Admin: excluir código revogado
- Botão "Excluir" (lixeira) aparece apenas em códigos com status `revogado` na aba Códigos do painel admin.
- Nova função `excluirCodigo` em `admin.functions.ts` que verifica papel admin e faz `DELETE` só se o status for `revogado` (nunca deleta ativos/usados).
- Confirmação antes de excluir.

### 2. Usuário: excluir workspace
- Botão "Excluir workspace" na página `/workspace`, visível apenas para o **dono** e apenas se o workspace **não for o único** do usuário (senão o app fica sem workspace ativo).
- Confirmação com aviso: "Isso apaga todas as transações, contas, categorias e cartões deste workspace. Não dá pra desfazer."
- Nova função `excluirWorkspace` em `workspaces.functions.ts`: valida papel `dono` + não é o último workspace do usuário → deleta o workspace (cascata SQL apaga membros, convites, transações, contas, categorias, cartões).
- Se o workspace excluído era o ativo, seta `profiles.workspace_ativo` para outro workspace do usuário.
- Migração: adiciona `ON DELETE CASCADE` nas FKs que faltarem (workspace_members, workspace_invites, transacoes, contas, categorias, cartoes, faturas, transacoes_cartao) para não deixar órfãos.

### 3. Cartões de crédito

**Modelo de dados** (nova migração):

- `cartoes` — id, workspace_id, criado_por, nome (apelido, ex.: "Nubank Roxinho"), bandeira (visa/mastercard/elo/amex/hipercard), banco (código da lista abaixo), cor, limite, dia_fechamento (1–31), dia_vencimento (1–31), conta_pagamento_id (conta usada para pagar a fatura, opcional), ativo (bool).
- `faturas` — id, cartao_id, mes_referencia (YYYY-MM), data_fechamento, data_vencimento, valor_total (calculado), status (aberta/fechada/paga), pago_em, pago_conta_id. Uma fatura por cartão por mês.
- `transacoes_cartao` — id, cartao_id, fatura_id (calculado no insert), workspace_id, criado_por, categoria_id, descricao, valor_total, data_compra, parcelas_total (1–24), parcela_atual (1..parcelas_total), valor_parcela, grupo_compra_id (uuid que agrupa todas as parcelas da mesma compra), observacoes.
- Ao inserir uma compra parcelada, o backend cria N linhas (uma por parcela) e cada linha entra na fatura correta (baseado em `data_compra` + `dia_fechamento`).

**Lógica de fatura**:
- Compra feita **antes** do dia de fechamento do mês → fatura do mês atual (vence no `dia_vencimento` do mês seguinte).
- Compra feita **depois** do fechamento → fatura do mês seguinte.
- Fatura é criada/reutilizada automaticamente ao lançar a compra.
- Pagar fatura: gera uma transação de despesa na `conta_pagamento_id` (ou conta escolhida no ato), marca fatura como paga.

**Bancos suportados** (lista da referência — ampla o suficiente para cobrir os principais no Brasil):

Nubank, Itaú, Bradesco, Santander, Banco do Brasil, Caixa, Inter, C6 Bank, BTG Pactual, XP Investimentos, Sicoob, Sicredi, Banrisul, Safra, PagBank/PagSeguro, Mercado Pago, PicPay, Neon, Next, Original, Will Bank, Digio, Ame Digital, Trigg, Porto Seguro, Renner, Riachuelo, C&A, Marisa, Havan, Havan, Credicard, American Express, Latam Pass Itaú, Smiles Bradesco, Localiza, Bmg, Pan, Cetelem, Genial, Modalmais, e **Outro** (com campo livre).

Cada banco tem um logo/inicial + cor padrão pré-definida (o usuário pode sobrescrever a cor).

**Server functions** (`cartoes.functions.ts`):
- `listarCartoes` — lista os cartões do workspace ativo com totais da fatura atual.
- `criarCartao`, `editarCartao`, `arquivarCartao`, `excluirCartao`.
- `listarFatura(cartao_id, mes_referencia)` — retorna a fatura + linhas.
- `listarFaturasCartao(cartao_id)` — histórico de faturas.
- `lancarCompraCartao` — cria a compra com N parcelas, atribuindo cada parcela à fatura certa.
- `editarCompraCartao` / `excluirCompraCartao` — edita/apaga o grupo inteiro (todas as parcelas) por padrão, com opção de apagar só uma parcela.
- `pagarFatura(fatura_id, conta_id, data_pagamento)` — cria transação de despesa e marca fatura como paga.

**RLS**: só membros do workspace veem/editam. Todos os inserts gravam `criado_por`.

**Frontend**:

- **Aba nova "Cartões"** no sidebar (ícone `CreditCard`).
- Rota `/_authenticated/cartoes` — grid de cards mostrando cada cartão (cor + banco + apelido, fatura atual, limite disponível). Clique abre detalhe.
- Rota `/_authenticated/cartoes/$id` — detalhe do cartão:
  - Header com apelido, banco, bandeira, limite, cor.
  - Seletor de mês (igual transações/contas) navegando entre faturas.
  - Lista de compras da fatura (com autor + parcela X/Y).
  - Botões: **Nova compra**, **Pagar fatura** (quando fechada), **Editar cartão**, **Arquivar/Excluir**.
- **Modal `CartaoModal`** — criar/editar cartão: apelido, banco (autocomplete com logo), bandeira, dia_fechamento, dia_vencimento, limite, cor, conta padrão de pagamento.
- **Modal `CompraCartaoModal`** — nova compra: descrição, categoria, valor total, data, parcelas (1–24 com preview do valor da parcela e das faturas afetadas), observações.
- **Modal `PagarFaturaModal`** — escolher conta + data → confirma pagamento.
- Autoria (avatar + nome) nas linhas da fatura, igual às demais listas.

### Fora do escopo desta fase
- Notificações de vencimento de fatura.
- Estorno / parcelamento de fatura em si (só parcelamento da compra).
- Importação de fatura por PDF/OFX.

---

**Ordem de execução se aprovar**:
1. Migração SQL (cartões + faturas + transacoes_cartao + RLS + cascades das FKs existentes).
2. Server functions (admin excluir código, excluir workspace, cartões).
3. Frontend (botões de exclusão + páginas e modais de cartões).