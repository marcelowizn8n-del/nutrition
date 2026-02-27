'use client';

import { useState } from 'react';
import { Info, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

export default function TechInfo() {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-2 cursor-pointer hover:bg-gray-50 transition-colors">
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Info className="w-5 h-5" />
                Sobre a Tecnologia
              </span>
              {open ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-4 text-sm">
            <div>
              <h4 className="font-semibold text-gray-800">Confiabilidade Médica</h4>
              <ul className="text-gray-600 list-disc list-inside">
                <li><strong>Algoritmo:</strong> NCEP ATP III (Padrão ouro para Síndrome Metabólica)</li>
                <li><strong>Acurácia:</strong> ROC-AUC 0.858 (Predição de risco metabolicamente validada)</li>
                <li><strong>Base de Dados:</strong> Amostra epidemiológica de 37.999 pacientes</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-800">Engine 3D & Fidelidade</h4>
              <p className="text-gray-600">
                Mapeamento anatômico via Morph Targets calibrados. O modelo 3D não é apenas estético;
                as deformações são governadas por faixas antropométricas reais do estudo (Peso, Cintura e Idade).
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-800">Formato e Resolução</h4>
              <p className="text-gray-600">GLB/glTF de alta densidade (~60k vértices) para representação precisa de tecidos moles.</p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-800">Limitações</h4>
              <p className="text-gray-600">Representação estatística baseada em modelos populacionais. Deve ser usado como suporte visual, não como diagnóstico isolado.</p>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
