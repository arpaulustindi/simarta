import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";

export const metadata: Metadata = {
  title: "SiMarta - Sistem Informasi GMIST Maranatha Tahuna",
  description: "Aplikasi Desktop Standalone & Offline untuk Pengelolaan Jemaat GMIST Maranatha Tahuna",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="antialiased min-h-screen">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
