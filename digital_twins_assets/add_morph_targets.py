"""
Adiciona morph targets clínicos a modelos GLB existentes.
"""
import numpy as np
from pygltflib import GLTF2, Accessor, BufferView
import struct

def add_morph_targets_to_glb(input_path, output_path, model_name):
    print(f"\n{'='*50}")
    print(f"Processando: {model_name}")
    print(f"{'='*50}")
    
    # Carregar GLB
    gltf = GLTF2().load(input_path)
    
    # Obter dados binários
    binary_blob = gltf.binary_blob()
    
    # Obter accessor de posições
    primitive = gltf.meshes[0].primitives[0]
    pos_accessor_idx = primitive.attributes.POSITION
    pos_accessor = gltf.accessors[pos_accessor_idx]
    pos_buffer_view = gltf.bufferViews[pos_accessor.bufferView]
    
    # Extrair vértices
    start = pos_buffer_view.byteOffset + (pos_accessor.byteOffset or 0)
    count = pos_accessor.count
    vertices = np.frombuffer(binary_blob[start:start + count * 12], dtype=np.float32).reshape(-1, 3)
    
    print(f"  Vértices: {len(vertices):,}")
    
    # Calcular bounds
    y_min, y_max = vertices[:, 1].min(), vertices[:, 1].max()
    height = y_max - y_min
    print(f"  Altura: {height:.3f}m")
    
    # Escala de deformação (5cm base)
    SCALE = 0.05
    
    # Criar morph targets
    morph_targets = {}
    n_verts = len(vertices)
    
    # 1. Weight - expansão geral do corpo
    print("  Criando morph target: Weight")
    weight = np.zeros((n_verts, 3), dtype=np.float32)
    for i, v in enumerate(vertices):
        y_norm = (v[1] - y_min) / (y_max - y_min)
        if 0.1 < y_norm < 0.95:
            dist = np.sqrt(v[0]**2 + v[2]**2)
            if dist > 0.02:
                direction = np.array([v[0], 0, v[2]])
                norm = np.linalg.norm(direction)
                if norm > 0:
                    direction = direction / norm
                    # Mais efeito no torso
                    factor = 1.5 if 0.4 < y_norm < 0.8 else 1.0
                    weight[i] = direction * SCALE * factor
    morph_targets['Weight'] = weight
    
    # 2. AbdomenGirth - expansão do abdômen
    print("  Criando morph target: AbdomenGirth")
    abdomen = np.zeros((n_verts, 3), dtype=np.float32)
    for i, v in enumerate(vertices):
        y_norm = (v[1] - y_min) / (y_max - y_min)
        if 0.4 < y_norm < 0.75:
            dist = np.sqrt(v[0]**2 + v[2]**2)
            if dist > 0.02:
                direction = np.array([v[0], 0, v[2]])
                norm = np.linalg.norm(direction)
                if norm > 0:
                    direction = direction / norm
                    # Mais efeito na frente
                    front_factor = 1.0 + 0.8 * max(0, v[2] / (abs(v[2]) + 0.01))
                    # Curva gaussiana centrada no umbigo
                    y_factor = np.exp(-((y_norm - 0.55)**2) / 0.02)
                    abdomen[i] = direction * SCALE * 2.5 * front_factor * y_factor
    morph_targets['AbdomenGirth'] = abdomen
    
    # 3. MuscleMass - expansão dos músculos
    print("  Criando morph target: MuscleMass")
    muscle = np.zeros((n_verts, 3), dtype=np.float32)
    for i, v in enumerate(vertices):
        y_norm = (v[1] - y_min) / (y_max - y_min)
        dist = np.sqrt(v[0]**2 + v[2]**2)
        if dist > 0.02:
            direction = np.array([v[0], 0, v[2]])
            norm = np.linalg.norm(direction)
            if norm > 0:
                direction = direction / norm
                # Peito e ombros
                if 0.70 < y_norm < 0.90:
                    muscle[i] = direction * SCALE * 1.2
                # Braços (longe do centro)
                elif abs(v[0]) > 0.12:
                    muscle[i] = direction * SCALE * 0.8
                # Pernas
                elif 0.05 < y_norm < 0.45:
                    muscle[i] = direction * SCALE * 0.6
    morph_targets['MuscleMass'] = muscle
    
    # 4. Posture - inclinação para frente
    print("  Criando morph target: Posture")
    posture = np.zeros((n_verts, 3), dtype=np.float32)
    for i, v in enumerate(vertices):
        y_norm = (v[1] - y_min) / (y_max - y_min)
        if 0.5 < y_norm < 1.0:
            forward_lean = (y_norm - 0.5) * 0.15
            posture[i] = [0, -forward_lean * SCALE * 0.5, forward_lean * SCALE]
    morph_targets['Posture'] = posture
    
    # 5-7. Efeitos de doenças (compostos)
    print("  Criando morph targets de doenças...")
    morph_targets['DiabetesEffect'] = weight * 0.6 + abdomen * 1.0
    morph_targets['HypertensionEffect'] = weight * 0.4 + abdomen * 0.5
    morph_targets['HeartDiseaseEffect'] = weight * 0.3 + posture * 0.8
    
    # Lista ordenada de morph targets
    target_names = ['Weight', 'AbdomenGirth', 'MuscleMass', 'Posture', 
                    'DiabetesEffect', 'HypertensionEffect', 'HeartDiseaseEffect']
    
    # Criar bytes dos morph targets
    morph_bytes = b''
    for name in target_names:
        morph_bytes += morph_targets[name].astype(np.float32).tobytes()
    
    # Adicionar ao buffer existente
    new_binary = binary_blob + morph_bytes
    
    # Atualizar tamanho do buffer
    gltf.buffers[0].byteLength = len(new_binary)
    
    # Criar BufferViews e Accessors para cada morph target
    offset = len(binary_blob)
    morph_target_accessors = []
    
    for i, name in enumerate(target_names):
        mt_data = morph_targets[name]
        byte_length = len(mt_data.tobytes())
        
        # BufferView
        bv_idx = len(gltf.bufferViews)
        gltf.bufferViews.append(BufferView(
            buffer=0,
            byteOffset=offset,
            byteLength=byte_length,
            target=34962  # ARRAY_BUFFER
        ))
        
        # Accessor
        acc_idx = len(gltf.accessors)
        gltf.accessors.append(Accessor(
            bufferView=bv_idx,
            byteOffset=0,
            componentType=5126,  # FLOAT
            count=len(mt_data),
            type='VEC3',
            max=mt_data.max(axis=0).tolist(),
            min=mt_data.min(axis=0).tolist()
        ))
        
        morph_target_accessors.append(acc_idx)
        offset += byte_length
    
    # Adicionar targets à primitive
    gltf.meshes[0].primitives[0].targets = [
        {'POSITION': idx} for idx in morph_target_accessors
    ]
    
    # Adicionar weights iniciais
    gltf.meshes[0].weights = [0.0] * len(target_names)
    
    # Adicionar nomes dos targets como extras
    gltf.meshes[0].extras = {'targetNames': target_names}
    
    # Salvar
    gltf.set_binary_blob(new_binary)
    gltf.save(output_path)
    
    print(f"\n  ✅ Salvo: {output_path}")
    print(f"  Morph targets: {target_names}")
    
    # Verificar
    verify = GLTF2().load(output_path)
    targets = verify.meshes[0].primitives[0].targets
    print(f"  Verificação: {len(targets)} morph targets adicionados")

# Processar ambos os modelos
add_morph_targets_to_glb(
    "/home/ubuntu/Uploads/man_basic_shaded.glb",
    "/home/ubuntu/digital_twins/nextjs_space/public/models/avatar_morphable.glb",
    "Modelo Masculino"
)

add_morph_targets_to_glb(
    "/home/ubuntu/Uploads/woman_basic_shaded.glb",
    "/home/ubuntu/digital_twins/nextjs_space/public/models/avatar_female.glb",
    "Modelo Feminino"
)

print("\n" + "="*50)
print("CONCLUÍDO! Ambos os modelos agora têm 7 morph targets.")
print("="*50)
