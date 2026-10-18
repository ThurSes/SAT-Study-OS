import Link from "next/link";

export function ConfigurationNotice() {
  return <main id="main-content" className="configuration-notice">
    <p className="eyebrow">SAT Study OS · 1.0</p>
    <h1>Seu espaço está sendo preparado.</h1>
    <p>A conexão com Supabase ainda precisa da configuração do projeto. O login e o salvamento ficarão disponíveis após essa etapa. Dados de exemplo são usados somente em desenvolvimento.</p>
    <p>Você já pode explorar as aulas e exemplos originais.</p>
    <Link href="/conteudos">Explorar conteúdos</Link><p><Link href="/login">Acessar sua conta</Link></p>
  </main>;
}
