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
