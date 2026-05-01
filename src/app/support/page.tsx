import Link from "next/link";
import {
  HelpCircle,
  Mail,
  MessageCircle,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { AppNav } from "@/components/AppNav";
import { BackButton } from "@/components/BackButton";
import { BrandLink } from "@/components/BrandLogo";

const supportEmail =
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@flickbuddy.app";
const supportHref = `mailto:${supportEmail}?subject=FlickBuddy%20support`;

export default function SupportPage() {
  return (
    <main className="min-h-dvh bg-[#05080b] px-5 pb-28 pt-5 text-white">
      <section className="mx-auto max-w-3xl">
        <header className="flex items-center justify-between">
          <BackButton
            fallbackHref="/profile"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white"
          />
          <BrandLink className="text-sm text-cyan-200" size={28} />
        </header>

        <section className="mt-8 rounded-md border border-white/10 bg-white/[0.04] p-6">
          <span className="flex h-12 w-12 items-center justify-center rounded-md border border-cyan-300/20 bg-cyan-300/10 text-cyan-200">
            <HelpCircle className="h-6 w-6" />
          </span>
          <h1 className="mt-5 text-4xl font-black tracking-tight">
            Contact support
          </h1>
          <p className="mt-3 text-sm leading-6 text-white/62">
            Get help with account access, saved lists, recommendation quality,
            privacy questions, or beta issues.
          </p>

          <a
            href={supportHref}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-md bg-cyan-300 px-5 py-3 text-sm font-black text-black transition hover:bg-cyan-200 sm:w-auto"
          >
            <Mail className="h-4 w-4" />
            Email support
          </a>
        </section>

        <div className="mt-8 flex flex-wrap gap-4 text-sm font-bold text-white/55">
          <Link href="/privacy" className="hover:text-cyan-200">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-cyan-200">
            Terms
          </Link>
        </div>
      </section>
      <AppNav />
    </main>
  );
}

function SupportCard({
  icon: Icon,
  title,
  text,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.04] p-4">
      <Icon className="h-5 w-5 text-cyan-200" />
      <h2 className="mt-4 font-black">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-white/55">{text}</p>
    </div>
  );
}
