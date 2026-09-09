import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Gartensparte", template: "%s | Gartensparte" },
  description: "Website und Verwaltung unserer Gartensparte.",
  icons: {
    icon: [{ url: "/icon", type: "image/png", sizes: "32x32" }],
    apple: [{ url: "/apple-icon", type: "image/png", sizes: "180x180" }],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="de" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-stone-50 text-stone-900">{children}</body>
    </html>
  );
}
