import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Recorder Reflex — entraîne tes réflexes",
  description: "Apprends et entraîne les doigtés de la flûte à bec soprano allemande.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
