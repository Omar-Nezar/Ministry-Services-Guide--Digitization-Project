import { useEffect, useState } from "react";
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowRight,
  ArrowUpLeft,
  Building2,
  Check,
  ChevronDown,
  Clock3,
  FileText,
  Landmark,
  Languages,
  Search,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { AccessibilityControls } from "@/components/settings/accessibility-controls";
import { ThemeSwitcher } from "@/components/settings/theme-switcher";
import { Button } from "@/components/ui/button";

const services = [
  {
    icon: FileText,
    number: "48",
    title: "Documents & certificates",
    arabicTitle: "الوثائق والشهادات",
    description: "Apply for official documents, renewals, and certificates.",
    arabicDescription: "قدّم على الوثائق الرسمية والتجديدات والشهادات.",
    color: "bg-primary/10 text-primary",
  },
  {
    icon: Building2,
    number: "36",
    title: "Business & investment",
    arabicTitle: "الأعمال والاستثمار",
    description: "Start, manage, and grow your business with confidence.",
    arabicDescription: "ابدأ أعمالك وأدرها وطوّرها بكل سهولة.",
    color: "bg-secondary-sand/15 text-secondary-sand",
  },
  {
    icon: UsersRound,
    number: "52",
    title: "Family & community",
    arabicTitle: "الأسرة والمجتمع",
    description: "Find the support and services your family needs.",
    arabicDescription: "اكتشف الخدمات والدعم الذي تحتاجه أسرتك.",
    color: "bg-secondary-water/10 text-secondary-water",
  },
  {
    icon: ShieldCheck,
    number: "29",
    title: "Safety & wellbeing",
    arabicTitle: "السلامة والرفاه",
    description: "Access essential services for a safer, healthier life.",
    arabicDescription: "احصل على الخدمات الأساسية لحياة أكثر أماناً وصحة.",
    color: "bg-secondary-palm/10 text-secondary-palm",
  },
];

