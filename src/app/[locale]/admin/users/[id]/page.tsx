import MemberDetail from './MemberDetail';

export default async function MemberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <MemberDetail key={id} id={id} />;
}
