import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/politica-privacidade")({
  head: () => ({
    meta: [
      { title: "Política de Privacidade — Livro Caixa" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PrivacidadePage,
});

function PrivacidadePage() {
  return (
    <div className="min-h-screen bg-background px-4 py-12">
      <div className="max-w-3xl mx-auto">
        <Link to="/auth" className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4">
          ← Voltar
        </Link>
        <h1 className="font-serif text-3xl font-semibold mt-4 mb-1">Política de Privacidade</h1>
        <p className="text-sm text-muted-foreground mb-8">Última atualização: 19 de julho de 2026</p>

        <div className="prose prose-sm max-w-none space-y-6 text-foreground [&_h2]:font-serif [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mt-8 [&_h2]:mb-2 [&_p]:text-sm [&_p]:leading-relaxed [&_li]:text-sm [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1">
          <p>
            Esta Política de Privacidade descreve como <strong>[SEU NOME COMPLETO / RAZÃO SOCIAL]</strong>
            {" "}("Operador", "nós"), responsável pelo <strong>Livro Caixa</strong>, coleta, usa,
            armazena e protege os dados pessoais dos usuários ("você"), em conformidade com a Lei
            Geral de Proteção de Dados Pessoais (LGPD — Lei nº 13.709/2018).
          </p>

          <h2>1. Quais dados coletamos</h2>
          <ul>
            <li><strong>Dados de cadastro:</strong> nome e e-mail informados no cadastro.</li>
            <li><strong>Dados de autenticação:</strong> sua senha é armazenada de forma criptografada (hash) pelo provedor de autenticação (Supabase/Lovable Cloud) — nunca em texto legível.</li>
            <li><strong>Dados financeiros que você insere:</strong> transações, contas, cartões de crédito, faturas, metas e investimentos que você cadastra manualmente para usar a ferramenta.</li>
            <li><strong>Dados técnicos básicos:</strong> preferências salvas localmente no seu navegador (como tema visual e último cartão visualizado), que não saem do seu dispositivo.</li>
          </ul>

          <h2>2. Para que usamos seus dados</h2>
          <p>Usamos os dados exclusivamente para:</p>
          <ul>
            <li>Viabilizar o funcionamento do Serviço (exibir seus lançamentos, calcular saldos, gerar gráficos e relatórios);</li>
            <li>Autenticar seu acesso e proteger sua conta;</li>
            <li>Enviar comunicações operacionais essenciais (confirmação de cadastro, recuperação de senha, avisos sobre o Serviço).</li>
          </ul>
          <p>Não usamos seus dados financeiros para publicidade, e não os vendemos a terceiros.</p>

          <h2>3. Onde seus dados ficam armazenados</h2>
          <p>
            Os dados são armazenados na infraestrutura do Supabase / Lovable Cloud, provedores de
            banco de dados e hospedagem em nuvem utilizados pelo Serviço. Isso pode envolver o
            processamento de dados em servidores localizados fora do Brasil, sempre com
            salvaguardas de segurança compatíveis com a LGPD (controle de acesso por usuário,
            criptografia em trânsito, e isolamento dos dados de cada conta).
          </p>

          <h2>4. Com quem compartilhamos</h2>
          <p>
            Não compartilhamos seus dados financeiros com terceiros para fins comerciais. Podemos
            compartilhar dados estritamente necessários com prestadores de infraestrutura técnica
            (hospedagem, banco de dados, envio de e-mail transacional) apenas na medida em que
            isso for necessário para o funcionamento do Serviço, e mediante obrigações de
            confidencialidade.
          </p>

          <h2>5. Seus direitos como titular de dados (LGPD)</h2>
          <p>Você pode, a qualquer momento, solicitar:</p>
          <ul>
            <li>Confirmação da existência de tratamento e acesso aos seus dados;</li>
            <li>Correção de dados incompletos, inexatos ou desatualizados;</li>
            <li>Exclusão dos seus dados e da sua conta;</li>
            <li>Portabilidade dos seus dados a outro fornecedor de serviço, quando tecnicamente viável;</li>
            <li>Revogação do consentimento e informação sobre com quem seus dados foram compartilhados.</li>
          </ul>
          <p>
            Para exercer qualquer um desses direitos, entre em contato pelo e-mail indicado abaixo.
            Você também pode excluir transações, contas, cartões e demais registros diretamente
            pela própria interface do Serviço, a qualquer momento.
          </p>

          <h2>6. Retenção e exclusão de dados</h2>
          <p>
            Mantemos seus dados enquanto sua conta estiver ativa. Ao solicitar o encerramento da
            conta, seus dados são excluídos da base de produção, ressalvadas hipóteses em que a
            manutenção por prazo determinado seja exigida por lei.
          </p>

          <h2>7. Segurança</h2>
          <p>
            Adotamos controles técnicos para proteger seus dados, incluindo isolamento de dados
            por conta a nível de banco de dados (cada usuário só acessa os próprios registros, ou
            os do workspace do qual participa) e conexões criptografadas (HTTPS). Apesar dos
            esforços, nenhum sistema é 100% livre de riscos, e o Usuário também é responsável por
            manter sua senha em sigilo.
          </p>

          <h2>8. Alterações desta Política</h2>
          <p>
            Esta Política pode ser atualizada periodicamente. Mudanças relevantes serão
            comunicadas pelos meios disponíveis no Serviço.
          </p>

          <h2>9. Contato do Controlador</h2>
          <p>
            Para dúvidas, solicitações ou exercício de direitos relacionados aos seus dados
            pessoais, entre em contato: <strong>[SEU E-MAIL DE CONTATO]</strong>.
          </p>
        </div>

        <p className="text-xs text-muted-foreground mt-10">
          Consulte também os <Link to="/termos" className="underline">Termos de Uso</Link>.
        </p>
      </div>
    </div>
  );
}
