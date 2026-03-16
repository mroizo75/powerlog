import "@/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";
import { Inter } from "next/font/google";
import { SessionProvider } from "next-auth/react";

import { TRPCReactProvider } from "@/trpc/react";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Powerlog",
  description: "Powerlog",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="no">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body className={cn("min-h-screen bg-background font-sans antialiased", geist.variable, inter.className)}>
        <SessionProvider>
          <TRPCReactProvider>{children}</TRPCReactProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
