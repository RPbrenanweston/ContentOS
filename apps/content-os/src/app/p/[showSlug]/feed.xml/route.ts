import { NextRequest } from 'next/server';

// GET /p/[showSlug]/feed.xml — user-friendly feed URL alias
// Permanently redirects to the canonical API feed endpoint.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ showSlug: string }> },
) {
  const { showSlug } = await params;
  const destination = `/api/podcast/feed/${encodeURIComponent(showSlug)}`;

  return new Response(null, {
    status: 301,
    headers: {
      Location: destination,
    },
  });
}
