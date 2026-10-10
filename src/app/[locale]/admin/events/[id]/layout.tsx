import EventWorkspace from '@/components/admin/EventWorkspace';

export default function AdminEventLayout({ children }: { children: React.ReactNode }) {
  return <EventWorkspace>{children}</EventWorkspace>;
}
