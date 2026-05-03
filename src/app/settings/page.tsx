import Link from "next/link";
import {
  Bell,
  ChevronRight,
  Clapperboard,
  Database,
  HelpCircle,
  ShieldCheck,
  SlidersHorizontal,
  User,
  type LucideIcon,
} from "lucide-react";
import { AppNav } from "@/components/AppNav";
import { BackButton } from "@/components/BackButton";
import { BrandLink } from "@/components/BrandLogo";
import { TasteAvoidSettings } from "@/components/settings/TasteAvoidSettings";

const settingsSections = [
  {
    icon: User,
    title: "Account",
    description: "Profile details and sign-in are managed through your FlickBuddy account.",
  },
  {
    icon: SlidersHorizontal,
    title: "Recommendations",
    description: "Likes, saves, passes, and watched signals tune your discovery feed.",
  },
  {
    icon: Database,
    title: "Taste data",
    description: "Your app activity powers saved lists and personalized recommendations.",
  },
  {
    icon: Bell,
    title: "App activity",
    description: "Activity is used to improve product quality and reliability.",
  },
];

const supportLinks = [
  {
    icon: ShieldCheck,
    title: "Privacy Policy",
    description: "Review how FlickBuddy collects and uses data.",
    href: "/privacy",
  },
  {
    icon: Clapperboard,
    title: "Terms of Use",
    description: "Read our terms and acceptable use rules.",
    href: "/terms",
  },
  {
    icon: HelpCircle,
    title: "Contact support",
    description: "Get help and give feedback.",
    href: "/support",
  },
];

export default function SettingsPage() {
  return (
    <main className="min-h-dvh bg-[#05080b] px-5 pb-28 pt-5 text-white">
      <section className="mx-auto max-w-3xl">
        <header className="flex items-center justify-between">
          <BackButton
            fallbackHref="/profile"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white"
          />
          <BrandLink className="text-sm text-cyan-200" size={22} />
        </header>

        <div className="mt-8">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-200">
            FlickBuddy
          </p>
          <h1 className="mt-2 text-4xl font-black tracking-tight">
            Settings
          </h1>
          <p className="mt-3 text-sm leading-6 text-white/58">
            View account, recommendation, data, and support settings for your
            profile.
          </p>
        </div>

        <section className="mt-8 grid gap-3 sm:grid-cols-2">
          {settingsSections.map((section) => (
            <InfoCard key={section.title} {...section} />
          ))}
        </section>

        <TasteAvoidSettings />

        <section className="mt-8">
          <h2 className="text-sm font-black uppercase tracking-[0.18em] text-white/45">
            More info and support
          </h2>
          <div className="mt-3 grid gap-3">
            {supportLinks.map((item) => (
              <SettingsLink key={item.title} {...item} />
            ))}
          </div>
        </section>
      </section>
      <AppNav />
    </main>
  );
}

function InfoCard({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.04] p-4">
      <span className="flex h-10 w-10 items-center justify-center rounded-md border border-white/10 bg-black/20 text-cyan-200">
        <Icon className="h-5 w-5" />
      </span>
      <h2 className="mt-4 font-black text-white">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-white/55">{description}</p>
    </div>
  );
}

function SettingsLink({
  icon: Icon,
  title,
  description,
  href,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 rounded-md border border-white/10 bg-white/[0.04] p-4 transition hover:border-cyan-300/35 hover:bg-white/[0.06]"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-white/10 bg-black/20 text-cyan-200">
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-bold text-white">{title}</span>
        <span className="mt-1 block text-sm leading-5 text-white/55">
          {description}
        </span>
      </span>
      <ChevronRight className="h-5 w-5 text-white/30 transition group-hover:text-white/60" />
    </Link>
  );
}
