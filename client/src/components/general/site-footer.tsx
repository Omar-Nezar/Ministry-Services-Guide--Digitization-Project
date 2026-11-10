import { ArrowLeft, ArrowRight, MapPin, MessageSquareText } from "lucide-react";
import { Link } from "react-router";
import { useLanguage } from "@/components/settings/language-context";
import moh_logo_red from "@/assets/moh_logo_full_BW.png";

type SocialIconProps = { className?: string; "aria-hidden"?: "true" | "false" };
const copyrightYear = new Date().getFullYear();

const ministryMapUrl =
  "https://www.google.com/maps?q=Ministry+of+Housing+and+Urban+Planning,+Oman&output=embed";
const directionsUrl =
  "https://www.google.com/maps/search/?api=1&query=Ministry+of+Housing+and+Urban+Planning+Oman";

function XIcon({ className, ...props }: SocialIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} {...props}>
      <path d="M18.9 1.5h3.3l-7.2 8.2 8.5 12.8h-6.7l-5.2-7.7-6.8 7.7H1.5l7.7-8.8L1.1 1.5H8l4.7 7 6.2-7Zm-1.2 18.8h1.8L7.7 3.6H5.8l11.9 16.7Z" />
    </svg>
  );
}

function LinkedInIcon({ className, ...props }: SocialIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} {...props}>
      <path d="M5.2 3.5a1.8 1.8 0 1 1-3.6 0 1.8 1.8 0 0 1 3.6 0ZM2 8h2.9v13H2V8Zm5.1 0h2.8v1.8h.1A3.1 3.1 0 0 1 12.8 7c3 0 3.6 2 3.6 4.6V21h-2.9v-8.3c0-1.6 0-3.6-2.2-3.6s-2.5 1.7-2.5 3.5V21H7.1V8Z" />
    </svg>
  );
}

function InstagramIcon({ className, ...props }: SocialIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} {...props}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.8" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function YouTubeIcon({ className, ...props }: SocialIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} {...props}>
      <path d="M23 7.1a3 3 0 0 0-2.1-2.2C19 4.4 12 4.4 12 4.4s-7 0-8.9.5A3 3 0 0 0 1 7.1 31 31 0 0 0 .5 12a31 31 0 0 0 .5 4.9 3 3 0 0 0 2.1 2.2c1.9.5 8.9.5 8.9.5s7 0 8.9-.5a3 3 0 0 0 2.1-2.2 31 31 0 0 0 .5-4.9 31 31 0 0 0-.5-4.9ZM9.7 15.6V8.4l6.2 3.6-6.2 3.6Z" />
    </svg>
  );
}

const socialLinks = [
  {
    href: "https://www.linkedin.com/company/ministry-of-housing-urban-planing",
    label: "LinkedIn",
    Icon: LinkedInIcon,
  },
  { href: "https://x.com/housingoman", label: "X", Icon: XIcon },
  {
    href: "https://www.instagram.com/housingoman",
    label: "Instagram",
    Icon: InstagramIcon,
  },
  {
    href: "https://www.youtube.com/channel/UCN9tihzN6nzr86f36eE3FmA/videos",
    label: "YouTube",
    Icon: YouTubeIcon,
  },
];

