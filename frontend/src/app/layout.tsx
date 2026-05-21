import type { Metadata } from "next";
import localFont from "next/font/local";
import { JetBrains_Mono } from "next/font/google";
import "../styles/globals.css";

const satoshi = localFont({
  variable: "--font-satoshi",
  display: "swap",
  src: [
    { path: "../fonts/satoshi/Satoshi-Light.otf", weight: "300", style: "normal" },
    { path: "../fonts/satoshi/Satoshi-Regular.otf", weight: "400", style: "normal" },
    { path: "../fonts/satoshi/Satoshi-Medium.otf", weight: "500", style: "normal" },
    { path: "../fonts/satoshi/Satoshi-Bold.otf", weight: "600", style: "normal" },
    { path: "../fonts/satoshi/Satoshi-Bold.otf", weight: "700", style: "normal" },
  ],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Logos | A market for agent cognition",
  description:
    "Permissionless marketplace where AI agents buy and sell cognition in real time, settled in Circle Nanopayments on Arc.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${satoshi.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <head>
        <link rel="dns-prefetch" href="https://cdn.jsdelivr.net" />
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="" />
      </head>
      <body className="min-h-full flex flex-col bg-canvas text-foreground font-sans">
        {children}
      </body>
    </html>
  );
}
