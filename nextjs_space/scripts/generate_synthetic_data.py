#!/usr/bin/env python3
"""
Gerador de Dados Sintéticos para Digital Twins

Baseado nas distribuições da Tabela 1 do artigo do Hospital Albert Einstein
sobre predição de síndrome metabólica usando machine learning.

Gera 5.000 pares de visitas sintéticas com:
- 74.5% masculino, 25.5% feminino
- 8.4% de prevalência de síndrome metabólica
- Correlações realistas entre variáveis
- Intervalo entre visitas: 8-24 meses
"""

import numpy as np
import pandas as pd
from scipy.stats import truncnorm
import json
import os
from datetime import datetime, timedelta
import random

# Seed para reprodutibilidade
np.random.seed(42)
random.seed(42)

# Constantes baseadas no artigo
MS_PREVALENCE = 0.084  # 8.4% prevalência de síndrome metabólica
MALE_PROPORTION = 0.745  # 74.5% masculino

# Critérios de Síndrome Metabólica (NCEP ATP III adaptado)
MS_CRITERIA = {
    'waist_male': 94,      # >= 94cm para homens
    'waist_female': 80,    # >= 80cm para mulheres
    'triglycerides': 150,  # >= 150 mg/dL
    'hdl_male': 40,        # < 40 mg/dL para homens
    'hdl_female': 50,      # < 50 mg/dL para mulheres
    'systolic_bp': 130,    # >= 130 mmHg
    'diastolic_bp': 85,    # >= 85 mmHg
    'glucose': 100,        # >= 100 mg/dL
}

def truncated_normal(mean, std, low, high, size):
    """Gera amostras de distribuição normal truncada."""
    a, b = (low - mean) / std, (high - mean) / std
    return truncnorm.rvs(a, b, loc=mean, scale=std, size=size)

def generate_patient_base(n_patients):
    """Gera características base dos pacientes."""
    
    # Sexo (74.5% M, 25.5% F)
    sex = np.random.choice(['M', 'F'], n_patients, p=[MALE_PROPORTION, 1 - MALE_PROPORTION])
    
    # Idade (média ~51 anos, desvio ~10)
    age = truncated_normal(51, 10, 25, 80, n_patients).astype(int)
    
    # Ano de nascimento (baseado na idade)
    current_year = 2024
    birth_year = current_year - age
    
    return pd.DataFrame({
        'sex': sex,
        'age': age,
        'birth_year': birth_year
    })

