'use client';

import dynamic from 'next/dynamic';
import { MorphTargets } from '@/lib/clinical-mapper';
import { Loader2 } from 'lucide-react';

interface ViewerLoaderProps {
  morphTargets: MorphTargets;
  sex: 'M' | 'F';
  heightCm: number; // Altura do paciente em cm
}

function LoadingPlaceholder() {
  return (
    <div className="w-full h-full min-h-[500px] bg-gradient-to-b from-slate-100 to-slate-200 rounded-lg flex items-center justify-center">
      <div className="text-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
        <p className="text-sm text-slate-500">Carregando visualizador 3D...</p>
      </div>
    </div>
  );
}

const ThreeViewer = dynamic(() => import('./three-viewer'), {
  ssr: false,
  loading: () => <LoadingPlaceholder />,
});

export default function ViewerLoader({ morphTargets, sex, heightCm }: ViewerLoaderProps) {
  return <ThreeViewer morphTargets={morphTargets} sex={sex} heightCm={heightCm} />;
}
