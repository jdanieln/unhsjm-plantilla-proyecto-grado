import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@/app/globals.css";
import "@/app/theme.css";
import { themeInitializationScript } from "@/components/ui/ThemeToggle/theme";

export const metadata: Metadata = {
  title: "TravelDLS",
  description: "Aplicación web de TravelDLS.",
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="es" data-theme="dark" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeInitializationScript }} /></head>
      <body>{children}</body>
    </html>
  );
}
