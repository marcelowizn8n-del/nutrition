"""
Cria avatar humano detalhado usando perfis anatômicos precisos.
Baseado em proporções SMPL/SCAPE.
"""
import numpy as np
import trimesh
import json
from pygltflib import GLTF2, Scene, Node, Mesh as GLTFMesh, Primitive, Accessor, BufferView, Buffer, Material

def create_human_body_mesh(height=1.75, weight_factor=0.0, gender='male'):
    """
    Cria mesh humana detalhada usando perfis transversais.
    Inspirado em SMPL mas gerado proceduralmente.
    """
    vertices = []
    faces = []
    
    # Proporções anatômicas (baseadas em estudos antropométricos)
    # Alturas relativas dos segmentos (0=pés, 1=topo cabeça)
    body_segments = [
        # (altura_rel, largura_x, profundidade_z, num_pontos)
        # Pés
        (0.00, 0.08, 0.22, 16),   # Sola do pé
        (0.02, 0.06, 0.12, 16),   # Tornozelo
        
        # Pernas
        (0.05, 0.055, 0.06, 24),  # Tornozelo (base canela)
        (0.15, 0.055, 0.07, 24),  # Meio da canela
        (0.25, 0.065, 0.08, 24),  # Joelho
        (0.30, 0.075, 0.09, 24),  # Acima do joelho
        (0.40, 0.095, 0.10, 24),  # Coxa média
        (0.47, 0.105, 0.11, 24),  # Coxa alta
        
        # Pelve/Quadril
        (0.50, 0.16, 0.10, 32),   # Virilha
        (0.53, 0.17, 0.11, 32),   # Quadril baixo
        (0.56, 0.175, 0.12, 32),  # Quadril
        
        # Abdômen
        (0.58, 0.16, 0.11, 32),   # Abdômen baixo
        (0.62, 0.155, 0.10, 32),  # Abdômen médio
        (0.66, 0.15, 0.095, 32),  # Cintura
        
        # Torso
        (0.70, 0.16, 0.10, 32),   # Costelas baixas
        (0.75, 0.18, 0.105, 32),  # Costelas
        (0.80, 0.20, 0.11, 32),   # Peito baixo
        (0.83, 0.21, 0.115, 32),  # Peito
        (0.86, 0.20, 0.11, 32),   # Peito alto
        
        # Ombros/Pescoço
        (0.88, 0.22, 0.09, 32),   # Base ombros
        (0.90, 0.14, 0.08, 24),   # Ombros/pescoço
        (0.91, 0.065, 0.065, 20), # Pescoço baixo
        (0.93, 0.055, 0.055, 20), # Pescoço médio
        (0.95, 0.05, 0.05, 20),   # Pescoço alto
        
        # Cabeça
        (0.96, 0.06, 0.07, 20),   # Base crânio
        (0.98, 0.075, 0.09, 20),  # Mandíbula
        (1.00, 0.08, 0.095, 20),  # Face
        (1.02, 0.08, 0.10, 20),   # Têmporas
        (1.05, 0.075, 0.095, 20), # Testa
        (1.07, 0.06, 0.08, 16),   # Topo cabeça
        (1.085, 0.03, 0.04, 12),  # Pico cabeça
    ]
    
    # Criar perfis circulares para cada segmento
    current_vertex_index = 0
    
    for i, (h_rel, width_x, depth_z, n_pts) in enumerate(body_segments):
        y = h_rel * height
        
        # Perfil elíptico com variações anatômicas
        for j in range(n_pts):
            angle = 2 * np.pi * j / n_pts
            
            # Elipse base
            x = width_x * np.cos(angle)
            z = depth_z * np.sin(angle)
            
            # Adicionar variação anatômica
            # Costas mais retas (z negativo)
            if z < 0 and 0.55 < h_rel < 0.90:
                z *= 0.85  # Achatar costas
            
            # Barriga mais proeminente
            if z > 0 and 0.56 < h_rel < 0.70:
                belly_factor = 1.0 + weight_factor * 0.3 * np.exp(-((h_rel - 0.62)**2) / 0.01)
                z *= belly_factor
            
            # Peito masculino/feminino
            if z > 0 and 0.78 < h_rel < 0.86:
                chest_factor = 1.05 if gender == 'male' else 1.15
                z *= chest_factor
            
            vertices.append([x, y, z])
        
        # Criar faces conectando com o segmento anterior
        if i > 0:
            prev_n = body_segments[i-1][3]
            curr_n = n_pts
            
            # Conectar segmentos
            for j in range(max(prev_n, curr_n)):
                # Índices dos vértices
                prev_idx = current_vertex_index - prev_n + (j % prev_n)
                curr_idx = current_vertex_index + (j % curr_n)
                next_prev_idx = current_vertex_index - prev_n + ((j + 1) % prev_n)
                next_curr_idx = current_vertex_index + ((j + 1) % curr_n)
                
                # Criar dois triângulos para cada quad
                faces.append([prev_idx, curr_idx, next_curr_idx])
                faces.append([prev_idx, next_curr_idx, next_prev_idx])
        
        current_vertex_index += n_pts
    
    # Fechar topo da cabeça
    top_start = current_vertex_index - body_segments[-1][3]
    top_center = len(vertices)
    vertices.append([0, body_segments[-1][0] * height + 0.01, 0])
    for j in range(body_segments[-1][3]):
        faces.append([top_start + j, top_center, top_start + (j + 1) % body_segments[-1][3]])
    
    # Fechar sola dos pés
    bottom_n = body_segments[0][3]
    bottom_center = len(vertices)
    vertices.append([0, 0, 0.05])  # Centro do pé
    for j in range(bottom_n):
        faces.append([j, (j + 1) % bottom_n, bottom_center])
    
    vertices = np.array(vertices, dtype=np.float32)
    faces = np.array(faces, dtype=np.int32)
    
    return vertices, faces

