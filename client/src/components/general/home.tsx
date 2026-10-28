import { useState } from "react";
import { ArrowRight, FileDown, Landmark, UsersRound } from "lucide-react";
import { Link } from "react-router";
import { Header } from "@/components/general/header";
import { useLanguage } from "@/components/settings/language-context";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import khanjer from "@/assets/khanjer.png";

const destinations = [
  {
    to: "/recipient",
    label: "Recipient",
    arabicLabel: "المستفيدون",
    title: "Explore public services",
    arabicTitle: "استكشف الخدمات الحكومية",
    description:
      "Browse the service guide, find what you need, and learn how to get started.",
    arabicDescription:
      "تصفح دليل الخدمات، واعثر على ما تحتاجه، وتعرّف على كيفية البدء.",
    icon: UsersRound,
    iconClass: "bg-secondary-water/10 text-secondary-water",
  },
  {
    to: "/moh/login",
    label: "Ministry of Housing",
    arabicLabel: "وزارة الإسكان",
    title: "Ministry staff portal",
    arabicTitle: "بوابة موظفي الوزارة",
    description:
      "Sign in to access the Ministry of Housing staff workspace.",
    arabicDescription: "سجل الدخول للوصول إلى مساحة عمل موظفي وزارة الإسكان.",
    icon: Landmark,
    iconClass: "bg-primary/10 text-primary",
  },
];

export function Home() {
  const { isArabic } = useLanguage();
  const [pdf, setPdf] = useState({ busy: false, failed: false, done: 0, total: 0 });

  // trial: loaded on click so the pdf code stays out of the main bundle
  async function downloadPdf() {
    setPdf({ busy: true, failed: false, done: 0, total: 0 });
    try {
      const { exportGuidePdf } = await import("@/components/guide/export-pdf");
      await exportGuidePdf((done, total) => setPdf({ busy: true, failed: false, done, total }));
      setPdf((p) => ({ ...p, busy: false }));
    } catch {
      setPdf({ busy: false, failed: true, done: 0, total: 0 });
    }
  }

  return (
    <>
      <Header />
      <main className="relative isolate flex min-h-[calc(100vh-4.5rem)] items-center overflow-hidden bg-background px-4 py-16 text-foreground sm:px-6 lg:px-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-96 bg-linear-to-b from-primary/8 to-transparent"
        />
        <div className="mx-auto w-full max-w-5xl">
          <header className="mx-auto mb-12 max-w-2xl text-center">
            <div className="mx-auto mb-3 flex size-14 items-center justify-center">
              <img src={khanjer} alt="Omani Dagger" className="h-16 w-16 object-contain" />
            </div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">
              {isArabic ? "وزارة الإسكان والتخطيط العمراني" : "Ministry of Housing and Urban Planning"}
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
              {isArabic ? "دليل خدمات الوزارة" : "Ministry Services Catalogue"}
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-muted-foreground">
              {isArabic
                ? "اختر طريقة المتابعة."
                : "Choose how you would like to continue."}
            </p>
          </header>

          <section
            aria-label={isArabic ? "اختر وجهتك" : "Choose a destination"}
            className="grid gap-5 md:grid-cols-2"
          >
            {destinations.map((destination) => {
              const Icon = destination.icon;
              return (
                <Link
                  key={destination.to}
                  to={destination.to}
                  className="group rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring"
                >
                  <Card className="h-full min-h-64 transition duration-200 group-hover:-translate-y-1 group-hover:shadow-lg">
                    <CardHeader className="gap-5 p-6 sm:p-8">
                      <span
                        className={`flex size-12 items-center justify-center rounded-xl ${destination.iconClass}`}
                      >
                        <Icon aria-hidden="true" className="size-6" />
                      </span>
                      <div className="space-y-2">
                        <CardDescription>
                          {isArabic
                            ? destination.arabicLabel
                            : destination.label}
                        </CardDescription>
                        <CardTitle className="text-xl sm:text-2xl">
                          {isArabic
                            ? destination.arabicTitle
                            : destination.title}
                        </CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="flex flex-1 flex-col justify-between gap-6 px-6 pb-6 sm:px-8 sm:pb-8">
                      <p className="max-w-md leading-6 text-muted-foreground">
                        {isArabic
                          ? destination.arabicDescription
                          : destination.description}
                      </p>
                      <span className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
                        {isArabic ? "متابعة" : "Continue"}
                        <ArrowRight
                          aria-hidden="true"
                          className="size-4 transition-transform group-hover:translate-x-1 rtl:rotate-180"
                        />
                      </span>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </section>

          <footer className="mt-12 flex flex-col items-center gap-3 text-center text-sm text-muted-foreground">
            {isArabic
              ? "وزارة الإسكان · دليل الخدمات"
              : "Ministry of Housing · Services Catalogue"}
            <button
              type="button"
              onClick={downloadPdf}
              disabled={pdf.busy}
              className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-accent hover:text-foreground disabled:opacity-60"
            >
              <FileDown aria-hidden="true" className="size-3.5" />
              {pdf.busy
                ? isArabic
                  ? `جارٍ التحضير… ${pdf.done}/${pdf.total}`
                  : `Preparing… ${pdf.done}/${pdf.total}`
                : pdf.failed
                  ? isArabic
                    ? "تعذر التصدير، حاول مجددًا"
                    : "Export failed, try again"
                  : isArabic
                    ? "تصدير الدليل كاملًا PDF"
                    : "Export full guide as PDF"}
            </button>
          </footer>
        </div>
      </main>
    </>
  );
}