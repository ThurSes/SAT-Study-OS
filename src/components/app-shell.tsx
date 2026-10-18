import Link from "next/link";
import { ArrowLeft, ArrowUpRight, LayoutDashboard, LibraryBig, PanelTop, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { ThemeToggle } from "@/components/theme-toggle";

type Page = "dashboard" | "simulator";
const navigation: { page: Page; href: string; label: string; icon: typeof LayoutDashboard }[] = [
  { page: "dashboard", href: "/", label: "Visão geral", icon: LayoutDashboard },
  { page: "simulator", href: "/simulador", label: "Simulador", icon: PanelTop },
];

export function AppShell({ children, activePage, developmentData = false }: { children: ReactNode; activePage: Page; developmentData?: boolean }) {
  const isSimulator = activePage === "simulator";
  return (
    <div className={isSimulator ? "app-shell app-shell-simulator" : "app-shell"}>
      <a className="skip-link" href="#main-content">Pular para o conteúdo</a>
      <aside className="app-sidebar" aria-label="Menu principal">
        <Link href="/" className="brand" aria-label="SAT Study OS — início">
          <span className="brand-monogram">S<span>.</span></span>
          <span className="brand-name">SAT<span>STUDY OS</span></span>
        </Link>
        <div className="sidebar-body">
          <p className="eyebrow nav-caption">Seu espaço de estudo</p>
          <nav className="app-nav" aria-label="Navegação principal">
            {navigation.map(({ page, href, label, icon: Icon }) => (
              <Link key={page} href={href} aria-current={activePage === page ? "page" : undefined}>
                <Icon size={18} aria-hidden="true" /><span>{label}</span>
                {activePage === page && <span className="nav-active-dot" aria-hidden="true" />}
              </Link>
            ))}
          </nav>
          <div className="sidebar-future">
            <p className="eyebrow nav-caption">Mais adiante</p>
            <p><LibraryBig size={18} aria-hidden="true" /> Biblioteca de estudo</p>
            <span>Disponível em uma próxima etapa.</span>
          </div>
        </div>
        <div className="sidebar-note"><Sparkles size={18} aria-hidden="true" /><p>Um pouco de foco.<br /><strong>Um novo horizonte.</strong></p></div>
        <p className="sidebar-version">Uma rotina, muitas possibilidades.<span>Study OS · 1.0</span></p>
      </aside>
      <div className="app-workspace">
        <header className="workspace-header">
          {isSimulator ? <Link className="simulator-return" href="/"><ArrowLeft size={16} aria-hidden="true" /> Voltar à visão geral</Link> : <div className="workspace-breadcrumb"><span>Seu espaço</span><span aria-hidden="true">/</span><strong>Visão geral</strong></div>}
          <div className="workspace-actions">
            {developmentData && <span className="environment-label"><span aria-hidden="true" /> Ambiente de desenvolvimento</span>}
            <ThemeToggle />
          </div>
        </header>
        <main id="main-content" className={isSimulator ? "app-main app-main-simulator" : "app-main"} tabIndex={-1}>{children}</main>
        <footer className="workspace-footer"><span>SAT Study OS</span><span>Construindo uma rotina com intenção <ArrowUpRight size={13} aria-hidden="true" /></span></footer>
      </div>
    </div>
  );
}
