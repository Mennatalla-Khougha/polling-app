import { EditPollForm } from '@/components/forms/EditPollForm';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditPollPage({ params }: PageProps) {
  const { id } = await params;
  
  return <EditPollForm pollId={id} />;
}
