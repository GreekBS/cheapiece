import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Tsipis", template: "%s · Tsipis" },
  description: "Marketplace πλατφόρμα — σύγκριση τιμών και ασφαλής πλοήγηση.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="el">
      <body>{children}</body>
    </html>
  );
}
