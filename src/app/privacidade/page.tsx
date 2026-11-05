import { Logo } from "@/components/Logo";

export const metadata = { title: "Política de Privacidade" };

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <Logo className="mb-6" />
      <article className="card space-y-4 p-6 text-sm leading-relaxed sm:p-8">
        <h1 className="text-2xl font-bold">Política de Privacidade</h1>
        <p className="text-slate-500">Modelo base – revise com o responsável jurídico/encarregado (DPO) da Nortetel antes de publicar.</p>
        <h2 className="text-lg font-semibold">1. Quem controla seus dados</h2>
        <p>A Nortetel é a controladora dos dados tratados neste sistema, utilizado para registrar e conferir as notas de uso do cartão corporativo.</p>
        <h2 className="text-lg font-semibold">2. Dados tratados</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Identificação: nome, CPF, e-mail, telefone, setor e perfil de acesso.</li>
          <li>Notas lançadas: data, valor, fornecedor, categoria, descrição, observações e anexos (fotos, PDF ou XML).</li>
          <li>Segurança: registros de acesso e de operações (data/hora, endereço IP e ação realizada).</li>
        </ul>
        <h2 className="text-lg font-semibold">3. Finalidades e base legal</h2>
        <p>Controle e prestação de contas de despesas corporativas, cumprimento de obrigações fiscais e contábeis (LGPD, art. 7º, II), execução do contrato de trabalho e legítimo interesse da empresa na segurança e prevenção a fraudes (art. 7º, IX).</p>
        <h2 className="text-lg font-semibold">4. Proteção</h2>
        <p>O CPF é armazenado criptografado; senhas usam hash seguro (argon2id); anexos ficam em área privada, acessíveis apenas por pessoas autorizadas; todo acesso a dados sensíveis é registrado em auditoria; o tráfego usa HTTPS.</p>
        <h2 className="text-lg font-semibold">5. Compartilhamento e retenção</h2>
        <p>Os dados não são vendidos. Podem ser compartilhados com a contabilidade e autoridades quando exigido por lei. Documentos fiscais são mantidos pelo prazo legal (em geral 5 anos).</p>
        <h2 className="text-lg font-semibold">6. Seus direitos (art. 18)</h2>
        <p>Você pode confirmar o tratamento, acessar e baixar seus dados (menu <em>Meu perfil</em>), corrigir dados e solicitar anonimização, observadas as obrigações legais de guarda. Para exercer direitos, procure o administrador do sistema ou o encarregado de dados da Nortetel.</p>
      </article>
    </main>
  );
}
