import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const inter = localFont({
  src: "../../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2",
  variable: "--font-inter", display: "swap", weight: "100 900", fallback: ["Arial"],
});
const sourceSerif = localFont({
  src: "../../node_modules/@fontsource-variable/source-serif-4/files/source-serif-4-latin-wght-normal.woff2",
  variable: "--font-source-serif", display: "swap", weight: "200 900", fallback: ["Georgia"],
});

export const metadata: Metadata = {
  title: { default: "Seu estudo, com direção · SAT Study OS", template: "%s · SAT Study OS" },
  description: "Um espaço para estudar com intenção, compreender seus erros e acompanhar seu progresso no SAT.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR" className={`${inter.variable} ${sourceSerif.variable}`}><body>{children}</body></html>;
}