export function SiteFooter() {
  const { isArabic } = useLanguage();
  const Arrow = isArabic ? ArrowLeft : ArrowRight;
  const ministry = isArabic ? "وزارة الإسكان والتخطيط العمراني" : "Ministry of Housing and Urban Planning";

  return (
    <footer className="relative isolate overflow-hidden border-t-2 border-brand-gold/70 bg-secondary-accent text-secondary-accent-foreground">
      <div aria-hidden="true" className="absolute inset-0 -z-10 [mask-image:linear-gradient(to_bottom,black,transparent_85%)]">
        <div className="pattern-khatam absolute inset-0 opacity-[0.06]" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 py-12 md:grid-cols-2 lg:grid-cols-[1.15fr_1fr_1.1fr] lg:gap-12 lg:py-14">
          <section aria-labelledby="footer-ministry" className="space-y-5">
            <h2 id="footer-ministry" className="sr-only">
              {ministry}
            </h2>
            <img
              src={moh_logo_red}
              alt={isArabic ? "شعار وزارة الإسكان والتخطيط العمراني" : "Ministry of Housing and Urban Planning logo"}
              className="h-12 w-auto rounded-md shadow-lift sm:h-14"
              loading="lazy"
            />
            <p className="max-w-sm text-sm leading-6 text-secondary-accent-foreground/80">
              {isArabic ? "تابع قنوات الوزارة الرسمية." : "Follow the Ministry through its official social channels."}
            </p>
            <nav aria-label={isArabic ? "حسابات التواصل الاجتماعي" : "Social media"} className="flex flex-wrap gap-2">
              {socialLinks.map(({ href, label, Icon }) => (
                <a
                  key={href}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={label}
                  className="inline-flex size-10 items-center justify-center rounded-full border border-secondary-accent-foreground/20 bg-secondary-accent-foreground/[0.04] outline-none transition duration-300 ease-brand hover:-translate-y-0.5 hover:border-secondary-accent-foreground/40 hover:bg-secondary-accent-foreground/12 focus-visible:ring-2 focus-visible:ring-secondary-accent-foreground"
                >
                  <Icon aria-hidden="true" className="size-4" />
                </a>
              ))}
            </nav>
          </section>

          <section aria-labelledby="footer-feedback" className="flex flex-col">
            <h2 id="footer-feedback" className="flex items-center gap-2 text-base font-semibold">
              <MessageSquareText aria-hidden="true" className="size-4 text-brand-gold" />
              {isArabic ? "استبيان الملاحظات" : "Feedback survey"}
            </h2>
            <p className="mt-3 max-w-sm text-sm leading-6 text-secondary-accent-foreground/80">
              {isArabic
                ? "شاركنا رأيك لمساعدتنا على تطوير دليل الخدمات."
                : "Tell us what you think to help improve the services catalogue."}
            </p>
            <Link
              to="/feedback"
              className="group mt-5 inline-flex w-fit items-center gap-2 rounded-lg bg-secondary-accent-foreground px-4 py-2.5 text-sm font-semibold text-secondary-accent shadow-lift outline-none transition duration-300 ease-brand hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-secondary-accent-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-secondary-accent active:translate-y-0"
            >
              {isArabic ? "شاركنا رأيك" : "Share your thoughts"}
              <Arrow aria-hidden="true" className="size-4 transition-transform duration-300 ease-brand group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" />
            </Link>
          </section>

          <section aria-labelledby="footer-location" className="md:col-span-2 lg:col-span-1">
            <h2 id="footer-location" className="flex items-center gap-2 text-base font-semibold">
              <MapPin aria-hidden="true" className="size-4 text-brand-gold" />
              {isArabic ? "موقع الوزارة" : "Ministry location"}
            </h2>
            <div className="mt-3 overflow-hidden rounded-xl border border-secondary-accent-foreground/15 bg-background shadow-lift">
              <iframe
                title={isArabic ? "خريطة موقع الوزارة" : "Map showing the Ministry of Housing and Urban Planning"}
                src={ministryMapUrl}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="h-48 w-full border-0"
              />
            </div>
            <a
              href={directionsUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 rounded-sm text-sm font-medium underline decoration-secondary-accent-foreground/40 underline-offset-4 outline-none transition hover:decoration-secondary-accent-foreground focus-visible:ring-2 focus-visible:ring-secondary-accent-foreground"
            >
              {isArabic ? "الاتجاهات على خرائط Google" : "Get directions on Google Maps"}
            </a>
          </section>
        </div>

        <div className="flex flex-col gap-2 border-t border-secondary-accent-foreground/15 py-5 text-sm text-secondary-accent-foreground/70 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {copyrightYear} {ministry}
          </p>
          <p>{isArabic ? "سلطنة عُمان" : "Sultanate of Oman"}</p>
        </div>
      </div>
    </footer>
  );
}