export function RecipientHome() {
  const [isArabic, setIsArabic] = useState(false);

  useEffect(() => {
    document.documentElement.lang = isArabic ? "ar" : "en";
    document.documentElement.dir = isArabic ? "rtl" : "ltr";
    document.title = isArabic
      ? "دليل الخدمات الحكومية"
      : "Ministry Services Guide";
  }, [isArabic]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-[color-mix(in_oklch,var(--secondary-accent-foreground)_25%,var(--secondary-accent))] bg-[var(--secondary-accent)] text-[var(--secondary-accent-foreground)]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-4 sm:px-6 lg:px-8">
          <a
            href="#home"
            className="flex items-center gap-3 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={isArabic ? "الصفحة الرئيسية" : "Home"}
          >
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Landmark aria-hidden="true" className="size-5" />
            </span>
            <span>
              <span className="block text-sm font-semibold leading-tight">
                {isArabic ? "دليل الخدمات" : "Services Guide"}
              </span>
              <span className="block text-xs text-muted-foreground">
                {isArabic ? "الخدمات الحكومية" : "Government services"}
              </span>
            </span>
          </a>

          <nav
            className="order-3 flex w-full items-center gap-1 overflow-x-auto sm:order-0 sm:w-auto"
            aria-label={isArabic ? "التنقل الرئيسي" : "Main navigation"}
          >
            <a
              className="rounded-lg px-3 py-2 text-sm font-medium text-[var(--secondary-accent-foreground)] outline-none transition hover:bg-[color-mix(in_oklch,var(--secondary-accent-foreground)_12%,transparent)] focus-visible:ring-2 focus-visible:ring-[var(--secondary-accent-foreground)]"
              href="#home"
            >
              {isArabic ? "الرئيسية" : "Home"}
            </a>
            <a
              className="rounded-lg px-3 py-2 text-sm font-medium text-[color-mix(in_oklch,var(--secondary-accent-foreground)_75%,transparent)] outline-none transition hover:bg-[color-mix(in_oklch,var(--secondary-accent-foreground)_12%,transparent)] hover:text-[var(--secondary-accent-foreground)] focus-visible:ring-2 focus-visible:ring-[var(--secondary-accent-foreground)]"
              href="#services"
            >
              {isArabic ? "الخدمات" : "Services"}
            </a>
            <a
              className="rounded-lg px-3 py-2 text-sm font-medium text-[color-mix(in_oklch,var(--secondary-accent-foreground)_75%,transparent)] outline-none transition hover:bg-[color-mix(in_oklch,var(--secondary-accent-foreground)_12%,transparent)] hover:text-[var(--secondary-accent-foreground)] focus-visible:ring-2 focus-visible:ring-[var(--secondary-accent-foreground)]"
              href="#about"
            >
              {isArabic ? "عن الدليل" : "About"}
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <ThemeSwitcher isArabic={isArabic} compact />
            <AccessibilityControls isArabic={isArabic} />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2 border-[color-mix(in_oklch,var(--secondary-accent-foreground)_35%,transparent)] bg-transparent text-[var(--secondary-accent-foreground)] hover:bg-[color-mix(in_oklch,var(--secondary-accent-foreground)_12%,transparent)] hover:text-[var(--secondary-accent-foreground)]"
              onClick={() => setIsArabic((current) => !current)}
              aria-label={isArabic ? "Switch to English" : "التبديل إلى العربية"}
            >
              <Languages aria-hidden="true" className="size-4" />
              <span>{isArabic ? "English" : "العربية"}</span>
            </Button>
          </div>
        </div>
      </header>

      <main id="home">
        <section className="relative isolate overflow-hidden border-b border-border/70">
          <div
            className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_start,color-mix(in_oklch,var(--primary)_12%,transparent),transparent_55%)]"
            aria-hidden="true"
          />
          <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.15fr_0.85fr] lg:px-8 lg:py-24">
            <div>
              <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary">
                <Sparkles aria-hidden="true" className="size-3.5" />
                {isArabic
                  ? "كل الخدمات الحكومية في مكان واحد"
                  : "Your services, all in one place"}
              </span>
              <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
                {isArabic
                  ? "خدماتك الحكومية، بطريقة أسهل."
                  : "Government services, made simpler."}
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
                {isArabic
                  ? "اعثر على الخدمة المناسبة، وتعرّف على خطواتها، وأنجز معاملاتك بثقة. كل ما تحتاجه، في دليل واحد واضح."
                  : "Find the right service, understand what you need, and get things done with confidence. One clear guide to help you every step of the way."}
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button
                  size="lg"
                  className="gap-2"
                  onClick={() =>
                    document
                      .getElementById("services")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                >
                  {isArabic ? "استكشف الخدمات" : "Explore services"}
                  {isArabic ? (
                    <ArrowLeft aria-hidden="true" className="size-4" />
                  ) : (
                    <ArrowRight aria-hidden="true" className="size-4" />
                  )}
                </Button>
                <a
                  href="#about"
                  className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {isArabic ? "كيف يعمل الدليل؟" : "How it works"}
                </a>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-md">
              <div className="absolute -inset-4 -z-10 rounded-[2rem] bg-primary/5 blur-2xl" />
              <div className="rounded-3xl border border-border bg-card p-6 shadow-xl shadow-primary/5 sm:p-8">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {isArabic ? "الخدمات المتاحة" : "Services available"}
                    </p>
                    <p className="mt-2 text-5xl font-semibold tracking-tight tabular-nums">
                      180
                      <span className="text-primary">+</span>
                    </p>
                  </div>
                  <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Landmark aria-hidden="true" className="size-6" />
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {isArabic
                    ? "خدمة من جهات حكومية مختلفة"
                    : "services across government entities"}
                </p>
                <div className="my-6 h-px bg-border" />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-2xl font-semibold tabular-nums">24</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {isArabic ? "جهة حكومية" : "Government entities"}
                    </p>
                  </div>
                  <div>
                    <p className="text-2xl font-semibold tabular-nums">4.8</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {isArabic ? "تقييم سهولة الاستخدام" : "Ease of use rating"}
                    </p>
                  </div>
                </div>
                <div className="mt-6 flex items-center gap-2 rounded-xl bg-muted/70 p-3">
                  <span className="flex size-8 items-center justify-center rounded-lg bg-background text-primary">
                    <Check aria-hidden="true" className="size-4" />
                  </span>
                  <span className="text-xs leading-relaxed text-muted-foreground">
                    {isArabic
                      ? "معلومات واضحة ومحدّثة لمساعدتك على البدء."
                      : "Clear, up-to-date information to help you get started."}
                  </span>
                </div>
              </div>
              <div className="absolute -bottom-5 -inset-s-5 hidden items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3 shadow-lg sm:flex">
                <Clock3 aria-hidden="true" className="size-4 text-primary" />
                <span className="text-xs font-medium">
                  {isArabic ? "مصمم ليوفر وقتك" : "Made to save you time"}
                </span>
              </div>
            </div>
          </div>
        </section>

        <section
          id="services"
          className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8"
        >
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="text-sm font-semibold text-primary">
                {isArabic ? "اكتشف ما تحتاجه" : "Find what you need"}
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                {isArabic ? "استكشف الخدمات" : "Explore services"}
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                {isArabic
                  ? "تصفح مجموعة واسعة من الخدمات الحكومية حسب الموضوع، واعثر على المعلومات التي تحتاجها للبدء."
                  : "Browse a wide range of government services by topic and find the information you need to get started."}
              </p>
            </div>
            <Button type="button" variant="outline" className="gap-2">
              <Search aria-hidden="true" className="size-4" />
              {isArabic ? "البحث عن خدمة" : "Search services"}
              {isArabic ? (
                <ArrowDownLeft aria-hidden="true" className="size-4" />
              ) : (
                <ArrowUpLeft aria-hidden="true" className="size-4" />
              )}
            </Button>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {services.map((service) => {
              const Icon = service.icon;
              return (
                <a
                  key={service.title}
                  href="#about"
                  className="group rounded-2xl border border-border bg-card p-5 outline-none transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 focus-visible:ring-2 focus-visible:ring-ring sm:p-6"
                >
                  <div className="flex items-start justify-between">
                    <span
                      className={`flex size-11 items-center justify-center rounded-xl ${service.color}`}
                    >
                      <Icon aria-hidden="true" className="size-5" />
                    </span>
                    <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium tabular-nums text-muted-foreground">
                      {service.number}
                    </span>
                  </div>
                  <h3 className="mt-5 font-semibold">
                    {isArabic ? service.arabicTitle : service.title}
                  </h3>
                  <p className="mt-2 min-h-12 text-sm leading-6 text-muted-foreground">
                    {isArabic
                      ? service.arabicDescription
                      : service.description}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
                    {isArabic ? "عرض الخدمات" : "View services"}
                    {isArabic ? (
                      <ArrowLeft
                        aria-hidden="true"
                        className="size-4 transition-transform group-hover:-translate-x-1"
                      />
                    ) : (
                      <ArrowRight
                        aria-hidden="true"
                        className="size-4 transition-transform group-hover:translate-x-1"
                      />
                    )}
                  </span>
                </a>
              );
            })}
          </div>
        </section>

        <section id="about" className="border-y border-border bg-muted/35">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_auto] lg:items-center lg:px-8">
            <div>
              <div className="flex items-center gap-2 text-primary">
                <Sparkles aria-hidden="true" className="size-4" />
                <p className="text-sm font-semibold">
                  {isArabic ? "مصمم لخدمتك" : "Designed around you"}
                </p>
              </div>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight">
                {isArabic
                  ? "دليل واحد. خطوات أوضح. وقت أكثر لما يهم."
                  : "One guide. Clearer steps. More time for what matters."}
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                {isArabic
                  ? "نحن نجمع الخدمات والمعلومات الحكومية في مكان واحد، لتتمكن من معرفة المتطلبات وفهم الخطوات والوصول إلى الجهة المناسبة."
                  : "We bring services and information together in one place, so you can understand the requirements, know what to expect, and find the right place to start."}
              </p>
            </div>
            <a
              href="#home"
              className="inline-flex w-fit items-center gap-2 rounded-lg text-sm font-medium text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
            >
              {isArabic ? "العودة إلى الأعلى" : "Back to top"}
              <ChevronDown
                aria-hidden="true"
                className="size-4 rotate-180"
              />
            </a>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-6 text-xs text-muted-foreground sm:px-6 lg:px-8">
        <p>
          © 2025 {isArabic ? "دليل الخدمات الحكومية" : "Ministry Services Guide"}
        </p>
      </footer>
    </div>
  );
}