def generate_clinical_record(patient_base, visit_number=1):
    """Gera registro clínico para cada paciente."""
    
    n = len(patient_base)
    sex = patient_base['sex'].values
    age = patient_base['age'].values
    
    is_male = sex == 'M'
    
    # ========== ALTURA E PESO ==========
    # Altura baseada em médias brasileiras
    height_male = truncated_normal(172, 7, 155, 195, n)
    height_female = truncated_normal(160, 6, 145, 180, n)
    height_cm = np.where(is_male, height_male, height_female)
    
    # IMC (baseado na Tabela 1: mediana 25.4, IQR 23.4-27.5)
    # Gerar com correlação com idade
    bmi_base = truncated_normal(25.4, 4.0, 18, 45, n)
    bmi_age_effect = (age - 40) * 0.05  # IMC aumenta com idade
    bmi = np.clip(bmi_base + bmi_age_effect, 18, 45)
    
    # Peso derivado do IMC
    weight_kg = bmi * (height_cm / 100) ** 2
    
    # ========== CIRCUNFERÊNCIA ABDOMINAL ==========
    # Correlacionada com IMC
    # Homens: mediana 92, IQR 87-99
    # Mulheres: mediana 79, IQR 73-85
    waist_male = bmi * 3.5 + truncated_normal(0, 5, -15, 20, n)
    waist_female = bmi * 3.0 + truncated_normal(-5, 4, -15, 15, n)
    waist_cm = np.where(is_male, waist_male, waist_female)
    waist_cm = np.clip(waist_cm, 60, 140)
    
    # ========== PRESSÃO ARTERIAL ==========
    # Correlacionada com idade e IMC
    # Sistólica: mediana 114, IQR 110-120
    # Diastólica: mediana 76, IQR 70-80
    systolic_base = truncated_normal(114, 12, 90, 180, n)
    systolic_age_effect = (age - 40) * 0.3
    systolic_bmi_effect = (bmi - 25) * 0.5
    systolic_bp = np.clip(systolic_base + systolic_age_effect + systolic_bmi_effect, 90, 200)
    
    diastolic_base = truncated_normal(76, 8, 60, 110, n)
    diastolic_age_effect = (age - 40) * 0.2
    diastolic_bmi_effect = (bmi - 25) * 0.3
    diastolic_bp = np.clip(diastolic_base + diastolic_age_effect + diastolic_bmi_effect, 55, 120)
    
    # ========== LIPÍDIOS ==========
    # Triglicerídeos: mediana 97, IQR 73-130 (log-normal)
    log_trig = truncated_normal(4.5, 0.4, 3.4, 6.2, n)
    triglycerides = np.exp(log_trig)
    # Correlação com IMC
    triglycerides = triglycerides * (1 + (bmi - 25) * 0.02)
    triglycerides = np.clip(triglycerides, 30, 500)
    
    # HDL: Homens mediana 47, IQR 42-55; Mulheres mediana 60, IQR 51-70
    hdl_male = truncated_normal(47, 10, 25, 90, n)
    hdl_female = truncated_normal(60, 12, 30, 100, n)
    hdl = np.where(is_male, hdl_male, hdl_female)
    # HDL inversamente correlacionado com triglicerídeos
    hdl = hdl * (1 - (triglycerides - 100) * 0.001)
    hdl = np.clip(hdl, 20, 100)
    
    # LDL e Colesterol Total
    ldl = truncated_normal(120, 30, 50, 200, n)
    total_chol = hdl + ldl + triglycerides / 5
    
    # ========== GLICEMIA ==========
    # Mediana 85, IQR 80-91
    glucose_base = truncated_normal(85, 15, 60, 200, n)
    glucose_bmi_effect = (bmi - 25) * 1.5
    glucose = np.clip(glucose_base + glucose_bmi_effect, 60, 300)
    
    # ========== MARCADORES HEPÁTICOS ==========
    # GGT: mediana 25, IQR 18-36 (log-normal)
    log_ggt = truncated_normal(3.2, 0.5, 1.6, 5.3, n)
    ggt = np.exp(log_ggt)
    ggt = ggt * (1 + (bmi - 25) * 0.03)  # Correlação com IMC
    ggt = np.clip(ggt, 5, 200)
    
    # AST e ALT
    ast = truncated_normal(25, 10, 10, 100, n)
    alt = truncated_normal(28, 12, 10, 120, n)
    # Correlação com IMC e triglicerídeos
    alt = alt * (1 + (bmi - 25) * 0.02 + (triglycerides - 100) * 0.001)
    alt = np.clip(alt, 8, 150)
    
    # ========== ESTILO DE VIDA ==========
    activity_levels = ['inactive', 'low', 'moderate', 'high']
    # Probabilidades inversamente relacionadas ao IMC
    activity_probs_high_bmi = [0.35, 0.35, 0.20, 0.10]
    activity_probs_low_bmi = [0.10, 0.25, 0.40, 0.25]
    
    physical_activity = []
    for b in bmi:
        if b > 28:
            probs = activity_probs_high_bmi
        else:
            probs = activity_probs_low_bmi
        physical_activity.append(np.random.choice(activity_levels, p=probs))
    
    smoking_options = ['never', 'previous', 'current']
    smoking_probs = [0.60, 0.25, 0.15]
    smoking_status = np.random.choice(smoking_options, n, p=smoking_probs)
    
    # AUDIT score (álcool) - 0-40
    audit_score = truncated_normal(8, 6, 0, 40, n).astype(int)
    
    # BDI score (depressão) - 0-63
    bdi_score = truncated_normal(10, 8, 0, 40, n).astype(int)
    
    # ========== MEDICAMENTOS ==========
    # Baseado nos valores de PA, glicose e lipídios
    is_on_antihypertensive = (systolic_bp >= 140) | (diastolic_bp >= 90)
    is_on_antihypertensive = is_on_antihypertensive | (np.random.random(n) < 0.1)  # 10% adicional
    
    is_on_antidiabetic = glucose >= 126
    is_on_antidiabetic = is_on_antidiabetic | (np.random.random(n) < 0.05)  # 5% adicional
    
    is_on_lipid_lowering = (ldl >= 160) | (triglycerides >= 200)
    is_on_lipid_lowering = is_on_lipid_lowering | (np.random.random(n) < 0.08)  # 8% adicional
    
    # ========== SÍNDROME METABÓLICA ==========
    # Calcular critérios
    waist_criteria = np.where(is_male, waist_cm >= MS_CRITERIA['waist_male'], 
                              waist_cm >= MS_CRITERIA['waist_female'])
    trig_criteria = triglycerides >= MS_CRITERIA['triglycerides']
    hdl_criteria = np.where(is_male, hdl < MS_CRITERIA['hdl_male'], 
                            hdl < MS_CRITERIA['hdl_female'])
    bp_criteria = (systolic_bp >= MS_CRITERIA['systolic_bp']) | (diastolic_bp >= MS_CRITERIA['diastolic_bp'])
    glucose_criteria = glucose >= MS_CRITERIA['glucose']
    
    criteria_count = (waist_criteria.astype(int) + trig_criteria.astype(int) + 
                      hdl_criteria.astype(int) + bp_criteria.astype(int) + 
                      glucose_criteria.astype(int))
    
    has_metabolic_syndrome = criteria_count >= 3
    
    # ========== CÓDIGOS ICD-10 ==========
    disease_codes = []
    for i in range(n):
        codes = []
        if glucose[i] >= 126 or is_on_antidiabetic[i]:
            codes.append('E11')  # Diabetes tipo 2
        if systolic_bp[i] >= 140 or diastolic_bp[i] >= 90 or is_on_antihypertensive[i]:
            codes.append('I10')  # Hipertensão
        if has_metabolic_syndrome[i] and np.random.random() < 0.3:
            codes.append('I25')  # Doença cardíaca isquêmica (30% dos com SM)
        disease_codes.append(codes)
    
    return pd.DataFrame({
        'height_cm': np.round(height_cm, 1),
        'weight_kg': np.round(weight_kg, 1),
        'bmi': np.round(bmi, 2),
        'waist_cm': np.round(waist_cm, 1),
        'systolic_bp': np.round(systolic_bp, 0),
        'diastolic_bp': np.round(diastolic_bp, 0),
        'triglycerides_mg_dl': np.round(triglycerides, 0),
        'hdl_mg_dl': np.round(hdl, 0),
        'ldl_mg_dl': np.round(ldl, 0),
        'total_cholesterol_mg_dl': np.round(total_chol, 0),
        'fasting_glucose_mg_dl': np.round(glucose, 0),
        'ast_ul': np.round(ast, 0),
        'alt_ul': np.round(alt, 0),
        'ggt_ul': np.round(ggt, 0),
        'physical_activity_level': physical_activity,
        'smoking_status': smoking_status,
        'audit_score': audit_score,
        'bdi_score': bdi_score,
        'is_on_antihypertensive': is_on_antihypertensive,
        'is_on_antidiabetic': is_on_antidiabetic,
        'is_on_lipid_lowering': is_on_lipid_lowering,
        'has_metabolic_syndrome': has_metabolic_syndrome,
        'disease_codes': disease_codes,
        'criteria_count': criteria_count
    })

