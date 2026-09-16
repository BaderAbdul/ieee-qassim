import { getTranslations } from 'next-intl/server';
import PassClient from './PassClient';

export default async function PassPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Index' });
  return <PassClient />;
}
