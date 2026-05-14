import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CutSpace",
  description: "Book your barber on CutSpace",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, backgroundColor: '#1E2432' }}>{children}</body>
    </html>
  );
}
