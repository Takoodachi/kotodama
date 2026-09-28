import type { Metadata, Viewport } from "next";
import { Cinzel, Inter, Noto_Sans_JP, Shippori_Mincho } from "next/font/google";
import { AppShell } from "@/components/layout/AppShell";
import { Providers } from "@/components/providers/Providers";
import { withBasePath } from "@/lib/basePath";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const cinzel = Cinzel({ subsets: ["latin"], variable: "--font-cinzel", weight: ["400", "600"] });
// Japanese fonts ship as many unicode-range slices; the browser fetches only the ones a page uses.
const notoJp = Noto_Sans_JP({ variable: "--font-noto-jp", preload: false });
const shippori = Shippori_Mincho({ variable: "--font-shippori", weight: ["400", "600", "800"], preload: false });

export const metadata: Metadata = {
  title: { default: "Kotodama · Japanese practice", template: "%s · Kotodama" },
  description:
    "Practice hiragana, katakana, kanji, words, phrases and sentences with multiple choice, reading and typing drills.",
  applicationName: "Kotodama",
  appleWebApp: { capable: true, title: "Kotodama", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
  icons: {
    icon: [{ url: withBasePath("/icons/icon.svg"), type: "image/svg+xml" }],
    apple: [{ url: withBasePath("/icons/apple-touch-icon.png"), sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0a0a0a",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-glyph="mincho"
      className={`${inter.variable} ${cinzel.variable} ${notoJp.variable} ${shippori.variable} h-full`}
    >
      <body className="flex min-h-full flex-col">
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
