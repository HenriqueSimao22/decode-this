import type { SVGProps } from "react";

// Ícone de livro-razão aberto — remete a um livro contábil, com linhas
// representando os lançamentos. Usa currentColor para herdar a cor do texto
// onde for aplicado (ex: text-sidebar-primary), acompanhando o tema ativo.
export function LivroCaixaLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        d="M4 10.5C4 8.6 5.7 7.2 7.6 7.6L19 10V32L7.6 29.4C5.7 29 4 27.4 4 25.5V10.5Z"
        fill="currentColor"
        fillOpacity="0.14"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M36 10.5C36 8.6 34.3 7.2 32.4 7.6L21 10V32L32.4 29.4C34.3 29 36 27.4 36 25.5V10.5Z"
        fill="currentColor"
        fillOpacity="0.14"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <line x1="20" y1="9.3" x2="20" y2="31.3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="8" y1="14.4" x2="15.5" y2="15.6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" opacity="0.85" />
      <line x1="8" y1="18.6" x2="15.5" y2="19.6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" opacity="0.85" />
      <line x1="8" y1="22.8" x2="15.5" y2="23.6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" opacity="0.85" />
      <line x1="24.5" y1="15.6" x2="32" y2="14.4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" opacity="0.85" />
      <line x1="24.5" y1="19.6" x2="32" y2="18.6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" opacity="0.85" />
      <line x1="24.5" y1="23.6" x2="32" y2="22.8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" opacity="0.85" />
    </svg>
  );
}
