import type { Metadata, Viewport } from "next";
import "./globals.css";
import { NavBar } from "@/components/NavBar";
import { isMock } from "@/lib/llm/client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "GP Consult",
  description: "Simulated GP consultations with guideline-based grading",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f7f5" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1412" },
  ],
};

// Applied before paint to avoid a light/dark flash.
const themeScript = `(function(){try{var t=localStorage.getItem('theme');var d=t?t==='dark':matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('dark')}catch(e){}})()`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-GB" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh font-sans antialiased">
        <NavBar />
        {isMock() && (
          <div className="border-b border-warn/40 bg-warn-soft px-4 py-2 text-center text-sm text-warn">
            <strong>Offline mock mode:</strong> patients, findings and grades are canned placeholders, not AI. Add{" "}
            <code>ANTHROPIC_API_KEY</code> and set <code>MOCK_LLM=0</code> in <code>.env.local</code> for real consultations.
          </div>
        )}
        <main className="mx-auto w-full max-w-3xl px-4 pb-28 pt-4 sm:pb-12">{children}</main>
      </body>
    </html>
  );
}
