import { FlaskConical } from "lucide-react";
import type { ReactNode } from "react";

export function PageIntro({ eyebrow, title, description, children, developmentData = true }: {
  eyebrow: string; title: string; description: string; children?: ReactNode; developmentData?: boolean;
}) {
  return <>
    <header className="page-intro feature-intro">
      <div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="page-description">{description}</p></div>
      {children}
    </header>
    {developmentData && <div className="development-note" role="note"><FlaskConical size={16} aria-hidden="true" /><p><strong>Dados de desenvolvimento.</strong> Exemplos para explorar a interface. Alterações ficam apenas nesta página e são descartadas ao sair ou recarregar.</p></div>}
  </>;
}