def generate_follow_up_visit(baseline_df, patient_base, months_between=12):
    """Gera visita de follow-up com mudanças realistas."""
    
    n = len(baseline_df)
    follow_up = baseline_df.copy()
    
    # Variações naturais (pequenas mudanças)
    weight_change = truncated_normal(0, 2, -10, 10, n)  # kg
    follow_up['weight_kg'] = np.clip(follow_up['weight_kg'] + weight_change, 45, 200)
    
    # Recalcular IMC
    follow_up['bmi'] = follow_up['weight_kg'] / (follow_up['height_cm'] / 100) ** 2
    
    # Cintura muda proporcionalmente ao peso
    waist_change = weight_change * 0.8
    follow_up['waist_cm'] = np.clip(follow_up['waist_cm'] + waist_change, 60, 140)
    
    # PA com pequenas variações
    follow_up['systolic_bp'] = np.clip(
        follow_up['systolic_bp'] + truncated_normal(0, 5, -15, 15, n), 90, 200
    )
    follow_up['diastolic_bp'] = np.clip(
        follow_up['diastolic_bp'] + truncated_normal(0, 3, -10, 10, n), 55, 120
    )
    
    # Lipídios com pequenas variações
    follow_up['triglycerides_mg_dl'] = np.clip(
        follow_up['triglycerides_mg_dl'] * (1 + truncated_normal(0, 0.1, -0.3, 0.3, n)),
        30, 500
    )
    follow_up['hdl_mg_dl'] = np.clip(
        follow_up['hdl_mg_dl'] + truncated_normal(0, 3, -10, 10, n), 20, 100
    )
    follow_up['ldl_mg_dl'] = np.clip(
        follow_up['ldl_mg_dl'] + truncated_normal(0, 10, -30, 30, n), 50, 200
    )
    follow_up['total_cholesterol_mg_dl'] = (
        follow_up['hdl_mg_dl'] + follow_up['ldl_mg_dl'] + follow_up['triglycerides_mg_dl'] / 5
    )
    
    # Glicemia
    follow_up['fasting_glucose_mg_dl'] = np.clip(
        follow_up['fasting_glucose_mg_dl'] + truncated_normal(0, 5, -20, 30, n),
        60, 300
    )
    
    # Recalcular síndrome metabólica
    is_male = patient_base['sex'].values == 'M'
    
    waist_criteria = np.where(is_male, 
                              follow_up['waist_cm'] >= MS_CRITERIA['waist_male'],
                              follow_up['waist_cm'] >= MS_CRITERIA['waist_female'])
    trig_criteria = follow_up['triglycerides_mg_dl'] >= MS_CRITERIA['triglycerides']
    hdl_criteria = np.where(is_male,
                            follow_up['hdl_mg_dl'] < MS_CRITERIA['hdl_male'],
                            follow_up['hdl_mg_dl'] < MS_CRITERIA['hdl_female'])
    bp_criteria = ((follow_up['systolic_bp'] >= MS_CRITERIA['systolic_bp']) | 
                   (follow_up['diastolic_bp'] >= MS_CRITERIA['diastolic_bp']))
    glucose_criteria = follow_up['fasting_glucose_mg_dl'] >= MS_CRITERIA['glucose']
    
    criteria_count = (waist_criteria.astype(int) + trig_criteria.astype(int) +
                      hdl_criteria.astype(int) + bp_criteria.astype(int) +
                      glucose_criteria.astype(int))
    
    follow_up['has_metabolic_syndrome'] = criteria_count >= 3
    follow_up['criteria_count'] = criteria_count
    
    return follow_up

