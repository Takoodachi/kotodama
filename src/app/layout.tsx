import type { Metadata, Viewport } from "next";
import { Cinzel, Inter, Noto_Sans_JP, Shippori_Mincho } from "next/font/google";
import { AppShell } from "@/components/layout/AppShell";
import { Providers } from "@/components/providers/Providers";
import { withBasePath } from "@/lib/basePath";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const cinzel = Cinzel({ subsets: ["latin"], variable: "--font-cinzel", weight: "400" });
// Japanese fonts ship as many unicode-range slices; the browser fetches only the ones a page uses.
// Every slice of every weight still adds an @font-face rule to the stylesheet (about 120 per
// weight), so only the weight the app sets Mincho text in is loaded.
const notoJp = Noto_Sans_JP({ variable: "--font-noto-jp", preload: false });
const shippori = Shippori_Mincho({ variable: "--font-shippori", weight: "400", preload: false });

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
};

/**
 * Applies the saved theme, glyph style and Japanese text size before the
 * first paint, so a light theme never flashes dark (see Next's "Preventing
 * flash before hydration"). PreferenceSync keeps them up to date afterwards.
 */
const PREFERENCES_SCRIPT = `(function(){try{var s=(JSON.parse(localStorage.getItem("kotodama-settings")||"{}").state)||{};var t=s.theme||"dark";if(t==="system")t=matchMedia("(prefers-color-scheme: light)").matches?"light":"dark";var d=document.documentElement;d.setAttribute("data-theme",t);if(s.glyph)d.setAttribute("data-glyph",s.glyph);if(s.jpSize)d.style.setProperty("--jp-scale",String(s.jpSize))}catch(e){}})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-theme="dark"
      data-glyph="mincho"
      suppressHydrationWarning
      className={`${inter.variable} ${cinzel.variable} ${notoJp.variable} ${shippori.variable} h-full`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: PREFERENCES_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col">
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
