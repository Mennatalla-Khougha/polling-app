import { PollDetails } from '@/components/polls/PollDetails';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PollDetailPage({ params }: PageProps) {
  const { id } = await params;

  return <PollDetails pollId={id} />;
}
