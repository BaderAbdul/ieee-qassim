import { configurationReadiness } from '@/lib/server/readiness';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return Response.json(configurationReadiness(), { headers: { 'Cache-Control': 'no-store' } });
}
