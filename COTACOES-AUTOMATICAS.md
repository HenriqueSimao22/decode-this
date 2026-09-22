# Cotações automáticas de investimentos — como configurar

O que foi implementado:
- **Botão "Atualizar cotações"** na página Investimentos — atualiza na hora, sempre que você clicar.
- **Atualização automática 1x por dia**, de segunda a sexta às 19h (horário de Brasília, já depois do fechamento da bolsa).
- Funciona para **Ações**, **FIIs** e **Criptomoedas** que tenham um ticker preenchido (ex: PETR4, MXRF11, BTC). Renda fixa, fundos e "outro" continuam manuais — não existe uma fonte pública simples de cotação em tempo real pra esses tipos.

Isso depende de duas coisas que só você pode configurar (por segurança, essas chaves nunca ficam no código):
1. Um token gratuito da **brapi.dev** (fonte das cotações de ações/FII).
2. Uma "senha" inventada por você (CRON_SECRET) que autoriza a atualização automática diária.

Siga os passos abaixo, na ordem. Nenhum deles é difícil, só precisa ser feito uma vez.

---

## Passo 1 — Criar o token gratuito na brapi.dev

1. Acesse **https://brapi.dev/dashboard** e crie uma conta grátis (dá pra usar Google).
2. No painel, gere um token de API. Copie esse token — é uma sequência de letras/números.
3. O plano grátis dá **15.000 consultas por mês**, muito mais do que você vai usar mesmo atualizando todo dia.

## Passo 2 — Colocar o token no app (pro botão "Atualizar cotações" funcionar)

O botão roda dentro do próprio app (não na nuvem do Supabase), então o token precisa estar nas variáveis de ambiente de onde o app é hospedado (Lovable Cloud, Vercel, Netlify etc.):

- Nome da variável: `BRAPI_TOKEN`
- Valor: o token que você copiou no Passo 1

Se estiver usando o Lovable, isso normalmente fica em **Project Settings → Environment Variables** (ou você me diz onde o app está hospedado que eu te aponto o lugar certo).

## Passo 3 — Publicar a Edge Function (pra atualização automática diária)

A atualização automática roda "na nuvem" do Supabase, então precisa da Supabase CLI (uma ferramenta de linha de comando). Se você nunca usou:

```bash
npm install -g supabase
supabase login
supabase link --project-ref vphzzejwkqiqsbennzel
```

Depois, publique a função e configure os dois segredos dela (troque pelos valores reais):

```bash
supabase functions deploy atualizar-cotacoes
supabase secrets set BRAPI_TOKEN=seu_token_da_brapi_aqui
supabase secrets set CRON_SECRET=invente_uma_senha_bem_dificil_aqui
```

> Guarde o valor que você usou em `CRON_SECRET` — vai precisar dele no próximo passo.

## Passo 4 — Ligar o agendamento diário

1. Abra o **SQL Editor** do seu projeto no site do Supabase.
2. Rode estas duas linhas (troque pelos valores reais do seu projeto — a URL e a "anon/publishable key" ficam em **Project Settings → API**):

```sql
select vault.create_secret('https://vphzzejwkqiqsbennzel.supabase.co', 'project_url');
select vault.create_secret('SUA_ANON_OU_PUBLISHABLE_KEY_AQUI', 'anon_key');
```

3. Abra o arquivo `supabase/migrations/20260921011623_agendamento_cotacoes.sql` e troque o texto `TROQUE_PELO_MESMO_VALOR_DO_CRON_SECRET` pelo **mesmo valor** que você definiu em `CRON_SECRET` no Passo 3.
4. Aplique essa migration (do jeito que vocês já costumam aplicar migrations no projeto — Lovable Cloud costuma sincronizar sozinho ao dar push no GitHub; se preferir manualmente, `supabase db push`).

## Passo 5 — Testar

- Abra a página **Investimentos** no app e clique em **"Atualizar cotações"**. Você deve ver uma mensagem dizendo quantas cotações foram atualizadas.
- Se algum ticker não for encontrado, ele aparece na mensagem — vale conferir se o código está certo (ex: `PETR4`, não `PETR4.SA`).
- Pra conferir se o agendamento automático foi criado, no SQL Editor:
  ```sql
  select * from cron.job;
  ```
- Pra ver se ele já rodou e o que aconteceu:
  ```sql
  select * from cron.job_run_details order by start_time desc limit 10;
  ```

---

### Dúvidas comuns

**"E se eu não configurar nada disso agora?"**
Sem problema — o botão "Atualizar cotações" simplesmente vai avisar que não encontrou o token e não vai quebrar nada. Renda fixa, fundos e "outro" continuam funcionando manualmente como sempre.

**"Cripto também precisa de token?"**
Não — cripto usa a CoinGecko, que é gratuita e não pede cadastro.

**"Posso mudar o horário da atualização automática?"**
Sim. No arquivo da migration, a linha `'0 22 * * 1-5'` é o horário em UTC (22h UTC = 19h em Brasília). Me chama que eu ajusto pra você.
