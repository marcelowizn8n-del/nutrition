# Digital Twins - Sistema de Visualização 3D de Pacientes

## 📋 Visão Geral

O **Digital Twins** é um sistema de visualização médica que cria representações 3D de pacientes (gêmeos digitais) para acompanhamento clínico. O sistema permite que profissionais de saúde visualizem a evolução corporal de pacientes ao longo do tempo, considerando fatores como peso, altura, idade e condições clínicas.

## 🎯 Finalidade

### Objetivo Principal
Criar uma representação visual 3D que reflete o estado de saúde do paciente, permitindo:

1. **Acompanhamento Temporal**: Visualizar a evolução do corpo do paciente ao longo dos anos
2. **Impacto de Doenças**: Demonstrar como condições clínicas (Diabetes, Hipertensão, Cardiopatias) afetam a morfologia corporal
3. **Simulação "E Se?"**: Permitir simulações de cenários hipotéticos (ex: "e se o paciente perdesse 10kg?")
4. **Comunicação Médico-Paciente**: Facilitar a comunicação visual sobre riscos e progressão de doenças

### Condições Clínicas Mapeadas
- **E11 - Diabetes Mellitus Tipo 2**: Aumenta peso e circunferência abdominal
- **I10 - Hipertensão Arterial**: Afeta distribuição de peso e massa muscular
- **I25 - Doença Cardíaca Isquêmica**: Impacta postura e composição corporal

## 🏗️ Arquitetura Técnica

### Stack Tecnológico

| Camada | Tecnologia |
|--------|------------|
| **Frontend** | Next.js 14, React 18, TypeScript |
| **3D Engine** | Three.js, @react-three/fiber, @react-three/drei |
| **UI Components** | Tailwind CSS, Radix UI, Lucide Icons |
| **Backend** | Next.js API Routes |
| **Database** | PostgreSQL (Prisma ORM) |
| **Modelos 3D** | GLB/GLTF com Morph Targets |

### Estrutura do Projeto

```
digital_twins/
├── nextjs_space/
│   ├── app/
│   │   ├── api/
│   │   │   ├── calculate-body-params/  # Cálculo de parâmetros corporais
│   │   │   ├── patient/[id]/           # Dados de paciente individual
│   │   │   └── patients/               # Lista de pacientes
│   │   ├── layout.tsx                  # Layout raiz
│   │   └── page.tsx                    # Página principal
│   ├── components/
│   │   ├── digital-twins-app.tsx       # Componente principal da aplicação
│   │   ├── three-viewer.tsx            # Visualizador 3D com Three.js
│   │   ├── viewer-loader.tsx           # Loader dinâmico do viewer
│   │   ├── patient-selector.tsx        # Seletor de pacientes
│   │   ├── timeline-slider.tsx         # Linha do tempo clínica
│   │   └── ui/                         # Componentes UI reutilizáveis
│   ├── lib/
│   │   ├── clinical-mapper.ts          # Mapeamento clínico → morph targets
│   │   ├── db.ts                       # Configuração do banco de dados
│   │   └── types.ts                    # Tipos TypeScript
│   ├── prisma/
│   │   └── schema.prisma               # Schema do banco de dados
│   ├── public/
│   │   └── models/
│   │       ├── avatar_morphable.glb    # Modelo 3D masculino
│   │       └── avatar_female.glb       # Modelo 3D feminino
│   └── scripts/
│       └── seed.ts                     # Seeds do banco de dados
```

## 🧬 Sistema de Morph Targets

### O que são Morph Targets?
Morph targets são deformações predefinidas na geometria 3D que podem ser interpoladas para criar variações suaves no modelo. Cada morph target representa uma característica corporal específica.

### Morph Targets Implementados

| Target | Descrição | Efeito Visual |
|--------|-----------|---------------|
| **Weight** | Massa corporal geral | Expansão lateral do corpo |
| **AbdomenGirth** | Circunferência abdominal | Protuberância na região abdominal |
| **MuscleMass** | Massa muscular | Volume em braços/pernas |
| **Posture** | Curvatura espinhal | Inclinação do tronco |
| **DiabetesEffect** | Efeito do diabetes | Combinação de peso + abdômen |
| **HypertensionEffect** | Efeito da hipertensão | Distribuição de gordura |
| **HeartDiseaseEffect** | Efeito cardíaco | Alteração postural |

### Mapeamento Clínico → Visual

