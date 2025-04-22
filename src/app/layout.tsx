import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import '@rainbow-me/rainbowkit/styles.css';
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CryptoCalc - Investment Calculator",
  description: "Calculate and visualize your crypto investment allocations",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-[#0D1117] text-[#C9D1D9]`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
