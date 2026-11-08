import { MapPin } from "lucide-react";
import { Link } from "react-router";
import { useLanguage } from "@/components/settings/language-context";

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

  return (
    <footer className="border-t border-[color-mix(in_oklch,var(--secondary-accent-foreground)_25%,var(--secondary-accent))] bg-(--secondary-accent) text-(--secondary-accent-foreground)">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-2 lg:grid-cols-3 lg:px-8">
        <section aria-labelledby="footer-ministry">
          <h2 id="footer-ministry" className="text-base font-semibold">
            {isArabic ? "وزارة الإسكان والتخطيط العمراني" : "Ministry of Housing and Urban Planning"}
          </h2>
          <p className="mt-2 max-w-sm text-sm leading-6 opacity-80">
            {isArabic
              ? "تابع قنوات الوزارة الرسمية."
              : "Follow the Ministry through its official social channels."}
          </p>
          <nav
            aria-label={isArabic ? "حسابات التواصل الاجتماعي" : "Social media"}
            className="mt-4 flex flex-wrap gap-2"
          >
            {socialLinks.map(({ href, label, Icon }) => (
              <a
                key={href}
                href={href}
                target="_blank"
                rel="noreferrer"
                aria-label={label}
                className="inline-flex size-10 items-center justify-center rounded-lg border border-current/25 transition hover:bg-[color-mix(in_oklch,var(--secondary-accent-foreground)_12%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
              >
                <Icon aria-hidden="true" className="size-4" />
              </a>
            ))}
          </nav>
          <Link
            to="/feedback"
            className="mt-5 inline-flex rounded-md font-medium underline underline-offset-4 outline-none hover:opacity-80 focus-visible:ring-2 focus-visible:ring-current"
          >
            {isArabic ? "شاركنا رأيك في استبيان الملاحظات" : "Share your thoughts in our feedback survey"}
          </Link>
        </section>

        <section aria-labelledby="footer-location">
          <h2 id="footer-location" className="flex items-center gap-2 text-base font-semibold">
            <MapPin aria-hidden="true" className="size-4" />
            {isArabic ? "موقع الوزارة" : "Ministry location"}
          </h2>
          <div className="mt-3 overflow-hidden rounded-xl border border-current/20 bg-background">
            <iframe
              title={isArabic ? "خريطة موقع الوزارة" : "Map showing the Ministry of Housing and Urban Planning"}
              src={ministryMapUrl}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="h-52 w-full border-0"
            />
          </div>
          <a
            href={directionsUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex text-sm underline underline-offset-4 outline-none hover:opacity-80 focus-visible:ring-2 focus-visible:ring-current"
          >
            {isArabic ? "الاتجاهات على خرائط Google" : "Get directions on Google Maps"}
          </a>
        </section>

        <p className="self-end text-sm opacity-75 md:col-span-2 lg:col-span-1">
          © {copyrightYear}{" "}
          {isArabic ? "وزارة الإسكان والتخطيط العمراني" : "Ministry of Housing and Urban Planning"}
        </p>
      </div>
    </footer>
  );
}