def generate_dataset(n_patients=5000):
    """Gera dataset completo com pares de visitas."""
    
    print(f"Gerando {n_patients} pacientes sintéticos...")
    
    # Gerar pacientes base
    patient_base = generate_patient_base(n_patients)
    
    # Gerar primeira visita (baseline)
    baseline = generate_clinical_record(patient_base, visit_number=1)
    baseline_with_patient = pd.concat([patient_base, baseline], axis=1)
    baseline_with_patient['visit_number'] = 1
    baseline_with_patient['year'] = 2023
    
    # Gerar intervalo entre visitas (8-24 meses, média 12)
    months_between = truncated_normal(12, 4, 8, 24, n_patients).astype(int)
    
    # Gerar follow-up
    follow_up = generate_follow_up_visit(baseline, patient_base, months_between)
    follow_up_with_patient = pd.concat([patient_base, follow_up], axis=1)
    follow_up_with_patient['visit_number'] = 2
    follow_up_with_patient['year'] = 2024
    follow_up_with_patient['months_since_baseline'] = months_between
    
    # Combinar datasets
    full_dataset = pd.concat([baseline_with_patient, follow_up_with_patient], ignore_index=True)
    
    # Estatísticas
    print("\n=== ESTATÍSTICAS DO DATASET ===")
    print(f"Total de registros: {len(full_dataset)}")
    print(f"Pacientes únicos: {n_patients}")
    print(f"\nDistribuição por sexo:")
    print(patient_base['sex'].value_counts(normalize=True))
    print(f"\nPrevalência de Síndrome Metabólica:")
    print(f"  Baseline: {baseline['has_metabolic_syndrome'].mean()*100:.1f}%")
    print(f"  Follow-up: {follow_up['has_metabolic_syndrome'].mean()*100:.1f}%")
    print(f"\nMédias das variáveis (Baseline):")
    print(f"  IMC: {baseline['bmi'].mean():.1f} ± {baseline['bmi'].std():.1f}")
    print(f"  Cintura: {baseline['waist_cm'].mean():.1f} ± {baseline['waist_cm'].std():.1f} cm")
    print(f"  PA Sistólica: {baseline['systolic_bp'].mean():.0f} ± {baseline['systolic_bp'].std():.0f} mmHg")
    print(f"  Triglicerídeos: {baseline['triglycerides_mg_dl'].mean():.0f} ± {baseline['triglycerides_mg_dl'].std():.0f} mg/dL")
    print(f"  HDL: {baseline['hdl_mg_dl'].mean():.0f} ± {baseline['hdl_mg_dl'].std():.0f} mg/dL")
    print(f"  Glicemia: {baseline['fasting_glucose_mg_dl'].mean():.0f} ± {baseline['fasting_glucose_mg_dl'].std():.0f} mg/dL")
    
    return full_dataset, patient_base, baseline, follow_up

