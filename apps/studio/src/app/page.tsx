// @crumb studio-root-page
// [UI] | Landing redirect | Entry point
// why: Redirects studio root traffic directly to console to avoid empty landing page
// in:[request URL] out:[redirect to /console] err:[routing errors]
// hazard: Hard-coded redirect target may miss env-specific URLs
// hazard: No authentication check before redirect—unauthenticated users redirected regardless
// edge:apps/studio/src/app/console/page.tsx -> SERVES
// prompt: Consider adding auth check and environment-specific redirect targets

import { redirect } from 'next/navigation';

export default function Home() {
  redirect('/console');
}
