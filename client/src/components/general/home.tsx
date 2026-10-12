import { ArrowRight, Landmark, UsersRound } from "lucide-react";
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
            <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
              <Landmark aria-hidden="true" className="size-7" />
            </div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">
              {isArabic ? "وزارة الإسكان" : "Ministry of Housing"}
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
              {isArabic ? "دليل خدمات الوزارة" : "Ministry Services Guide"}
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

          <footer className="mt-12 text-center text-sm text-muted-foreground">
            {isArabic
              ? "وزارة الإسكان · دليل الخدمات"
              : "Ministry of Housing · Services Guide"}
          </footer>
        </div>
      </main>
    </>
  );
}