def add_limbs(base_vertices, base_faces, height=1.75):
    """Adiciona braços e pernas separados ao corpo"""
    all_vertices = list(base_vertices)
    all_faces = list(base_faces)
    
    # Definir braços
    arm_segments = [
        # (dist_x, altura_y, raio, n_pts) - braço esquerdo
        (0.22, 0.88 * height, 0.04, 12),  # Ombro
        (0.28, 0.82 * height, 0.035, 12), # Braço alto
        (0.32, 0.72 * height, 0.032, 12), # Cotovelo
        (0.34, 0.62 * height, 0.028, 12), # Antebraço
        (0.35, 0.54 * height, 0.025, 12), # Pulso
        (0.355, 0.50 * height, 0.03, 10), # Mão
    ]
    
    for side in [-1, 1]:  # Esquerdo e direito
        base_idx = len(all_vertices)
        
        for i, (dist_x, y, radius, n_pts) in enumerate(arm_segments):
            x_center = dist_x * side
            
            for j in range(n_pts):
                angle = 2 * np.pi * j / n_pts
                x = x_center + radius * np.cos(angle) * 0.7
                z = radius * np.sin(angle)
                all_vertices.append([x, y, z])
            
            if i > 0:
                prev_n = arm_segments[i-1][3]
                curr_n = n_pts
                prev_base = base_idx + sum(seg[3] for seg in arm_segments[:i-1])
                curr_base = base_idx + sum(seg[3] for seg in arm_segments[:i])
                
                for j in range(max(prev_n, curr_n)):
                    pi = prev_base + (j % prev_n)
                    ci = curr_base + (j % curr_n)
                    npi = prev_base + ((j + 1) % prev_n)
                    nci = curr_base + ((j + 1) % curr_n)
                    
                    all_faces.append([pi, ci, nci])
                    all_faces.append([pi, nci, npi])
        
        # Fechar mão
        hand_base = base_idx + sum(seg[3] for seg in arm_segments[:-1])
        hand_n = arm_segments[-1][3]
        hand_center = len(all_vertices)
        all_vertices.append([arm_segments[-1][0] * side, arm_segments[-1][1] - 0.02, 0])
        for j in range(hand_n):
            all_faces.append([hand_base + j, hand_center, hand_base + (j + 1) % hand_n])
    
    # Definir pernas separadas
    leg_y_offset = 0.50 * height  # Início das pernas
    leg_segments = [
        (0.085, leg_y_offset, 0.085, 16),        # Virilha
        (0.08, leg_y_offset - 0.15, 0.07, 16),   # Coxa alta
        (0.07, leg_y_offset - 0.30, 0.06, 16),   # Coxa baixa
        (0.05, leg_y_offset - 0.40, 0.055, 14),  # Joelho
        (0.045, leg_y_offset - 0.55, 0.045, 14), # Canela
        (0.04, leg_y_offset - 0.70, 0.04, 12),   # Tornozelo
        (0.035, leg_y_offset - 0.75, 0.08, 10),  # Pé
    ]
    
    for side in [-1, 1]:
        base_idx = len(all_vertices)
        
        for i, (dist_x, y, radius, n_pts) in enumerate(leg_segments):
            x_center = dist_x * side
            
            for j in range(n_pts):
                angle = 2 * np.pi * j / n_pts
                x = x_center + radius * np.cos(angle)
                z = radius * np.sin(angle)
                
                # Pé alongado para frente
                if i == len(leg_segments) - 1:
                    z = z * 0.4 + 0.04  # Achatar e mover para frente
                
                all_vertices.append([x, y, z])
            
            if i > 0:
                prev_n = leg_segments[i-1][3]
                curr_n = n_pts
                prev_base = base_idx + sum(seg[3] for seg in leg_segments[:i-1])
                curr_base = base_idx + sum(seg[3] for seg in leg_segments[:i])
                
                for j in range(max(prev_n, curr_n)):
                    pi = prev_base + (j % prev_n)
                    ci = curr_base + (j % curr_n)
                    npi = prev_base + ((j + 1) % prev_n)
                    nci = curr_base + ((j + 1) % curr_n)
                    
                    all_faces.append([pi, ci, nci])
                    all_faces.append([pi, nci, npi])
        
        # Fechar pé
        foot_base = base_idx + sum(seg[3] for seg in leg_segments[:-1])
        foot_n = leg_segments[-1][3]
        foot_center = len(all_vertices)
        all_vertices.append([leg_segments[-1][0] * side, leg_segments[-1][1] - 0.02, 0.06])
        for j in range(foot_n):
            all_faces.append([foot_base + j, foot_center, foot_base + (j + 1) % foot_n])
    
    return np.array(all_vertices, dtype=np.float32), np.array(all_faces, dtype=np.int32)

