import { createClient } from '@/lib/supabase/server';
import ContentEditor from '@/components/ContentEditor';
import { notFound } from 'next/navigation';

export default async function ContentEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="p-8 text-sm" style={{ color: 'var(--muted-foreground)' }}>
        Please sign in to edit content.
      </div>
    );
  }

  const { data: node, error } = await supabase
    .from('content_nodes')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (error || !node) notFound();

  return (
    <div className="h-full flex flex-col">
      <ContentEditor initialData={node} />
    </div>
  );
}
