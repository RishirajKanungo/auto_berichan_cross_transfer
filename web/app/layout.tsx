import type { Metadata } from "next";
import "./globals.css";
import { AppProviders } from "@/components/AppProviders";

export const metadata: Metadata = {
  title: "Berichan Trader — Team Builder",
  description:
    "Build Pokémon Champions teams in your browser: full legal roster, items, moves, abilities, and the Stat-Point editor.",
};

// Set the saved theme before paint to avoid a flash of the wrong theme.
const themeInit = `(function(){try{var t=localStorage.getItem('berichan.theme')||'material';document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','material');}})();`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="material" className="h-full antialiased">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className="min-h-full">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