def create_high_quality_avatar():
    """Cria avatar de alta qualidade com morph targets"""
    
    print("Criando corpo base...")
    height = 1.75
    base_verts, base_faces = create_human_body_mesh(height=height, weight_factor=0.0)
    
    print(f"Corpo base: {len(base_verts)} vértices")
    
    # Criar mesh com trimesh e subdividir
    mesh = trimesh.Trimesh(vertices=base_verts, faces=base_faces)
    
    # Subdividir para mais detalhes
    for _ in range(2):
        mesh = mesh.subdivide()
    
    # Suavizar
    trimesh.smoothing.filter_laplacian(mesh, lamb=0.5, iterations=5)
    
    vertices = mesh.vertices.astype(np.float32)
    faces = mesh.faces.astype(np.int32)
    
    print(f"Após subdivisão: {len(vertices)} vértices, {len(faces)} faces")
    
    # Centralizar
    vertices[:, 0] -= vertices[:, 0].mean()
    vertices[:, 2] -= vertices[:, 2].mean()
    min_y = vertices[:, 1].min()
    vertices[:, 1] -= min_y
    
    height_actual = vertices[:, 1].max()
    print(f"Altura final: {height_actual:.2f}m")
    
    # Recalcular normais
    mesh_final = trimesh.Trimesh(vertices=vertices, faces=faces)
    mesh_final.fix_normals()
    normals = mesh_final.vertex_normals.astype(np.float32)
    
    # Criar morph targets
    print("Criando morph targets...")
    morph_targets = {}
    
    # Weight
    weight_delta = np.zeros_like(vertices)
    for i, v in enumerate(vertices):
        dx, dz = v[0], v[2]
        dist = np.sqrt(dx**2 + dz**2)
        if dist > 0.01:
            y_norm = v[1] / height_actual
            # Mais efeito no torso
            y_factor = np.exp(-((y_norm - 0.65)**2) / 0.1)
            factor = 0.06 * (0.3 + 0.7 * y_factor)
            weight_delta[i, 0] = dx/dist * factor
            weight_delta[i, 2] = dz/dist * factor
    morph_targets['Weight'] = weight_delta.astype(np.float32)
    
    # AbdomenGirth
    abdomen_delta = np.zeros_like(vertices)
    for i, v in enumerate(vertices):
        y_norm = v[1] / height_actual
        y_factor = np.exp(-((y_norm - 0.62)**2) / 0.02)
        if v[2] > 0:
            front_factor = min(v[2] / 0.08, 1.0)
            abdomen_delta[i, 2] = 0.12 * y_factor * front_factor
    morph_targets['AbdomenGirth'] = abdomen_delta.astype(np.float32)
    
    # MuscleMass
    muscle_delta = np.zeros_like(vertices)
    for i, v in enumerate(vertices):
        y_norm = v[1] / height_actual
        
        # Braços
        if abs(v[0]) > 0.12 and 0.5 < y_norm < 0.9:
            muscle_delta[i, 0] = np.sign(v[0]) * 0.02
        
        # Peito
        if 0.75 < y_norm < 0.88 and v[2] > 0.02:
            muscle_delta[i, 2] += 0.025
        
        # Pernas
        if y_norm < 0.5:
            dist_xz = np.sqrt(v[0]**2 + v[2]**2)
            if dist_xz > 0.03:
                leg_factor = np.exp(-((y_norm - 0.3)**2) / 0.03)
                muscle_delta[i, 0] += v[0]/dist_xz * 0.015 * leg_factor
                muscle_delta[i, 2] += v[2]/dist_xz * 0.015 * leg_factor
    morph_targets['MuscleMass'] = muscle_delta.astype(np.float32)
    
    # Posture
    posture_delta = np.zeros_like(vertices)
    for i, v in enumerate(vertices):
        y_norm = v[1] / height_actual
        if y_norm > 0.85:
            factor = (y_norm - 0.85) / 0.15
            posture_delta[i, 1] = -0.06 * factor**2
            posture_delta[i, 2] = 0.07 * factor
    morph_targets['Posture'] = posture_delta.astype(np.float32)
    
    # Disease effects
    diabetes_delta = weight_delta * 0.3 + abdomen_delta * 0.5
    morph_targets['DiabetesEffect'] = diabetes_delta.astype(np.float32)
    
    hypertension_delta = weight_delta * 0.2 + abdomen_delta * 0.3
    morph_targets['HypertensionEffect'] = hypertension_delta.astype(np.float32)
    
    heart_delta = weight_delta * 0.4 + posture_delta * 0.3
    morph_targets['HeartDiseaseEffect'] = heart_delta.astype(np.float32)
    
    print(f"Criados {len(morph_targets)} morph targets")
    
    # Criar GLB
    print("Exportando GLB...")
    buffer_data = bytearray()
    
    v_offset = len(buffer_data)
    buffer_data.extend(vertices.tobytes())
    
    n_offset = len(buffer_data)
    buffer_data.extend(normals.tobytes())
    
    i_offset = len(buffer_data)
    indices = faces.flatten().astype(np.uint32)
    buffer_data.extend(indices.tobytes())
    
    morph_offsets = {}
    for name, delta in morph_targets.items():
        morph_offsets[name] = len(buffer_data)
        buffer_data.extend(delta.tobytes())
    
    gltf = GLTF2()
    gltf.buffers = [Buffer(byteLength=len(buffer_data))]
    
    bv = []
    ac = []
    
    bv.append(BufferView(buffer=0, byteOffset=v_offset, byteLength=vertices.nbytes, target=34962))
    ac.append(Accessor(bufferView=0, componentType=5126, count=len(vertices), type="VEC3",
                       max=vertices.max(axis=0).tolist(), min=vertices.min(axis=0).tolist()))
    
    bv.append(BufferView(buffer=0, byteOffset=n_offset, byteLength=normals.nbytes, target=34962))
    ac.append(Accessor(bufferView=1, componentType=5126, count=len(normals), type="VEC3"))
    
    bv.append(BufferView(buffer=0, byteOffset=i_offset, byteLength=indices.nbytes, target=34963))
    ac.append(Accessor(bufferView=2, componentType=5125, count=len(indices), type="SCALAR"))
    
    morph_acc = {}
    for name, delta in morph_targets.items():
        bvi = len(bv)
        bv.append(BufferView(buffer=0, byteOffset=morph_offsets[name], byteLength=delta.nbytes, target=34962))
        aci = len(ac)
        ac.append(Accessor(bufferView=bvi, componentType=5126, count=len(delta), type="VEC3",
                           max=delta.max(axis=0).tolist(), min=delta.min(axis=0).tolist()))
        morph_acc[name] = aci
    
    gltf.bufferViews = bv
    gltf.accessors = ac
    
    gltf.materials = [Material(
        pbrMetallicRoughness={
            "baseColorFactor": [0.82, 0.80, 0.78, 1.0],  # Cinza claro
            "metallicFactor": 0.0,
            "roughnessFactor": 0.55
        },
        doubleSided=True
    )]
    
    target_names = list(morph_targets.keys())
    targets = [{"POSITION": morph_acc[n]} for n in target_names]
    
    gltf.meshes = [GLTFMesh(
        primitives=[Primitive(
            attributes={"POSITION": 0, "NORMAL": 1},
            indices=2,
            material=0,
            targets=targets
        )],
        weights=[0.0] * len(morph_targets),
        extras={"targetNames": target_names}
    )]
    
    gltf.nodes = [Node(mesh=0, name="Avatar")]
    gltf.scenes = [Scene(nodes=[0])]
    gltf.scene = 0
    
    gltf.set_binary_blob(bytes(buffer_data))
    
    gltf.save("avatar_morphable.glb")
    print("✓ avatar_morphable.glb")
    
    gltf.meshes[0].weights = [0.0] * len(morph_targets)
    gltf.save("avatar_baseline.glb")
    print("✓ avatar_baseline.glb")
    
    weights = [0.0] * len(morph_targets)
    weights[target_names.index('DiabetesEffect')] = 0.7
    weights[target_names.index('Weight')] = 0.5
    weights[target_names.index('AbdomenGirth')] = 0.6
    gltf.meshes[0].weights = weights
    gltf.save("avatar_clinical.glb")
    print("✓ avatar_clinical.glb")
    
    metadata = {
        "morphTargets": {n: {"index": i, "range": [0, 1]} for i, n in enumerate(target_names)},
        "vertexCount": len(vertices),
        "faceCount": len(faces),
        "height": float(height_actual),
        "source": "Procedural Anatomic Model v2"
    }
    with open("avatar_metadata.json", "w") as f:
        json.dump(metadata, f, indent=2)
    print("✓ avatar_metadata.json")
    
    print(f"\n✅ Modelo criado: {len(vertices)} vértices, {len(faces)} faces")

if __name__ == "__main__":
    create_high_quality_avatar()
