import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Seshon",
  description: "temp anon messaging",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased sf-font">
        {children}
      </body>
    </html>
  );
}
