import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Bell,
  PiggyBank,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

const features = [
  {
    icon: Wallet,
    titleKey: "home.features.trackTitle",
    descriptionKey: "home.features.trackDescription",
  },
  {
    icon: PiggyBank,
    titleKey: "home.features.budgetTitle",
    descriptionKey: "home.features.budgetDescription",
  },
  {
    icon: Target,
    titleKey: "home.features.goalsTitle",
    descriptionKey: "home.features.goalsDescription",
  },
  {
    icon: TrendingUp,
    titleKey: "home.features.reportsTitle",
    descriptionKey: "home.features.reportsDescription",
  },
  {
    icon: Bell,
    titleKey: "home.features.alertsTitle",
    descriptionKey: "home.features.alertsDescription",
  },
  {
    icon: ShieldCheck,
    titleKey: "home.features.securityTitle",
    descriptionKey: "home.features.securityDescription",
  },
];

export default function Home() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-24 py-8">
      <section className="relative overflow-hidden rounded-3xl bg-linear-to-br from-primary/10 via-background to-background px-6 py-16 ring-1 ring-foreground/10 sm:px-12 sm:py-24">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/20 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 -left-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl"
        />

        <div className="relative mx-auto flex max-w-3xl flex-col items-center text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-foreground/10 bg-background/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
            <Sparkles className="size-3.5 text-primary" />
            {t("home.badge")}
          </span>

          <h1 className="mt-6 font-heading text-4xl font-semibold tracking-tight text-foreground sm:text-5xl md:text-6xl">
            {t("home.title")}
          </h1>

          <p className="mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg">
            {t("home.description")}
          </p>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
            <Link to="/signup">
              <Button size="lg" className="gap-2">
                {t("home.ctaPrimary")}
                <ArrowRight className="size-4" />
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline">
                {t("home.ctaSecondary")}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-10">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
            {t("home.features.title")}
          </h2>
          <p className="mt-4 text-muted-foreground">
            {t("home.features.subtitle")}
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.titleKey}
              className="flex flex-col gap-3 rounded-2xl border bg-card p-6"
            >
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <feature.icon className="size-5" />
              </div>
              <h3 className="font-heading text-lg font-semibold">
                {t(feature.titleKey)}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t(feature.descriptionKey)}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="relative overflow-hidden rounded-3xl bg-primary px-6 py-16 text-center text-primary-foreground sm:px-12">
        <div className="mx-auto flex max-w-2xl flex-col items-center">
          <h2 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
            {t("home.cta.title")}
          </h2>
          <p className="mt-4 text-primary-foreground/80">
            {t("home.cta.description")}
          </p>
          <Link to="/signup" className="mt-8">
            <Button size="lg" variant="secondary" className="gap-2">
              {t("home.cta.button")}
              <ArrowRight className="size-4" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
