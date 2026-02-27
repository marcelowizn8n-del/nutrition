import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Função para calcular se tem Síndrome Metabólica (critérios IDF/NCEP ATP III)
function calculateMetabolicSyndrome(
  sex: 'M' | 'F',
  waistCm: number,
  triglyceridesMgDl: number,
  hdlMgDl: number,
  systolicBp: number,
  diastolicBp: number,
  fastingGlucoseMgDl: number,
  isOnAntihypertensive: boolean,
  isOnAntidiabetic: boolean,
  isOnLipidLowering: boolean
): boolean {
  let criteriaCount = 0;

  // 1. Cintura aumentada
  if (sex === 'M' && waistCm >= 94) criteriaCount++;
  if (sex === 'F' && waistCm >= 80) criteriaCount++;

  // 2. Triglicerídeos elevados (ou em tratamento)
  if (triglyceridesMgDl >= 150 || isOnLipidLowering) criteriaCount++;

  // 3. HDL baixo (ou em tratamento)
  if (sex === 'M' && hdlMgDl < 40) criteriaCount++;
  if (sex === 'F' && hdlMgDl < 50) criteriaCount++;

  // 4. PA elevada (ou em tratamento)
  if (systolicBp >= 130 || diastolicBp >= 85 || isOnAntihypertensive) criteriaCount++;

  // 5. Glicemia elevada (ou em tratamento)
  if (fastingGlucoseMgDl >= 100 || isOnAntidiabetic) criteriaCount++;

  return criteriaCount >= 3;
}

