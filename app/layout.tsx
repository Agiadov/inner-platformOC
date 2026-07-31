import type { Metadata } from "next";
import { SupabaseAutoSync } from "@/components/supabase-auto-sync";
import "./globals.css";

export const metadata: Metadata = {
  title: "LUTOWAY OS",
  description: "AI second brain for projects, knowledge and decisions.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body>
        <SupabaseAutoSync />
        {children}
      </body>
    </html>
  );
}
