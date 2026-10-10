import { notFound } from 'next/navigation';
import DemoSignIn from '@/components/dev/DemoSignIn';

export default function DemoSignInPage() {
  if (process.env.NODE_ENV !== 'development' || process.env.NEXT_PUBLIC_FIREBASE_EMULATORS !== 'true' || !process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.startsWith('demo-')) notFound();
  return <DemoSignIn />;
}
