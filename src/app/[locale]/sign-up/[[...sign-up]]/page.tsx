import { SignUp } from "@clerk/nextjs";
import { Suspense } from "react";
import { headers } from "next/headers";
import Image from "next/image";
import { configuredAuthHost, mainHostForAuth } from "@/lib/authHost";
import AuthBackButton from "@/components/auth/AuthBackButton";

export default async function SignUpPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const isAr = locale === "ar";
  const authHost = configuredAuthHost(process.env.NEXT_PUBLIC_AUTH_HOST);
  const host = (await headers()).get("host")?.toLowerCase().split(":")[0] ?? "";
  const onAuthHost = !!authHost && host === authHost;
  // See sign-in/page.tsx: same reasoning, same fallback. A `redirect_url` in the URL still wins.
  const mainSiteHome = onAuthHost ? `https://${mainHostForAuth(authHost)}/${locale}` : `/${locale}`;

  return (
    <div className="h-dvh overflow-hidden flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 px-4 py-6">
      <AuthBackButton isAr={isAr} fallbackHref={mainSiteHome} />
      <div className="flex flex-col items-center gap-4 w-full">
        <div className="relative w-24 h-9 sm:w-28 sm:h-10 shrink-0">
          <Image src="/logo.png" alt="IEEE Qassim" fill sizes="112px" className="object-contain" priority />
        </div>
        <Suspense>
          <SignUp
            fallbackRedirectUrl={mainSiteHome}
            signInUrl={`/${locale}/sign-in`}
            appearance={{ elements: { cardBox: "max-h-[72dvh] sm:max-h-[78dvh] overflow-y-auto shadow-2xl" } }}
          />
        </Suspense>
      </div>
    </div>
  );
}
