import { Inter, Playfair_Display } from "next/font/google";
import AppChrome from "../components/AppChrome";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
});

export const metadata = {
  title: "Lumen",
  description: "A quiet Progressive Web App journal built for personal reflection.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Lumen",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.svg", type: "image/svg+xml" },
      { url: "/icons/icon-512.svg", type: "image/svg+xml" },
    ],
  },
};

export const viewport = {
  themeColor: "#0F1117",
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body className="font-[family-name:var(--font-inter)] antialiased transition-colors duration-500">
        <AppChrome>{children}</AppChrome>
      </body>
    </html>
  );
}
