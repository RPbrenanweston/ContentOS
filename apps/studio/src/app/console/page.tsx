// @crumb console-hub-page
// [UI] | Console hub | Route redirect
// why: Serves as console landing page, may redirect or show hub of available projects
// in:[user context, session] out:[console page or redirect] err:[auth/session errors]
// hazard: May expose project list before auth verification—check permission layer
// hazard: Hard-coded redirect path—no fallback if console app disabled
// edge:apps/studio/src/components/console/ConsoleLayout.tsx -> SERVES
// prompt: Verify auth gates before rendering project list, add fallback UI for missing projects

import { NavBar } from '@/components/shared/NavBar';
import { VideoUploader } from '@/components/shared/VideoUploader';

export default function ConsolePage() {
  return (
    <div className="h-screen flex flex-col bg-background">
      <NavBar />
      <div className="flex-1 flex items-center justify-center">
        <VideoUploader />
      </div>
    </div>
  );
}
