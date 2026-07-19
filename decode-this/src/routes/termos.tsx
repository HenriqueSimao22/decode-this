import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/termos")({
  head: () => ({
    meta: [
      { title: "Termos de Uso — Livro Caixa" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TermosPage,
});

function TermosPage() {
  return (
    <div className="min-h-screen bg-background px-4 py-12">
      <div className="max-w-3xl mx-auto">
        <Link to="/auth" className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4">
          ← Voltar
        </Link>
        <h1 className="font-serif text-3xl font-semibold mt-4 mb-1">Termos de Uso</h1>
        <p className="text-sm text-muted-foreground mb-8">Última atualização: 19 de julho de 2026</p>

        <div className="prose prose-sm max-w-none space-y-6 text-foreground [&_h2]:font-serif [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mt-8 [&_h2]:mb-2 [&_p]:text-sm [&_p]:leading-relaxed [&_li]:text-sm [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1">
          <p>
            Estes Termos de Uso regulam o acesso e a utilização do <strong>Livro Caixa</strong>
            {" "}("Serviço"), uma ferramenta de controle financeiro pessoal, disponibilizada por
            {" "}<strong>[SEU NOME COMPLETO / RAZÃO SOCIAL]</strong>, inscrito(a) no CPF/CNPJ
            {" "}<strong>[SEU CPF OU CNPJ]</strong>, doravante denominado "Operador". Ao criar uma
            conta ou utilizar o Serviço, você ("Usuário") concorda integralmente com estes Termos.
          </p>

          <h2>1. O que é o Serviço</h2>
          <p>
            O Livro Caixa é uma ferramenta de organização financeira pessoal (registro manual de
            receitas, despesas, contas, cartões de crédito, metas e investimentos). O Serviço:
          </p>
          <ul>
            <li>Não é uma instituição financeira, banco, corretora ou meio de pagamento;</li>
            <li>Não realiza movimentações bancárias, transferências ou pagamentos reais;</li>
            <li>Não oferece consultoria, recomendação ou aconselhamento financeiro, contábil, tributário ou de investimentos;</li>
            <li>Depende de os dados serem inseridos manualmente (ou, futuramente, de integrações que venham a ser oferecidas) pelo próprio Usuário, sendo sua exatidão de responsabilidade do Usuário.</li>
          </ul>

          <h2>2. Cadastro e acesso</h2>
          <p>
            O cadastro é fechado e depende de um código de acesso fornecido pelo Operador. O
            Usuário é responsável por manter a confidencialidade de sua senha e por todas as
            atividades realizadas em sua conta. O Operador pode, a seu critério, suspender ou
            encerrar contas em caso de uso indevido, violação destes Termos ou inadimplência,
            quando aplicável.
          </p>

          <h2>3. Seus dados são seus</h2>
          <p>
            Todo o conteúdo financeiro inserido pelo Usuário (transações, saldos, metas,
            investimentos etc.) pertence ao próprio Usuário. O Operador atua apenas como
            processador técnico dessas informações para viabilizar o funcionamento do Serviço,
            conforme detalhado na nossa <Link to="/politica-privacidade" className="underline">Política de Privacidade</Link>.
          </p>

          <h2>4. Planos, cobrança e cancelamento</h2>
          <p>
            Enquanto o Serviço estiver em fase de convite/testes, o acesso pode ser gratuito ou
            mediante condições comunicadas diretamente pelo Operador. Caso e quando for
            implementada cobrança recorrente, as condições de preço, forma de pagamento,
            cancelamento e reembolso serão descritas em termos específicos, comunicados com
            antecedência. O Usuário pode solicitar o cancelamento de sua conta e a exclusão de
            seus dados a qualquer momento, pelo contato indicado no fim deste documento.
          </p>

          <h2>5. Disponibilidade e limitação de responsabilidade</h2>
          <p>
            O Serviço é oferecido "como está" e pode passar por instabilidades, manutenções ou
            mudanças, especialmente por estar em desenvolvimento contínuo. Na máxima extensão
            permitida em lei, o Operador não se responsabiliza por decisões financeiras tomadas
            pelo Usuário com base nas informações organizadas na ferramenta, nem por perdas
            decorrentes de indisponibilidade temporária do Serviço.
          </p>

          <h2>6. Alterações destes Termos</h2>
          <p>
            Estes Termos podem ser atualizados periodicamente. Mudanças relevantes serão
            comunicadas ao Usuário pelos meios disponíveis no Serviço (e-mail ou aviso no
            aplicativo).
          </p>

          <h2>7. Lei aplicável</h2>
          <p>
            Estes Termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o
            foro da comarca de <strong>[SUA CIDADE/UF]</strong> para dirimir eventuais controvérsias,
            com renúncia a qualquer outro, por mais privilegiado que seja.
          </p>

          <h2>8. Contato</h2>
          <p>
            Dúvidas sobre estes Termos podem ser enviadas para{" "}
            <strong>[SEU E-MAIL DE CONTATO]</strong>.
          </p>
        </div>
      </div>
    </div>
  );
}