def export_for_ml(baseline, follow_up, output_dir):
    """Exporta dados formatados para treinamento de ML."""
    
    # Features para o modelo
    feature_cols = [
        'bmi', 'waist_cm', 'systolic_bp', 'diastolic_bp',
        'triglycerides_mg_dl', 'hdl_mg_dl', 'ldl_mg_dl',
        'fasting_glucose_mg_dl', 'ast_ul', 'alt_ul', 'ggt_ul'
    ]
    
    # Target: desenvolveu SM no follow-up (não tinha no baseline)
    target = (follow_up['has_metabolic_syndrome'].values.astype(int) - 
              baseline['has_metabolic_syndrome'].values.astype(int))
    target = np.clip(target, 0, 1)  # 1 = desenvolveu, 0 = não desenvolveu
    
    # Para treinar modelo de predição: usar baseline para prever SM no follow-up
    X = baseline[feature_cols].values
    y = follow_up['has_metabolic_syndrome'].values.astype(int)
    
    # Split treino/validação/teste (70/15/15)
    n = len(X)
    indices = np.random.permutation(n)
    train_idx = indices[:int(0.7 * n)]
    val_idx = indices[int(0.7 * n):int(0.85 * n)]
    test_idx = indices[int(0.85 * n):]
    
    # Salvar
    os.makedirs(output_dir, exist_ok=True)
    
    np.save(os.path.join(output_dir, 'X_train.npy'), X[train_idx])
    np.save(os.path.join(output_dir, 'y_train.npy'), y[train_idx])
    np.save(os.path.join(output_dir, 'X_val.npy'), X[val_idx])
    np.save(os.path.join(output_dir, 'y_val.npy'), y[val_idx])
    np.save(os.path.join(output_dir, 'X_test.npy'), X[test_idx])
    np.save(os.path.join(output_dir, 'y_test.npy'), y[test_idx])
    
    # Salvar nomes das features
    with open(os.path.join(output_dir, 'feature_names.json'), 'w') as f:
        json.dump(feature_cols, f)
    
    print(f"\nDados de ML exportados para {output_dir}")
    print(f"  Treino: {len(train_idx)} ({y[train_idx].mean()*100:.1f}% MS)")
    print(f"  Validação: {len(val_idx)} ({y[val_idx].mean()*100:.1f}% MS)")
    print(f"  Teste: {len(test_idx)} ({y[test_idx].mean()*100:.1f}% MS)")
    
    return X, y, feature_cols

