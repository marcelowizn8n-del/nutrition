import Image from 'next/image';
import DigitalTwinsApp from '@/components/digital-twins-app';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/80 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-18 py-2">
            <div className="flex items-center gap-3">
              <Image 
                src="/logo.png" 
                alt="Digital Twin Logo" 
                width={140} 
                height={56}
                className="object-contain"
                priority
              />
            </div>
            <span className="text-sm text-slate-500 hidden sm:block">
              Sistema de Visualização 3D de Pacientes
            </span>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <DigitalTwinsApp />
      </div>
    </main>
  );
}
