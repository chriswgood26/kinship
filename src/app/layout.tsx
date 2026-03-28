import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Kinship EHR — A modern EHR for the rest of us",
  description: "Purpose-built EHR for behavioral health, developmental disabilities, and community mental health agencies.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={geist.className}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
