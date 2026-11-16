import { SignIn } from "@clerk/nextjs";
import { Suspense } from "react";
import { headers } from "next/headers";
import Image from "next/image";
import { configuredAuthHost, mainHostForAuth } from "@/lib/authHost";
import AuthBackButton from "@/components/auth/AuthBackButton";

export default async function SignInPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const isAr = locale === "ar";
  const authHost = configuredAuthHost(process.env.NEXT_PUBLIC_AUTH_HOST);
  const host = (await headers()).get("host")?.toLowerCase().split(":")[0] ?? "";
  const onAuthHost = !!authHost && host === authHost;
  // On the auth host, Clerk's own post-sign-in default (stay on the current page) renders the
  // full site shell here, whose client-side nav/polling fetches then get CORS-blocked against
  // www/api -- fall back to a real navigation to the main site. This only applies when nothing
  // more specific was asked for: a `redirect_url` in the URL (set by the page that sent the
  // visitor here) always wins over this fallback, so sign-in lands back where they came from.
  const mainSiteHome = onAuthHost ? `https://${mainHostForAuth(authHost)}/${locale}` : `/${locale}`;

  return (
    <div className="h-dvh overflow-hidden flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 px-4 py-6">
      <AuthBackButton isAr={isAr} fallbackHref={mainSiteHome} />
      <div className="flex flex-col items-center gap-4 w-full">
        <div className="relative w-24 h-9 sm:w-28 sm:h-10 shrink-0">
          <Image src="/logo.png" alt="IEEE Qassim" fill sizes="112px" className="object-contain" priority />
        </div>
        <Suspense>
          <SignIn
            fallbackRedirectUrl={mainSiteHome}
            signUpUrl={`/${locale}/sign-up`}
            appearance={{ elements: { cardBox: "max-h-[72dvh] sm:max-h-[78dvh] overflow-y-auto shadow-2xl" } }}
          />
        </Suspense>
      </div>
    </div>
  );
}
