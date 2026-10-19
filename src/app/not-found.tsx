import Link from "next/link";

export default function NotFound() {
  return <main id="main-content" className="configuration-notice"><p className="eyebrow">404 · SAT Study OS</p><h1>Este caminho ainda não existe.</h1><p>Volte ao dashboard para escolher uma atividade.</p><Link href="/">Ir ao dashboard</Link></main>;
}