O arquivo `clinical-mapper.ts` converte dados clínicos em valores de morph targets:

```typescript
// Exemplo de cálculo
const bmi = weightKg / (heightCm/100)²
const normalizedBMI = (bmi - 18) / (45 - 18)  // Normaliza para 0-1

// Aplica modificadores baseados em doenças
if (diseaseCodes.includes('E11')) {  // Diabetes
  weightModifier += 0.05
  abdomenModifier += 0.08
  diabetesEffect = 0.3
}
```

## 📊 Modelos 3D

### Especificações dos Avatares

| Modelo | Vértices | Faces | Altura Base | Arquivo |
|--------|----------|-------|-------------|---------|
| Masculino | 75.001 | 149.998 | 173.2cm | avatar_morphable.glb |
| Feminino | 75.002 | 150.000 | 171.2cm | avatar_female.glb |

### Escala Dinâmica
Os modelos são escalados dinamicamente baseados na altura real do paciente:

```typescript
const scale = heightCm / MODEL_HEIGHT;
// Ex: Paciente com 160cm → scale = 160/171.2 = 0.935
```

### Pipeline de Geração dos Modelos

1. **Modelo Base**: Importado de arquivos GLB de alta qualidade
2. **Processamento Python**: Scripts com trimesh + pygltflib
3. **Criação de Morph Targets**: Algoritmos de deformação baseados em regiões anatômicas
4. **Otimização**: Simplificação para ~75k vértices mantendo qualidade
5. **Exportação**: Formato GLB com morph targets embarcados

## 🗄️ Banco de Dados

### Schema (Prisma)

```prisma
model Patient {
  id         String   @id @default(cuid())
  name       String
  sex        String   // 'M' ou 'F'
  birthDate  DateTime
  records    ClinicalRecord[]
}

model ClinicalRecord {
  id           String   @id @default(cuid())
  patientId    String
  year         Int
  heightCm     Float
  weightKg     Float
  diseaseCodes String[] // ['E11', 'I10', 'I25']
  notes        String?
  patient      Patient  @relation(...)
}
```

### Pacientes de Demonstração

| Paciente | Sexo | Perfil Clínico |
|----------|------|----------------|
| Pedro Magro | M | Saudável, IMC normal |
| Roberto Obeso | M | Obesidade severa, múltiplas comorbidades |
| Ana Transformação | F | Perda de peso dramática, remissão de doenças |
| Carlos Moderado | M | Progressão típica para diabetes/hipertensão |
| Lucia Cardíaca | F | Foco em progressão de doença cardíaca |

## 🖼️ Interface do Usuário

### Componentes Principais

1. **Header**: Logo Digital Twin + título do sistema
2. **Seletor de Paciente**: Dropdown com informações básicas
3. **Linha do Tempo**: Slider interativo com marcadores de eventos clínicos
4. **Visualizador 3D**: Canvas Three.js com controles de órbita
5. **Painel de Métricas**: Peso, altura, IMC com indicadores de tendência
6. **Painel de Simulação**: Controles "E Se?" para cenários hipotéticos

### Interatividade

- **Rotação**: Arrastar para girar o modelo 3D
- **Zoom**: Scroll para aproximar/afastar
- **Timeline**: Arrastar para navegar entre anos
- **Simulação**: Sliders para ajustar peso e condições

## 🚀 Como Executar

### Desenvolvimento Local

```bash
cd digital_twins/nextjs_space

# Instalar dependências
yarn install

# Configurar banco de dados
yarn prisma generate
yarn prisma db push
yarn prisma db seed

# Iniciar servidor de desenvolvimento
yarn dev
```

### Produção

O sistema está deployado em: **https://digitaltwin.abacusai.app**

## 📈 Evolução Futura

### Funcionalidades Planejadas
- Integração com sistemas hospitalares (HL7 FHIR)
- Modelos específicos por etnia/biótipo
- Visualização de órgãos internos
- Predição de evolução baseada em IA
- Comparação lado a lado de cenários

### Melhorias Técnicas
- WebGPU para renderização avançada
- Modelos com esqueleto para animações
- Texturas realistas de pele
- Suporte a realidade aumentada (AR)

---

## 📝 Créditos

**Desenvolvido por**: DeepAgent (Abacus.AI)  
**Cliente**: Hospital Albert Einstein  
**Data**: Janeiro 2026  
**Versão**: 1.0 MVP

---

*Este documento faz parte do projeto Digital Twins para visualização médica 3D.*
