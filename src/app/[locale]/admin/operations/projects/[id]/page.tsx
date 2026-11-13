import ProjectDetail from './ProjectDetail';

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProjectDetail key={id} id={id} />;
}
