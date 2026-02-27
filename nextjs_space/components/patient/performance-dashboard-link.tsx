'use client';

import Link from 'next/link';
import { BarChart3, ExternalLink } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function PerformanceDashboardLink() {
  return (
    <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200">
      <CardContent className="py-4">
        <Link href="/dashboard" className="flex items-center justify-between group">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
              <BarChart3 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="font-semibold text-blue-700 dark:text-blue-300 group-hover:text-blue-800">
                Dashboard de Performance
              </p>
              <p className="text-xs text-blue-600/70 dark:text-blue-400/70">
                Métricas do modelo de risco metabólico
              </p>
            </div>
          </div>
          <ExternalLink className="w-4 h-4 text-blue-500 group-hover:translate-x-1 transition-transform" />
        </Link>
      </CardContent>
    </Card>
  );
}
