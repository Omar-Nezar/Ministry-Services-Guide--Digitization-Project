import type { CSSProperties } from "react";
import { ArrowLeft, ArrowRight, Landmark, UsersRound } from "lucide-react";
import { Link } from "react-router";
import { Header } from "@/components/general/header";
import { useLanguage } from "@/components/settings/language-context";
import { guideApi } from "@/lib/guide-api";
import { useFetch } from "@/lib/use-fetch";
import { cn } from "@/lib/utils";
import moh_logo_mini_NBG from "@/assets/moh_logo_mini_NBG.png";

/** Stagger index for the .enter animation */
const step = (i: number) => ({ "--i": i }) as CSSProperties;

export function Home() {
  const { isArabic } = useLanguage();
  const { data: tree } = useFetch("tree", (signal) => guideApi.tree(signal));
  const services = tree?.reduce((n, d) => n + d.services.length, 0);
  const Arrow = isArabic ? ArrowLeft : ArrowRight;

  const destinations = [
    {
      to: "/recipient",
      featured: true,
      label: isArabic ? "المستفيدون" : "Recipient",
      title: isArabic ? "استكشف الخدمات الحكومية" : "Explore public services",
      description: isArabic
        ? "تصفح دليل الخدمات، واعثر على ما تحتاجه، وتعرّف على كيفية البدء."
        : "Browse the service guide, find what you need, and learn how to get started.",
      meta:
        tree && services != null
          ? isArabic
            ? `${services} خدمة في ${tree.length} مجالات`
            : `${services} services in ${tree.length} categories`
          : null,
      icon: UsersRound,
    },
    {
      to: "/moh/login",
      featured: false,
      label: isArabic ? "وزارة الإسكان" : "Ministry of Housing",
      title: isArabic ? "بوابة موظفي الوزارة" : "Ministry staff portal",
      description: isArabic
        ? "سجل الدخول للوصول إلى مساحة عمل موظفي وزارة الإسكان."
        : "Sign in to access the Ministry of Housing staff workspace.",
      meta: null,
      icon: Landmark,
    },
  ];

  return (
    <>
      <Header />
      <main className="relative isolate overflow-hidden text-foreground">
        {/* Backdrop: a wash of the ministry colour and the khatam lattice, fading downwards */}
        <div aria-hidden="true" className="absolute inset-0 -z-10">
          <div className="absolute -top-48 -end-40 size-[44rem] rounded-full bg-secondary-accent/10 blur-3xl" />
          <div className="absolute inset-x-0 top-0 h-[36rem] text-secondary-accent [mask-image:radial-gradient(ellipse_80%_70%_at_50%_0%,black,transparent)]">
            <div className="pattern-khatam absolute inset-0 opacity-[0.06] dark:opacity-[0.09]" />
          </div>
        </div>

        <div className="mx-auto grid min-h-[calc(100dvh-var(--header-h)-5.5rem)] max-w-7xl items-center gap-12 px-4 py-14 sm:px-6 lg:grid-cols-[1.2fr_1fr] lg:gap-10 xl:gap-16 lg:px-8 lg:py-20">
          <header className="max-w-2xl">
            <img
              src={moh_logo_mini_NBG}
              alt=""
              aria-hidden="true"
              className="enter-settle size-16 object-contain drop-shadow-sm sm:size-20"
            />
            <p className="enter mt-6 text-sm font-semibold text-primary" style={step(1)}>
              {isArabic ? "وزارة الإسكان والتخطيط العمراني" : "Ministry of Housing and Urban Planning"}
            </p>
            <h1
              className="enter mt-3 text-4xl leading-[1.1] font-semibold tracking-tight text-balance sm:text-5xl xl:text-6xl"
              style={step(2)}
            >
              {isArabic ? "دليل خدمات الوزارة" : "Ministry Services Catalogue"}
            </h1>
            <p className="enter mt-5 max-w-lg text-lg leading-8 text-pretty text-muted-foreground" style={step(3)}>
              {isArabic
                ? "اعثر على الخدمات الحكومية واشتراطاتها وخطواتها بوضوح في مكان واحد."
                : "Find government services, requirements, and clear steps in one place."}
            </p>
          </header>

          <section aria-labelledby="choose-destination" className="grid gap-4">
            <h2 id="choose-destination" className="enter text-sm font-medium text-muted-foreground" style={step(3)}>
              {isArabic ? "اختر طريقة المتابعة." : "Choose how you would like to continue."}
            </h2>

            {destinations.map((destination, index) => {
              const Icon = destination.icon;
              return (
                <Link
                  key={destination.to}
                  to={destination.to}
                  style={step(4 + index)}
                  className={cn(
                    "enter group relative isolate min-w-0 overflow-hidden rounded-2xl outline-none transition duration-300 ease-brand hover:-translate-y-1 focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-0",
                    destination.featured
                      ? "bg-secondary-accent text-secondary-accent-foreground shadow-lift hover:shadow-float"
                      : "border bg-card text-card-foreground shadow-card hover:border-foreground/15 hover:shadow-lift",
                  )}
                >
                  {destination.featured && (
                    <div aria-hidden="true" className="absolute inset-0 -z-10 [mask-image:linear-gradient(to_left,black,transparent_75%)] rtl:[mask-image:linear-gradient(to_right,black,transparent_75%)]">
                      <div className="pattern-khatam absolute inset-0 opacity-[0.12] transition-opacity duration-500 group-hover:opacity-20" />
                    </div>
                  )}
                  <div className="flex items-start gap-4 p-6 sm:gap-5 sm:p-7">
                    <span
                      className={cn(
                        "flex size-12 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 ease-brand group-hover:scale-105",
                        destination.featured
                          ? "bg-secondary-accent-foreground/12 ring-1 ring-secondary-accent-foreground/20"
                          : "bg-primary/10 text-primary",
                      )}
                    >
                      <Icon aria-hidden="true" className="size-6" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "text-sm",
                          destination.featured ? "text-secondary-accent-foreground/75" : "text-muted-foreground",
                        )}
                      >
                        {destination.label}
                      </p>
                      <h3 className={cn("mt-1 font-semibold tracking-tight", destination.featured ? "text-2xl" : "text-xl")}>
                        {destination.title}
                      </h3>
                      <p
                        className={cn(
                          "mt-2 max-w-md text-sm leading-6",
                          destination.featured ? "text-secondary-accent-foreground/80" : "text-muted-foreground",
                        )}
                      >
                        {destination.description}
                      </p>
                      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                        <span
                          className={cn(
                            "inline-flex items-center gap-2 text-sm font-semibold",
                            destination.featured ? "text-secondary-accent-foreground" : "text-primary",
                          )}
                        >
                          {isArabic ? "متابعة" : "Continue"}
                          <Arrow
                            aria-hidden="true"
                            className="size-4 transition-transform duration-300 ease-brand group-hover:translate-x-1 rtl:group-hover:-translate-x-1"
                          />
                        </span>
                        {destination.featured &&
                          (destination.meta ? (
                            <span className="rounded-full bg-secondary-accent-foreground/12 px-3 py-1 text-xs font-medium tabular-nums ring-1 ring-secondary-accent-foreground/15">
                              {destination.meta}
                            </span>
                          ) : (
                            <span aria-hidden="true" className="h-6 w-36 rounded-full bg-secondary-accent-foreground/10" />
                          ))}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </section>
        </div>
      </main>
    </>
  );
}
