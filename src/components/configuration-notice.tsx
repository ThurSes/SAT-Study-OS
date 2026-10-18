import Link from "next/link";

export function ConfigurationNotice() {
  return <main id="main-content" className="configuration-notice">
    <p className="eyebrow">SAT Study OS · 1.0</p>
    <h1>Seu espaço está sendo preparado.</h1>
    <p>Esta fundação ainda não está conectada a uma conta ou banco de dados. Dados de exemplo ficam disponíveis somente no ambiente de desenvolvimento.</p>
    <p>Para avaliar as duas telas localmente, inicie com <code>npm run dev</code>.</p>
    <Link href="/">Voltar ao início</Link>
  </main>;
}