// Dados baseados na Tabela 1 do estudo epidemiológico (n=37,999)
// Pacientes representativos de diferentes perfis clínicos
const patientsData = [
  // ===== PERFIL 1: Homem saudável típico (sem SM) =====
  {
    name: 'João Saudável',
    sex: 'M' as const,
    birthYear: 1975, // ~51 anos (mediana do estudo)
    records: [
      {
        year: 2022,
        heightCm: 175,
        weightKg: 78, // IMC ~25.5 (mediana)
        waistCm: 92, // mediana homens
        systolicBp: 114, // mediana
        diastolicBp: 76, // mediana
        triglyceridesMgDl: 97, // mediana
        hdlMgDl: 60, // mediana homens
        ldlMgDl: 115, // mediana
        totalCholesterolMgDl: 188, // mediana
        fastingGlucoseMgDl: 85, // mediana
        physicalActivityLevel: 'moderate',
        smokingStatus: 'never',
        auditScore: 3, // mediana
        bdiScore: 4, // mediana
        astUL: 26, // mediana
        altUL: 34, // mediana
        ggtUL: 25, // mediana
        isOnAntihypertensive: false,
        isOnAntidiabetic: false,
        isOnLipidLowering: false,
        diseaseCodes: [],
        notes: 'Check-up anual - todos parâmetros dentro da normalidade',
      },
      {
        year: 2024,
        heightCm: 175,
        weightKg: 79,
        waistCm: 93,
        systolicBp: 116,
        diastolicBp: 78,
        triglyceridesMgDl: 102,
        hdlMgDl: 58,
        ldlMgDl: 118,
        totalCholesterolMgDl: 192,
        fastingGlucoseMgDl: 88,
        physicalActivityLevel: 'moderate',
        smokingStatus: 'never',
        auditScore: 3,
        bdiScore: 4,
        astUL: 27,
        altUL: 35,
        ggtUL: 26,
        isOnAntihypertensive: false,
        isOnAntidiabetic: false,
        isOnLipidLowering: false,
        diseaseCodes: [],
        notes: 'Mantém estilo de vida saudável',
      },
    ],
  },

  // ===== PERFIL 2: Mulher saudável típica (sem SM) =====
  {
    name: 'Maria Ativa',
    sex: 'F' as const,
    birthYear: 1974, // ~52 anos
    records: [
      {
        year: 2021,
        heightCm: 162,
        weightKg: 62, // IMC ~23.6
        waistCm: 76, // abaixo do limiar F (<80)
        systolicBp: 110,
        diastolicBp: 72,
        triglyceridesMgDl: 85,
        hdlMgDl: 65, // bom para mulher
        ldlMgDl: 105,
        totalCholesterolMgDl: 175,
        fastingGlucoseMgDl: 82,
        physicalActivityLevel: 'high',
        smokingStatus: 'never',
        auditScore: 2,
        bdiScore: 3,
        astUL: 24,
        altUL: 28,
        ggtUL: 20,
        isOnAntihypertensive: false,
        isOnAntidiabetic: false,
        isOnLipidLowering: false,
        diseaseCodes: [],
        notes: 'Pratica exercícios regularmente, alimentação equilibrada',
      },
      {
        year: 2023,
        heightCm: 162,
        weightKg: 61,
        waistCm: 75,
        systolicBp: 108,
        diastolicBp: 70,
        triglyceridesMgDl: 80,
        hdlMgDl: 68,
        ldlMgDl: 100,
        totalCholesterolMgDl: 170,
        fastingGlucoseMgDl: 80,
        physicalActivityLevel: 'high',
        smokingStatus: 'never',
        auditScore: 2,
        bdiScore: 2,
        astUL: 23,
        altUL: 26,
        ggtUL: 18,
        isOnAntihypertensive: false,
        isOnAntidiabetic: false,
        isOnLipidLowering: false,
        diseaseCodes: [],
        notes: 'Excelente condição física, melhorou perfil lipídico',
      },
    ],
  },

  // ===== PERFIL 3: Homem com SM desenvolvida (perfil da coluna "With MS") =====
  {
    name: 'Roberto Metabólico',
    sex: 'M' as const,
    birthYear: 1971, // ~55 anos (mediana com SM)
    records: [
      {
        year: 2020,
        heightCm: 172,
        weightKg: 82, // IMC ~27.7 (mediana com SM)
        waistCm: 99, // mediana homens com SM
        systolicBp: 120, // mediana com SM
        diastolicBp: 80, // mediana com SM
        triglyceridesMgDl: 131, // mediana com SM
        hdlMgDl: 43, // baixo (mediana com SM é 43)
        ldlMgDl: 121, // mediana com SM
        totalCholesterolMgDl: 192, // mediana com SM
        fastingGlucoseMgDl: 89, // mediana com SM
        physicalActivityLevel: 'inactive',
        smokingStatus: 'former',
        auditScore: 3,
        bdiScore: 4,
        astUL: 28, // mediana com SM
        altUL: 40, // mediana com SM
        ggtUL: 31, // mediana com SM
        isOnAntihypertensive: false,
        isOnAntidiabetic: false,
        isOnLipidLowering: false,
        diseaseCodes: [],
        notes: 'Sedentário, ex-fumante, sobrepeso - risco metabólico elevado',
      },
      {
        year: 2022,
        heightCm: 172,
        weightKg: 86,
        waistCm: 103,
        systolicBp: 132,
        diastolicBp: 86,
        triglyceridesMgDl: 165,
        hdlMgDl: 38,
        ldlMgDl: 128,
        totalCholesterolMgDl: 205,
        fastingGlucoseMgDl: 105,
        physicalActivityLevel: 'inactive',
        smokingStatus: 'former',
        auditScore: 4,
        bdiScore: 6,
        astUL: 32,
        altUL: 48,
        ggtUL: 38,
        isOnAntihypertensive: true,
        isOnAntidiabetic: false,
        isOnLipidLowering: false,
        diseaseCodes: ['I10'], // Hipertensão
        notes: 'Diagnóstico de hipertensão, síndrome metabólica estabelecida',
      },
      {
        year: 2024,
        heightCm: 172,
        weightKg: 89,
        waistCm: 107,
        systolicBp: 128, // controlado com medicação
        diastolicBp: 82,
        triglyceridesMgDl: 145,
        hdlMgDl: 40,
        ldlMgDl: 125,
        totalCholesterolMgDl: 198,
        fastingGlucoseMgDl: 112,
        physicalActivityLevel: 'low',
        smokingStatus: 'former',
        auditScore: 3,
        bdiScore: 5,
        astUL: 30,
        altUL: 45,
        ggtUL: 35,
        isOnAntihypertensive: true,
        isOnAntidiabetic: true,
        isOnLipidLowering: true,
        diseaseCodes: ['I10', 'E11'], // Hipertensão + Diabetes
        notes: 'Desenvolveu diabetes tipo 2, iniciou metformina e estatina',
      },
    ],
  },

  // ===== PERFIL 4: Mulher com progressão para SM =====
  {
    name: 'Ana Progressão',
    sex: 'F' as const,
    birthYear: 1968, // ~58 anos
    records: [
      {
        year: 2019,
        heightCm: 160,
        weightKg: 68, // IMC ~26.6
        waistCm: 82, // limítrofe para mulher
        systolicBp: 118,
        diastolicBp: 76,
        triglyceridesMgDl: 125,
        hdlMgDl: 52,
        ldlMgDl: 120,
        totalCholesterolMgDl: 195,
        fastingGlucoseMgDl: 92,
        physicalActivityLevel: 'low',
        smokingStatus: 'never',
        auditScore: 2,
        bdiScore: 5,
        astUL: 25,
        altUL: 32,
        ggtUL: 22,
        isOnAntihypertensive: false,
        isOnAntidiabetic: false,
        isOnLipidLowering: false,
        diseaseCodes: [],
        notes: 'Sobrepeso leve, alguns fatores de risco borderline',
      },
      {
        year: 2021,
        heightCm: 160,
        weightKg: 72,
        waistCm: 87,
        systolicBp: 126,
        diastolicBp: 82,
        triglyceridesMgDl: 148,
        hdlMgDl: 48,
        ldlMgDl: 128,
        totalCholesterolMgDl: 208,
        fastingGlucoseMgDl: 98,
        physicalActivityLevel: 'inactive',
        smokingStatus: 'never',
        auditScore: 2,
        bdiScore: 7,
        astUL: 28,
        altUL: 38,
        ggtUL: 28,
        isOnAntihypertensive: false,
        isOnAntidiabetic: false,
        isOnLipidLowering: false,
        diseaseCodes: [],
        notes: 'Piora dos parâmetros metabólicos durante pandemia',
      },
      {
        year: 2023,
        heightCm: 160,
        weightKg: 76,
        waistCm: 92,
        systolicBp: 134,
        diastolicBp: 86,
        triglyceridesMgDl: 168,
        hdlMgDl: 44,
        ldlMgDl: 135,
        totalCholesterolMgDl: 218,
        fastingGlucoseMgDl: 106,
        physicalActivityLevel: 'inactive',
        smokingStatus: 'never',
        auditScore: 2,
        bdiScore: 8,
        astUL: 32,
        altUL: 45,
        ggtUL: 35,
        isOnAntihypertensive: true,
        isOnAntidiabetic: false,
        isOnLipidLowering: true,
        diseaseCodes: ['I10'], // Hipertensão
        notes: 'Síndrome metabólica confirmada, início de tratamento',
      },
    ],
  },

  // ===== PERFIL 5: Homem jovem sedentário em risco =====
  {
    name: 'Carlos Sedentário',
    sex: 'M' as const,
    birthYear: 1982, // ~44 anos (limite inferior IQR)
    records: [
      {
        year: 2021,
        heightCm: 178,
        weightKg: 88, // IMC ~27.8
        waistCm: 96,
        systolicBp: 122,
        diastolicBp: 80,
        triglyceridesMgDl: 142,
        hdlMgDl: 42,
        ldlMgDl: 130,
        totalCholesterolMgDl: 200,
        fastingGlucoseMgDl: 95,
        physicalActivityLevel: 'inactive',
        smokingStatus: 'current', // 7.5% fumantes atuais
        auditScore: 5,
        bdiScore: 6,
        astUL: 30,
        altUL: 42,
        ggtUL: 38,
        isOnAntihypertensive: false,
        isOnAntidiabetic: false,
        isOnLipidLowering: false,
        diseaseCodes: [],
        notes: 'Trabalho sedentário, fumante, alimentação irregular',
      },
      {
        year: 2023,
        heightCm: 178,
        weightKg: 92,
        waistCm: 100,
        systolicBp: 128,
        diastolicBp: 84,
        triglyceridesMgDl: 158,
        hdlMgDl: 38,
        ldlMgDl: 138,
        totalCholesterolMgDl: 212,
        fastingGlucoseMgDl: 102,
        physicalActivityLevel: 'inactive',
        smokingStatus: 'current',
        auditScore: 6,
        bdiScore: 7,
        astUL: 35,
        altUL: 52,
        ggtUL: 48,
        isOnAntihypertensive: false,
        isOnAntidiabetic: false,
        isOnLipidLowering: false,
        diseaseCodes: [],
        notes: 'Piora progressiva, alto risco de SM iminente',
      },
    ],
  },

  // ===== PERFIL 6: Mulher pós-menopausa com dislipidemia =====
  {
    name: 'Lúcia Dislipidêmica',
    sex: 'F' as const,
    birthYear: 1964, // ~62 anos (limite superior IQR com SM)
    records: [
      {
        year: 2020,
        heightCm: 158,
        weightKg: 70, // IMC ~28
        waistCm: 88,
        systolicBp: 138,
        diastolicBp: 88,
        triglyceridesMgDl: 178,
        hdlMgDl: 42, // baixo para mulher
        ldlMgDl: 145,
        totalCholesterolMgDl: 235,
        fastingGlucoseMgDl: 96,
        physicalActivityLevel: 'low',
        smokingStatus: 'never',
        auditScore: 1,
        bdiScore: 5,
        astUL: 28,
        altUL: 35,
        ggtUL: 30,
        isOnAntihypertensive: true,
        isOnAntidiabetic: false,
        isOnLipidLowering: false,
        diseaseCodes: ['I10'],
        notes: 'Hipertensa em tratamento, dislipidemia importante',
      },
      {
        year: 2022,
        heightCm: 158,
        weightKg: 72,
        waistCm: 90,
        systolicBp: 132, // melhor com medicação
        diastolicBp: 84,
        triglyceridesMgDl: 145,
        hdlMgDl: 48,
        ldlMgDl: 120,
        totalCholesterolMgDl: 195,
        fastingGlucoseMgDl: 94,
        physicalActivityLevel: 'moderate',
        smokingStatus: 'never',
        auditScore: 1,
        bdiScore: 4,
        astUL: 26,
        altUL: 32,
        ggtUL: 26,
        isOnAntihypertensive: true,
        isOnAntidiabetic: false,
        isOnLipidLowering: true,
        diseaseCodes: ['I10'],
        notes: 'Iniciou estatina, começou caminhadas, melhora do perfil',
      },
      {
        year: 2024,
        heightCm: 158,
        weightKg: 68,
        waistCm: 85,
        systolicBp: 126,
        diastolicBp: 80,
        triglyceridesMgDl: 125,
        hdlMgDl: 54,
        ldlMgDl: 105,
        totalCholesterolMgDl: 175,
        fastingGlucoseMgDl: 90,
        physicalActivityLevel: 'moderate',
        smokingStatus: 'never',
        auditScore: 1,
        bdiScore: 3,
        astUL: 24,
        altUL: 28,
        ggtUL: 22,
        isOnAntihypertensive: true,
        isOnAntidiabetic: false,
        isOnLipidLowering: true,
        diseaseCodes: ['I10'],
        notes: 'Boa resposta ao tratamento, saiu dos critérios de SM',
      },
    ],
  },

  // ===== PERFIL 7: Homem com doença cardíaca estabelecida =====
  {
    name: 'Pedro Cardíaco',
    sex: 'M' as const,
    birthYear: 1960, // ~66 anos
    records: [
      {
        year: 2019,
        heightCm: 170,
        weightKg: 85,
        waistCm: 102,
        systolicBp: 145,
        diastolicBp: 92,
        triglyceridesMgDl: 175,
        hdlMgDl: 35,
        ldlMgDl: 155,
        totalCholesterolMgDl: 245,
        fastingGlucoseMgDl: 118,
        physicalActivityLevel: 'inactive',
        smokingStatus: 'former',
        auditScore: 2,
        bdiScore: 8,
        astUL: 35,
        altUL: 48,
        ggtUL: 55,
        isOnAntihypertensive: true,
        isOnAntidiabetic: true,
        isOnLipidLowering: true,
        diseaseCodes: ['I10', 'E11'],
        notes: 'Múltiplos fatores de risco, alto risco cardiovascular',
      },
      {
        year: 2021,
        heightCm: 170,
        weightKg: 82,
        waistCm: 98,
        systolicBp: 138,
        diastolicBp: 85,
        triglyceridesMgDl: 155,
        hdlMgDl: 40,
        ldlMgDl: 130,
        totalCholesterolMgDl: 210,
        fastingGlucoseMgDl: 125,
        physicalActivityLevel: 'low',
        smokingStatus: 'former',
        auditScore: 2,
        bdiScore: 10,
        astUL: 32,
        altUL: 42,
        ggtUL: 45,
        isOnAntihypertensive: true,
        isOnAntidiabetic: true,
        isOnLipidLowering: true,
        diseaseCodes: ['I10', 'E11', 'I25'], // Adicionou doença cardíaca
        notes: 'Evento coronariano - angioplastia com stent',
      },
      {
        year: 2023,
        heightCm: 170,
        weightKg: 78,
        waistCm: 94,
        systolicBp: 125,
        diastolicBp: 78,
        triglyceridesMgDl: 130,
        hdlMgDl: 45,
        ldlMgDl: 85, // alvo mais baixo pós-evento
        totalCholesterolMgDl: 168,
        fastingGlucoseMgDl: 115,
        physicalActivityLevel: 'moderate',
        smokingStatus: 'former',
        auditScore: 1,
        bdiScore: 6,
        astUL: 28,
        altUL: 35,
        ggtUL: 35,
        isOnAntihypertensive: true,
        isOnAntidiabetic: true,
        isOnLipidLowering: true,
        diseaseCodes: ['I10', 'E11', 'I25'],
        notes: 'Reabilitação cardíaca concluída, boa adesão ao tratamento',
      },
    ],
  },

  // ===== PERFIL 8: Jovem atleta (referência saudável) =====
  {
    name: 'Bruno Atleta',
    sex: 'M' as const,
    birthYear: 1990, // ~36 anos
    records: [
      {
        year: 2022,
        heightCm: 180,
        weightKg: 75, // IMC ~23.1
        waistCm: 82,
        systolicBp: 115,
        diastolicBp: 70,
        triglyceridesMgDl: 68,
        hdlMgDl: 72, // alto por exercício
        ldlMgDl: 85,
        totalCholesterolMgDl: 160,
        fastingGlucoseMgDl: 78,
        physicalActivityLevel: 'high',
        smokingStatus: 'never',
        auditScore: 2,
        bdiScore: 2,
        astUL: 32, // levemente elevado por exercício
        altUL: 28,
        ggtUL: 18,
        isOnAntihypertensive: false,
        isOnAntidiabetic: false,
        isOnLipidLowering: false,
        diseaseCodes: [],
        notes: 'Triatleta amador, excelente condicionamento',
      },
      {
        year: 2024,
        heightCm: 180,
        weightKg: 76,
        waistCm: 83,
        systolicBp: 112,
        diastolicBp: 68,
        triglyceridesMgDl: 65,
        hdlMgDl: 75,
        ldlMgDl: 82,
        totalCholesterolMgDl: 155,
        fastingGlucoseMgDl: 76,
        physicalActivityLevel: 'high',
        smokingStatus: 'never',
        auditScore: 2,
        bdiScore: 1,
        astUL: 30,
        altUL: 26,
        ggtUL: 16,
        isOnAntihypertensive: false,
        isOnAntidiabetic: false,
        isOnLipidLowering: false,
        diseaseCodes: [],
        notes: 'Mantém rotina de treinamento, saúde excelente',
      },
    ],
  },

  // ==================================================================================
  // NOVOS PERFIS BASEADOS NA TABELA 1 DO ESTUDO (MÉDIAS/MEDIANAS)
  // ==================================================================================

  // ===== TABELA 1: Homem "Sem Síndrome Metabólica" (Medianas) =====
  {
    name: 'Estudo: Homem Sem SM',
    sex: 'M' as const,
    birthYear: 1976, // Idade ~50
    records: [
      {
        year: 2024,
        heightCm: 175,
        weightKg: 77.2, // IMC 25.2
        waistCm: 92, // Mediana Men No-MetS
        systolicBp: 112,
        diastolicBp: 75,
        triglyceridesMgDl: 94,
        hdlMgDl: 48, // Estimado M
        ldlMgDl: 115,
        totalCholesterolMgDl: 188,
        fastingGlucoseMgDl: 85,
        physicalActivityLevel: 'moderate', // 42.3% active
        smokingStatus: 'never',
        auditScore: 3,
        bdiScore: 4,
        astUL: 26,
        altUL: 33,
        ggtUL: 24,
        isOnAntihypertensive: false,
        isOnAntidiabetic: false,
        isOnLipidLowering: false,
        diseaseCodes: [],
        notes: 'Perfil representativo: Homem sem síndrome metabólica (Medianas Tabela 1)',
      },
    ],
  },

  // ===== TABELA 1: Mulher "Sem Síndrome Metabólica" (Medianas) =====
  {
    name: 'Estudo: Mulher Sem SM',
    sex: 'F' as const,
    birthYear: 1976, // Idade ~50
    records: [
      {
        year: 2024,
        heightCm: 162,
        weightKg: 66.1, // IMC 25.2
        waistCm: 78, // Mediana Women No-MetS
        systolicBp: 112,
        diastolicBp: 75,
        triglyceridesMgDl: 94,
        hdlMgDl: 60, // Estimado F
        ldlMgDl: 115,
        totalCholesterolMgDl: 188,
        fastingGlucoseMgDl: 85,
        physicalActivityLevel: 'moderate',
        smokingStatus: 'never',
        auditScore: 3,
        bdiScore: 4,
        astUL: 26,
        altUL: 33,
        ggtUL: 24,
        isOnAntihypertensive: false,
        isOnAntidiabetic: false,
        isOnLipidLowering: false,
        diseaseCodes: [],
        notes: 'Perfil representativo: Mulher sem síndrome metabólica (Medianas Tabela 1)',
      },
    ],
  },

  // ===== TABELA 1: Homem "Com Síndrome Metabólica" (Medianas) =====
  {
    name: 'Estudo: Homem Com SM',
    sex: 'M' as const,
    birthYear: 1971, // Idade ~55
    records: [
      {
        year: 2024,
        heightCm: 175,
        weightKg: 84.5, // IMC 27.6
        waistCm: 99, // Mediana Men With-MetS
        systolicBp: 120, // Mediana (mas 24% usam medicação)
        diastolicBp: 80,
        triglyceridesMgDl: 131,
        hdlMgDl: 43, // Menor HDL
        ldlMgDl: 121,
        totalCholesterolMgDl: 192,
        fastingGlucoseMgDl: 89,
        physicalActivityLevel: 'low', // Maior inatividade no grupo SM
        smokingStatus: 'former',
        auditScore: 3,
        bdiScore: 4,
        astUL: 28,
        altUL: 40,
        ggtUL: 31,
        isOnAntihypertensive: true, // 24% prevalencia
        isOnAntidiabetic: false,
        isOnLipidLowering: true, // 22.6% prevalencia
        diseaseCodes: ['I10'], // Hipertensão comum neste grupo
        notes: 'Perfil representativo: Homem com síndrome metabólica (Medianas Tabela 1)',
      },
    ],
  },

  // ===== TABELA 1: Mulher "Com Síndrome Metabólica" (Medianas) =====
  {
    name: 'Estudo: Mulher Com SM',
    sex: 'F' as const,
    birthYear: 1971, // Idade ~55
    records: [
      {
        year: 2024,
        heightCm: 162,
        weightKg: 72.4, // IMC 27.6
        waistCm: 89, // Mediana Women With-MetS
        systolicBp: 120,
        diastolicBp: 80,
        triglyceridesMgDl: 131,
        hdlMgDl: 51, // Menor HDL
        ldlMgDl: 121,
        totalCholesterolMgDl: 192,
        fastingGlucoseMgDl: 89,
        physicalActivityLevel: 'low',
        smokingStatus: 'former',
        auditScore: 3,
        bdiScore: 4,
        astUL: 28,
        altUL: 40,
        ggtUL: 31,
        isOnAntihypertensive: true,
        isOnAntidiabetic: false,
        isOnLipidLowering: true,
        diseaseCodes: ['I10'],
        notes: 'Perfil representativo: Mulher com síndrome metabólica (Medianas Tabela 1)',
      },
    ],
  },
];

