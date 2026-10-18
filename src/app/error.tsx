"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main id="main-content" className="configuration-notice"><p className="eyebrow">SAT Study OS</p><h1>Não foi possível abrir este espaço.</h1><p role="alert">Ocorreu um erro ao carregar a página. Você pode tentar novamente.</p><Button onClick={reset}>Tentar novamente</Button></main>;
}
