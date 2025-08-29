import { VotingInterface } from '@/components/polls/VotingInterface';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PublicPollPage({ params }: PageProps) {
  const { id } = await params;

  return <VotingInterface pollId={id} />;
}
