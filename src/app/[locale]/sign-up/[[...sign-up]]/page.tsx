import { SignUp } from "@clerk/nextjs";
import { Suspense } from "react";
import { headers } from "next/headers";
import { configuredAuthHost, mainHostForAuth } from "@/lib/authHost";

export default async function SignUpPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const authHost = configuredAuthHost(process.env.NEXT_PUBLIC_AUTH_HOST);
  const host = (await headers()).get("host")?.toLowerCase().split(":")[0] ?? "";
  // On the auth host, Clerk's own post-sign-up default (stay on the current page) renders
  // the full site shell here, whose client-side nav/polling fetches then get CORS-blocked
  // against www/api -- send the browser off this host with a real navigation instead.
  const redirectUrl = !!authHost && host === authHost ? `https://${mainHostForAuth(authHost)}/${locale}` : undefined;

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Suspense>
        <SignUp forceRedirectUrl={redirectUrl} />
      </Suspense>
    </div>
  );
}