def export_for_prisma_seed(patient_base, baseline, follow_up, output_path, n_demo=5):
    """Exporta 5 pacientes demo para o seed.ts do Prisma."""
    
    # Selecionar 5 pacientes representativos
    # 1. Saudável magro (IMC < 22)
    # 2. Obeso com SM
    # 3. Transformação (melhora)
    # 4. Progressão moderada
    # 5. Foco cardíaco
    
    selected = []
    
    # 1. Saudável magro
    mask = (baseline['bmi'] < 22) & (~baseline['has_metabolic_syndrome'])
    if mask.sum() > 0:
        idx = np.where(mask)[0][0]
        selected.append(('Pedro Magro', idx, 'healthy'))
    
    # 2. Obeso com SM severa
    mask = (baseline['bmi'] > 35) & baseline['has_metabolic_syndrome']
    if mask.sum() > 0:
        idx = np.where(mask)[0][0]
        selected.append(('Roberto Obeso', idx, 'obese_ms'))
    
    # 3. Mulher com transformação (SM baseline -> sem SM follow-up)
    mask = (patient_base['sex'] == 'F') & baseline['has_metabolic_syndrome'] & ~follow_up['has_metabolic_syndrome']
    if mask.sum() > 0:
        idx = np.where(mask)[0][0]
        selected.append(('Ana Transformação', idx, 'improvement'))
    else:
        # Fallback: qualquer mulher
        mask = patient_base['sex'] == 'F'
        idx = np.where(mask)[0][0]
        selected.append(('Ana Transformação', idx, 'female'))
    
    # 4. Progressão moderada (sem SM -> com SM)
    mask = ~baseline['has_metabolic_syndrome'] & follow_up['has_metabolic_syndrome']
    if mask.sum() > 0:
        idx = np.where(mask)[0][0]
        selected.append(('Carlos Moderado', idx, 'progression'))
    
    # 5. Mulher com foco cardíaco
    mask = patient_base['sex'] == 'F'
    if mask.sum() > 1:
        idx = np.where(mask)[0][1]
        selected.append(('Lucia Cardíaca', idx, 'cardiac'))
    
    # Gerar TypeScript para seed.ts
    ts_code = "// Dados sintéticos gerados automaticamente\n"
    ts_code += "// Baseado nas distribuições do artigo do Hospital Albert Einstein\n\n"
    ts_code += "export const syntheticPatients = [\n"
    
    for name, idx, profile in selected:
        base = baseline.iloc[idx]
        follow = follow_up.iloc[idx]
        patient = patient_base.iloc[idx]
        
        ts_code += f"  {{\n"
        ts_code += f"    name: '{name}',\n"
        ts_code += f"    sex: '{patient['sex']}',\n"
        ts_code += f"    birthYear: {patient['birth_year']},\n"
        ts_code += f"    records: [\n"
        
        # Baseline (2023)
        ts_code += f"      {{\n"
        ts_code += f"        year: 2023,\n"
        ts_code += f"        heightCm: {base['height_cm']},\n"
        ts_code += f"        weightKg: {base['weight_kg']},\n"
        ts_code += f"        bmi: {base['bmi']:.2f},\n"
        ts_code += f"        waistCm: {base['waist_cm']},\n"
        ts_code += f"        systolicBp: {int(base['systolic_bp'])},\n"
        ts_code += f"        diastolicBp: {int(base['diastolic_bp'])},\n"
        ts_code += f"        triglyceridesMgDl: {int(base['triglycerides_mg_dl'])},\n"
        ts_code += f"        hdlMgDl: {int(base['hdl_mg_dl'])},\n"
        ts_code += f"        ldlMgDl: {int(base['ldl_mg_dl'])},\n"
        ts_code += f"        totalCholesterolMgDl: {int(base['total_cholesterol_mg_dl'])},\n"
        ts_code += f"        fastingGlucoseMgDl: {int(base['fasting_glucose_mg_dl'])},\n"
        ts_code += f"        astUL: {int(base['ast_ul'])},\n"
        ts_code += f"        altUL: {int(base['alt_ul'])},\n"
        ts_code += f"        ggtUL: {int(base['ggt_ul'])},\n"
        ts_code += f"        physicalActivityLevel: '{base['physical_activity_level']}',\n"
        ts_code += f"        smokingStatus: '{base['smoking_status']}',\n"
        ts_code += f"        auditScore: {int(base['audit_score'])},\n"
        ts_code += f"        bdiScore: {int(base['bdi_score'])},\n"
        ts_code += f"        isOnAntihypertensive: {str(base['is_on_antihypertensive']).lower()},\n"
        ts_code += f"        isOnAntidiabetic: {str(base['is_on_antidiabetic']).lower()},\n"
        ts_code += f"        isOnLipidLowering: {str(base['is_on_lipid_lowering']).lower()},\n"
        ts_code += f"        hasMetabolicSyndrome: {str(base['has_metabolic_syndrome']).lower()},\n"
        codes_str = str(base['disease_codes']).replace("'", '"')
        ts_code += f"        diseaseCodes: {codes_str},\n"
        ts_code += f"      }},\n"
        
        # Follow-up (2024)
        ts_code += f"      {{\n"
        ts_code += f"        year: 2024,\n"
        ts_code += f"        heightCm: {follow['height_cm']},\n"
        ts_code += f"        weightKg: {follow['weight_kg']},\n"
        ts_code += f"        bmi: {follow['bmi']:.2f},\n"
        ts_code += f"        waistCm: {follow['waist_cm']},\n"
        ts_code += f"        systolicBp: {int(follow['systolic_bp'])},\n"
        ts_code += f"        diastolicBp: {int(follow['diastolic_bp'])},\n"
        ts_code += f"        triglyceridesMgDl: {int(follow['triglycerides_mg_dl'])},\n"
        ts_code += f"        hdlMgDl: {int(follow['hdl_mg_dl'])},\n"
        ts_code += f"        ldlMgDl: {int(follow['ldl_mg_dl'])},\n"
        ts_code += f"        totalCholesterolMgDl: {int(follow['total_cholesterol_mg_dl'])},\n"
        ts_code += f"        fastingGlucoseMgDl: {int(follow['fasting_glucose_mg_dl'])},\n"
        ts_code += f"        astUL: {int(follow['ast_ul'])},\n"
        ts_code += f"        altUL: {int(follow['alt_ul'])},\n"
        ts_code += f"        ggtUL: {int(follow['ggt_ul'])},\n"
        ts_code += f"        physicalActivityLevel: '{follow['physical_activity_level']}',\n"
        ts_code += f"        smokingStatus: '{follow['smoking_status']}',\n"
        ts_code += f"        auditScore: {int(follow['audit_score'])},\n"
        ts_code += f"        bdiScore: {int(follow['bdi_score'])},\n"
        ts_code += f"        isOnAntihypertensive: {str(follow['is_on_antihypertensive']).lower()},\n"
        ts_code += f"        isOnAntidiabetic: {str(follow['is_on_antidiabetic']).lower()},\n"
        ts_code += f"        isOnLipidLowering: {str(follow['is_on_lipid_lowering']).lower()},\n"
        ts_code += f"        hasMetabolicSyndrome: {str(follow['has_metabolic_syndrome']).lower()},\n"
        codes_str = str(follow['disease_codes']).replace("'", '"')
        ts_code += f"        diseaseCodes: {codes_str},\n"
        ts_code += f"      }},\n"
        
        ts_code += f"    ],\n"
        ts_code += f"  }},\n"
    
    ts_code += "];\n"
    
    with open(output_path, 'w') as f:
        f.write(ts_code)
    
    print(f"\nDados de demo exportados para {output_path}")
    print(f"  Pacientes: {[s[0] for s in selected]}")

if __name__ == '__main__':
    # Gerar dataset
    full_dataset, patient_base, baseline, follow_up = generate_dataset(n_patients=5000)
    
    # Exportar para ML
    ml_dir = '/home/ubuntu/digital_twins/ml_data'
    export_for_ml(baseline, follow_up, ml_dir)
    
    # Exportar pacientes demo para seed
    seed_path = '/home/ubuntu/digital_twins/nextjs_space/scripts/synthetic_patients.ts'
    export_for_prisma_seed(patient_base, baseline, follow_up, seed_path)
    
    # Salvar dataset completo
    full_dataset.to_csv(os.path.join(ml_dir, 'full_synthetic_dataset.csv'), index=False)
    print(f"\nDataset completo salvo em {ml_dir}/full_synthetic_dataset.csv")