async function main() {
  console.log('🧹 Limpando dados existentes...');
  await prisma.predictionLog.deleteMany();
  await prisma.clinicalRecord.deleteMany();
  await prisma.patient.deleteMany();

  console.log('🌱 Criando pacientes baseados no estudo epidemiológico...');

  for (const patientData of patientsData) {
    const patient = await prisma.patient.create({
      data: {
        name: patientData.name,
        sex: patientData.sex,
        birthYear: patientData.birthYear,
      },
    });

    for (const record of patientData.records) {
      const bmi = record.weightKg / Math.pow(record.heightCm / 100, 2);
      const hasMetabolicSyndrome = calculateMetabolicSyndrome(
        patientData.sex,
        record.waistCm,
        record.triglyceridesMgDl,
        record.hdlMgDl,
        record.systolicBp,
        record.diastolicBp,
        record.fastingGlucoseMgDl,
        record.isOnAntihypertensive,
        record.isOnAntidiabetic,
        record.isOnLipidLowering
      );

      // Gerar dados de bioimpedância realistas
      // Gordura: Homens 10-25%, Mulheres 20-35% (base + ajuste BMI)
      const baseFat = patientData.sex === 'M' ? 15 : 25;
      const fatFactor = (bmi - 22) * 1.5; // +gordura se BMI > 22
      const bioImpedanceFat = Math.max(5, Math.min(60, baseFat + fatFactor + (Math.random() * 2 - 1)));

      // Músculo: Inverso da gordura (aprox)
      const bioImpedanceMuscle = Math.max(10, Math.min(60, (100 - bioImpedanceFat) * 0.45));

      // Água: ~50-60%
      const bioImpedanceWater = Math.max(30, Math.min(70, 55 - (bioImpedanceFat * 0.1)));

      // Gordura visceral: 1-12 saudável, >13 excesso
      const visceralBase = (record.waistCm || 90) - (patientData.sex === 'M' ? 85 : 75);
      const bioImpedanceVisceral = Math.max(1, Math.min(30, Math.floor(5 + visceralBase * 0.5)));

      // Osso: 2-3.5kg
      const bioImpedanceBone = 2.5 + (record.weightKg * 0.01);

      // Idade metabólica: Idade real + penalidade por BMI/Cintura
      const metabolicPenalty = (bmi > 25 ? (bmi - 25) * 1.5 : 0) + (hasMetabolicSyndrome ? 5 : -2);
      const currentYear = new Date().getFullYear();
      const realAge = currentYear - patientData.birthYear;
      const bioImpedanceMetabolicAge = Math.floor(Math.max(18, realAge + metabolicPenalty));

      await prisma.clinicalRecord.create({
        data: {
          patientId: patient.id,
          year: record.year,
          heightCm: record.heightCm,
          weightKg: record.weightKg,
          bmi,
          waistCm: record.waistCm,
          systolicBp: record.systolicBp,
          diastolicBp: record.diastolicBp,
          triglyceridesMgDl: record.triglyceridesMgDl,
          hdlMgDl: record.hdlMgDl,
          ldlMgDl: record.ldlMgDl,
          totalCholesterolMgDl: record.totalCholesterolMgDl,
          fastingGlucoseMgDl: record.fastingGlucoseMgDl,
          hasMetabolicSyndrome,
          // New Bioimpedance Fields
          bioImpedanceFat,
          bioImpedanceMuscle,
          bioImpedanceWater,
          bioImpedanceVisceral,
          bioImpedanceBone,
          bioImpedanceMetabolicAge,
          physicalActivityLevel: record.physicalActivityLevel,
          smokingStatus: record.smokingStatus,
          auditScore: record.auditScore,
          bdiScore: record.bdiScore,
          astUL: record.astUL,
          altUL: record.altUL,
          ggtUL: record.ggtUL,
          isOnAntihypertensive: record.isOnAntihypertensive,
          isOnAntidiabetic: record.isOnAntidiabetic,
          isOnLipidLowering: record.isOnLipidLowering,
          diseaseCodes: JSON.stringify(record.diseaseCodes), // SQLite doesnt support arrays, storing as JSON string
          notes: record.notes,
        },
      });
    }

    const msStatus = patientData.records[patientData.records.length - 1];
    const lastHasMS = calculateMetabolicSyndrome(
      patientData.sex,
      msStatus.waistCm,
      msStatus.triglyceridesMgDl,
      msStatus.hdlMgDl,
      msStatus.systolicBp,
      msStatus.diastolicBp,
      msStatus.fastingGlucoseMgDl,
      msStatus.isOnAntihypertensive,
      msStatus.isOnAntidiabetic,
      msStatus.isOnLipidLowering
    );

    console.log(`✅ ${patient.name} (${patientData.sex}, ${2026 - patientData.birthYear}a) - SM: ${lastHasMS ? '⚠️ SIM' : '✓ NÃO'}`);
  }

  // ==================================================================================
  // GERAR 50 PACIENTES SINTÉTICOS VARIADOS
  // ==================================================================================

  const firstNamesM = ['Lucas', 'Mateus', 'Gabriel', 'Enzo', 'Leonardo', 'Thiago', 'Rafael', 'Gustavo', 'Felipe', 'Nicolas', 'Samuel', 'Bruno', 'Daniel', 'Marcos', 'Andre', 'Vitor', 'Luiz', 'Francisco', 'Antonio', 'Eduardo'];
  const firstNamesF = ['Julia', 'Sophia', 'Isabella', 'Alice', 'Manuela', 'Laura', 'Luiza', 'Valentina', 'Helena', 'Beatriz', 'Mariana', 'Gabriela', 'Fernanda', 'Camila', 'Leticia', 'Amanda', 'Bruna', 'Vitoria', 'Larissa', 'Carolina'];
  const lastNames = ['Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Alves', 'Pereira', 'Lima', 'Gomes', 'Costa', 'Ribeiro', 'Martins', 'Carvalho', 'Almeida', 'Lopes', 'Soares', 'Fernandes', 'Vieira', 'Barbosa', 'Rocha', 'Dias', 'Nascimento', 'Andrade', 'Moreira', 'Nunes', 'Marques', 'Machado', 'Mendes', 'Freitas'];

  const templates = patientsData.slice(-4); // Usar os últimos 4 perfis (Estudo) como base
  const TOTAL_TO_GENERATE = 148; // 12 manuais + 148 sintéticos = 160 total

  console.log(`\n🎲 Gerando mais ${TOTAL_TO_GENERATE} pacientes sintéticos variados...`);

  for (let i = 0; i < TOTAL_TO_GENERATE; i++) {
    // 1. Escolher template base aleatório
    const template = templates[Math.floor(Math.random() * templates.length)];
    const isMale = template.sex === 'M';

    // 2. Gerar Nome Único
    const firstName = isMale
      ? firstNamesM[Math.floor(Math.random() * firstNamesM.length)]
      : firstNamesF[Math.floor(Math.random() * firstNamesF.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const fullName = `${firstName} ${lastName}`;

    // 3. Variação de Idade (+/- 5 anos)
    const ageVariation = Math.floor(Math.random() * 11) - 5;
    const birthYear = template.birthYear + ageVariation;

    const patient = await prisma.patient.create({
      data: {
        name: fullName,
        sex: template.sex,
        birthYear: birthYear,
      },
    });

    // 4. Criar registro único (2024) com variações fisiológicas
    const baseRecord = template.records[0];

    // Variações aleatórias sutis (+/- 5-10%)
    const vary = (val: number, pct: number) => val * (1 + (Math.random() * pct * 2 - pct) / 100);
    const varyInt = (val: number, range: number) => Math.round(val + (Math.random() * range * 2 - range));

    const heightCm = Math.round(vary(baseRecord.heightCm, 3)); // +/- 3% altura
    const weightKg = parseFloat(vary(baseRecord.weightKg, 8).toFixed(1)); // +/- 8% peso
    const waistCm = Math.round(vary(baseRecord.waistCm, 5)); // +/- 5% cintura

    // Calcular BMI para ser consistente
    const heightM = heightCm / 100;
    const bmi = parseFloat((weightKg / (heightM * heightM)).toFixed(1));

    // Variações metabólicas
    const systolicBp = varyInt(baseRecord.systolicBp, 5);
    const diastolicBp = varyInt(baseRecord.diastolicBp, 4);
    const triglyceridesMgDl = varyInt(baseRecord.triglyceridesMgDl, 15);
    const hdlMgDl = varyInt(baseRecord.hdlMgDl, 5);
    const fastingGlucoseMgDl = varyInt(baseRecord.fastingGlucoseMgDl, 8);

    // Recalcular SM com os novos valores variados
    const hasMetabolicSyndrome = calculateMetabolicSyndrome(
      template.sex,
      waistCm,
      triglyceridesMgDl,
      hdlMgDl,
      systolicBp,
      diastolicBp,
      fastingGlucoseMgDl,
      baseRecord.isOnAntihypertensive,
      baseRecord.isOnAntidiabetic,
      baseRecord.isOnLipidLowering
    );

    // Bioimpedância (reutilizando lógica aproximada)
    const baseFat = template.sex === 'M' ? 15 : 25;
    const fatFactor = (bmi - 22) * 1.5;
    const bioImpedanceFat = Math.max(5, Math.min(60, baseFat + fatFactor + (Math.random() * 3 - 1.5)));
    const bioImpedanceMuscle = Math.max(10, Math.min(60, (100 - bioImpedanceFat) * 0.45));
    const bioImpedanceWater = Math.max(30, Math.min(70, 55 - (bioImpedanceFat * 0.1)));

    const visceralBase = (waistCm || 90) - (template.sex === 'M' ? 85 : 75);
    const bioImpedanceVisceral = Math.max(1, Math.min(30, Math.floor(5 + visceralBase * 0.5)));
    const bioImpedanceBone = parseFloat((2.5 + (weightKg * 0.01)).toFixed(1));

    const metabolicPenalty = (bmi > 25 ? (bmi - 25) * 1.5 : 0) + (hasMetabolicSyndrome ? 5 : -2);
    const currentYear = new Date().getFullYear();
    const realAge = currentYear - birthYear;
    const bioImpedanceMetabolicAge = Math.floor(Math.max(18, realAge + metabolicPenalty));

    await prisma.clinicalRecord.create({
      data: {
        patientId: patient.id,
        year: 2024,
        heightCm,
        weightKg,
        bmi,
        waistCm,
        systolicBp,
        diastolicBp,
        triglyceridesMgDl,
        hdlMgDl,
        ldlMgDl: varyInt(baseRecord.ldlMgDl, 10),
        totalCholesterolMgDl: varyInt(baseRecord.totalCholesterolMgDl, 10),
        fastingGlucoseMgDl,
        hasMetabolicSyndrome,
        bioImpedanceFat,
        bioImpedanceMuscle,
        bioImpedanceWater,
        bioImpedanceVisceral,
        bioImpedanceBone,
        bioImpedanceMetabolicAge,
        physicalActivityLevel: baseRecord.physicalActivityLevel,
        smokingStatus: baseRecord.smokingStatus,
        auditScore: baseRecord.auditScore,
        bdiScore: baseRecord.bdiScore,
        astUL: varyInt(baseRecord.astUL, 5),
        altUL: varyInt(baseRecord.altUL, 5),
        ggtUL: varyInt(baseRecord.ggtUL, 5),
        isOnAntihypertensive: baseRecord.isOnAntihypertensive,
        isOnAntidiabetic: baseRecord.isOnAntidiabetic,
        isOnLipidLowering: baseRecord.isOnLipidLowering,
        diseaseCodes: JSON.stringify(baseRecord.diseaseCodes),
        notes: `Paciente sintético gerado via simulação epidemiológica (Base: ${template.name})`,
      },
    });
  }

  console.log('\n📊 Resumo dos pacientes criados:');
  console.log('   - 8 perfis curados manualmente (João, Maria, Pedro, etc)');
  console.log(`   - ${TOTAL_TO_GENERATE} perfis sintéticos variados baseados em epidemiologia`);
  console.log(`   - TOTAL: ${8 + TOTAL_TO_GENERATE} Pacientes`);
  console.log('\n🎉 Seed concluído com sucesso!');
}

main()
  .catch((e) => {
    console.error('❌ Erro durante seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
