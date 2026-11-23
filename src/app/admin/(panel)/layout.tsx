export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { siteName, siteTagline } from "@/lib/site";
import { Toaster } from "@/components/ui/sonner";
import { ExternalLink } from "lucide-react";
import AdminNav from "./admin-nav";

export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/admin/login");

  return (
    <div className="min-h-screen bg-zinc-100 flex flex-col">
      {/* Brand bar — navy chrome mirroring the site header/footer */}
      <header className="bg-petro-navy text-white sticky top-0 z-40 shadow-md">
        <div className="max-w-[1440px] mx-auto px-4 lg:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <a
              href="/"
              target="_blank"
              rel="noopener"
              aria-label={siteName}
              className="flex items-center flex-shrink-0"
            >
              <img
                src="/assets/logos/logo-main-PAsset-3-1.png"
                alt={siteName}
                className="h-7 w-auto"
              />
            </a>
            <span className="hidden sm:inline-block text-[10px] uppercase tracking-[0.25em] text-zinc-400 border-r border-zinc-800 pr-3 mr-1">
              پنل مدیریت محتوا
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-400 hidden md:inline" dir="ltr">
              {session.email}
            </span>
            <a
              href="/"
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-1.5 text-[11px] font-bold text-white bg-petro-brand hover:bg-petro-brand-bright px-3 py-1.5 rounded-md transition-colors"
              title={`${siteName} — ${siteTagline}`}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              مشاهده سایت
            </a>
          </div>
        </div>
        <AdminNav />
      </header>
      <main className="max-w-[1440px] mx-auto w-full px-4 lg:px-6 py-6 flex-1">
        {children}
      </main>
      {/* Sticky footer — brand line, pushed naturally when content is taller */}
      <footer className="mt-auto bg-petro-navy text-zinc-400">
        <div className="max-w-[1440px] mx-auto px-4 lg:px-6 h-10 flex items-center justify-between text-[11px]">
          <span>
            {siteName} © {new Date().getFullYear()}
          </span>
          <span className="text-zinc-600">سامانه مدیریت محتوا نسخه ۱.۰</span>
        </div>
      </footer>
      <Toaster position="top-center" richColors dir="rtl" />
    </div>
  );
}
