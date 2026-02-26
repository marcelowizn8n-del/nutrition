"""
Cria avatar humano com geometria corrigida na região da virilha.
Resolve o problema de geometria quebrada entre as pernas.
"""
import numpy as np
import trimesh
import json
from pygltflib import GLTF2, Scene, Node, Mesh as GLTFMesh, Primitive, Accessor, BufferView, Buffer, Material, PbrMetallicRoughness

def create_cylinder_segment(center, radius_x, radius_z, height, n_radial=24, n_height=4):
    """Cria um segmento cilíndrico elíptico"""
    vertices = []
    for h in range(n_height + 1):
        y = center[1] + (h / n_height - 0.5) * height
        for r in range(n_radial):
            angle = 2 * np.pi * r / n_radial
            x = center[0] + radius_x * np.cos(angle)
            z = center[2] + radius_z * np.sin(angle)
            vertices.append([x, y, z])
    return np.array(vertices)

def create_torso_mesh(height=1.75):
    """Cria o torso (sem pernas)"""
    vertices = []
    
    # Perfis do torso - começa na altura da virilha (aumentado para mais detalhes)
    torso_profiles = [
        # (altura_rel, largura_x, profundidade_z, n_pts)
        (0.50, 0.16, 0.10, 48),   # Base (virilha) - mais largo para acomodar pernas
        (0.51, 0.165, 0.105, 48), # Transição virilha
        (0.53, 0.17, 0.11, 48),   # Quadril baixo
        (0.55, 0.173, 0.115, 48), # Quadril
        (0.56, 0.175, 0.12, 48),  # Quadril
        (0.57, 0.17, 0.115, 48),  # Transição
        (0.58, 0.16, 0.11, 48),   # Abdômen baixo
        (0.60, 0.158, 0.105, 48), # Abdômen
        (0.62, 0.155, 0.10, 48),  # Abdômen médio
        (0.64, 0.152, 0.098, 48), # Abdômen
        (0.66, 0.15, 0.095, 48),  # Cintura
        (0.68, 0.155, 0.098, 48), # Cintura alta
        (0.70, 0.16, 0.10, 48),   # Costelas baixas
        (0.72, 0.17, 0.102, 48),  # Costelas
        (0.75, 0.18, 0.105, 48),  # Costelas
        (0.77, 0.19, 0.108, 48),  # Costelas altas
        (0.80, 0.20, 0.11, 48),   # Peito baixo
        (0.82, 0.205, 0.112, 48), # Peito
        (0.83, 0.21, 0.115, 48),  # Peito
        (0.85, 0.205, 0.112, 48), # Peito alto
        (0.86, 0.20, 0.11, 48),   # Peito alto
        (0.87, 0.21, 0.10, 48),   # Ombros
        (0.88, 0.22, 0.09, 48),   # Base ombros
        (0.89, 0.18, 0.085, 40),  # Transição
        (0.90, 0.14, 0.08, 36),   # Ombros/pescoço
        (0.905, 0.10, 0.07, 32),  # Transição
        (0.91, 0.065, 0.065, 28), # Pescoço baixo
        (0.92, 0.06, 0.06, 28),   # Pescoço
        (0.93, 0.055, 0.055, 28), # Pescoço médio
        (0.94, 0.052, 0.052, 28), # Pescoço
        (0.95, 0.05, 0.05, 28),   # Pescoço alto
        (0.955, 0.055, 0.06, 28), # Base crânio
        (0.96, 0.06, 0.07, 28),   # Base crânio
        (0.97, 0.07, 0.08, 28),   # Mandíbula
        (0.98, 0.075, 0.09, 28),  # Mandíbula
        (0.99, 0.078, 0.092, 28), # Face
        (1.00, 0.08, 0.095, 28),  # Face
        (1.01, 0.08, 0.098, 28),  # Face
        (1.02, 0.08, 0.10, 28),   # Têmporas
        (1.03, 0.078, 0.098, 28), # Têmporas
        (1.05, 0.075, 0.095, 28), # Testa
        (1.06, 0.07, 0.088, 24),  # Topo cabeça
        (1.07, 0.06, 0.08, 20),   # Topo cabeça
        (1.08, 0.04, 0.05, 16),   # Pico
        (1.085, 0.02, 0.03, 12),  # Pico cabeça
    ]
    
    faces = []
    current_idx = 0
    
    for i, (h_rel, width_x, depth_z, n_pts) in enumerate(torso_profiles):
        y = h_rel * height
        
        for j in range(n_pts):
            angle = 2 * np.pi * j / n_pts
            x = width_x * np.cos(angle)
            z = depth_z * np.sin(angle)
            
            # Achatar costas
            if z < 0 and 0.55 < h_rel < 0.90:
                z *= 0.85
            
            vertices.append([x, y, z])
        
        # Conectar com perfil anterior
        if i > 0:
            prev_n = torso_profiles[i-1][3]
            curr_n = n_pts
            
            for j in range(max(prev_n, curr_n)):
                prev_idx = current_idx - prev_n + (j % prev_n)
                curr_idx_v = current_idx + (j % curr_n)
                next_prev = current_idx - prev_n + ((j + 1) % prev_n)
                next_curr = current_idx + ((j + 1) % curr_n)
                
                faces.append([prev_idx, curr_idx_v, next_curr])
                faces.append([prev_idx, next_curr, next_prev])
        
        current_idx += n_pts
    
    # Fechar topo
    top_n = torso_profiles[-1][3]
    top_start = current_idx - top_n
    top_center = len(vertices)
    vertices.append([0, torso_profiles[-1][0] * height + 0.01, 0])
    for j in range(top_n):
        faces.append([top_start + j, top_center, top_start + (j + 1) % top_n])
    
    return np.array(vertices), np.array(faces)

def create_leg_mesh(height=1.75, side='left'):
    """Cria uma perna separada"""
    vertices = []
    faces = []
    
    # Offset lateral para a perna
    x_offset = -0.08 if side == 'left' else 0.08
    
    # Perfis da perna (mais detalhados)
    leg_profiles = [
        # (altura_rel, raio_x, raio_z, n_pts)
        (0.00, 0.08, 0.22, 24),   # Pé (sola)
        (0.01, 0.06, 0.15, 24),   # Pé
        (0.02, 0.055, 0.10, 24),  # Tornozelo
        (0.03, 0.048, 0.06, 28),  # Tornozelo
        (0.05, 0.045, 0.05, 28),  # Canela baixa
        (0.08, 0.044, 0.052, 28), # Canela
        (0.12, 0.045, 0.054, 28), # Canela
        (0.15, 0.045, 0.055, 28), # Canela média
        (0.18, 0.048, 0.056, 28), # Canela
        (0.22, 0.052, 0.058, 28), # Pré-joelho
        (0.25, 0.055, 0.06, 32),  # Joelho
        (0.27, 0.058, 0.062, 32), # Joelho
        (0.30, 0.06, 0.065, 32),  # Acima joelho
        (0.33, 0.065, 0.07, 32),  # Coxa baixa
        (0.36, 0.07, 0.075, 32),  # Coxa
        (0.38, 0.075, 0.08, 32),  # Coxa média
        (0.40, 0.08, 0.085, 32),  # Coxa
        (0.42, 0.082, 0.088, 32), # Coxa
        (0.45, 0.085, 0.09, 32),  # Coxa alta
        (0.47, 0.082, 0.088, 32), # Virilha
        (0.48, 0.075, 0.082, 32), # Virilha (mais fino para encaixar)
    ]
    
    current_idx = 0
    
    for i, (h_rel, rx, rz, n_pts) in enumerate(leg_profiles):
        y = h_rel * height
        
        for j in range(n_pts):
            angle = 2 * np.pi * j / n_pts
            x = x_offset + rx * np.cos(angle)
            z = rz * np.sin(angle)
            
            # Na virilha, inclinar para dentro
            if h_rel > 0.40:
                # Aproximar do centro na parte superior
                inward_factor = (h_rel - 0.40) / 0.10
                if side == 'left':
                    x = x + inward_factor * 0.02  # Mover para direita
                else:
                    x = x - inward_factor * 0.02  # Mover para esquerda
            
            vertices.append([x, y, z])
        
        if i > 0:
            prev_n = leg_profiles[i-1][3]
            curr_n = n_pts
            
            for j in range(max(prev_n, curr_n)):
                prev_idx = current_idx - prev_n + (j % prev_n)
                curr_idx_v = current_idx + (j % curr_n)
                next_prev = current_idx - prev_n + ((j + 1) % prev_n)
                next_curr = current_idx + ((j + 1) % curr_n)
                
                faces.append([prev_idx, curr_idx_v, next_curr])
                faces.append([prev_idx, next_curr, next_prev])
        
        current_idx += n_pts
    
    # Fechar sola do pé
    bottom_n = leg_profiles[0][3]
    bottom_center = len(vertices)
    vertices.append([x_offset, 0, 0.05])
    for j in range(bottom_n):
        faces.append([j, (j + 1) % bottom_n, bottom_center])
    
    return np.array(vertices), np.array(faces)

def create_arm_mesh(height=1.75, side='left'):
    """Cria um braço"""
    vertices = []
    faces = []
    
    x_sign = -1 if side == 'left' else 1
    
    # Perfis do braço (de cima para baixo - mais detalhados)
    arm_profiles = [
        # (dist_x, altura_rel, raio, n_pts)
        (0.22, 0.88, 0.04, 20),   # Ombro
        (0.24, 0.85, 0.038, 20),  # Ombro/braço
        (0.26, 0.82, 0.036, 20),  # Braço alto
        (0.28, 0.78, 0.035, 20),  # Braço
        (0.30, 0.74, 0.034, 20),  # Braço
        (0.32, 0.70, 0.032, 20),  # Cotovelo
        (0.33, 0.66, 0.030, 20),  # Cotovelo
        (0.34, 0.62, 0.028, 20),  # Antebraço
        (0.345, 0.58, 0.026, 18), # Antebraço
        (0.35, 0.54, 0.025, 18),  # Antebraço
        (0.352, 0.52, 0.024, 16), # Pulso
        (0.355, 0.50, 0.026, 16), # Mão
        (0.36, 0.48, 0.028, 14),  # Mão
    ]
    
    current_idx = 0
    
    for i, (dist_x, h_rel, radius, n_pts) in enumerate(arm_profiles):
        y = h_rel * height
        x_center = x_sign * dist_x
        
        for j in range(n_pts):
            angle = 2 * np.pi * j / n_pts
            x = x_center + radius * np.cos(angle)
            z = radius * np.sin(angle)
            vertices.append([x, y, z])
        
        if i > 0:
            prev_n = arm_profiles[i-1][3]
            curr_n = n_pts
            
            for j in range(max(prev_n, curr_n)):
                prev_idx = current_idx - prev_n + (j % prev_n)
                curr_idx_v = current_idx + (j % curr_n)
                next_prev = current_idx - prev_n + ((j + 1) % prev_n)
                next_curr = current_idx + ((j + 1) % curr_n)
                
                faces.append([prev_idx, curr_idx_v, next_curr])
                faces.append([prev_idx, next_curr, next_prev])
        
        current_idx += n_pts
    
    # Fechar mão
    hand_n = arm_profiles[-1][3]
    hand_start = current_idx - hand_n
    hand_center = len(vertices)
    vertices.append([x_sign * arm_profiles[-1][0], arm_profiles[-1][1] * height - 0.02, 0])
    for j in range(hand_n):
        faces.append([hand_start + j, hand_center, hand_start + (j + 1) % hand_n])
    
    return np.array(vertices), np.array(faces)

def create_crotch_bridge(height=1.75):
    """Cria a ponte entre as pernas (região da virilha)"""
    vertices = []
    faces = []
    
    # Criar uma superfície que conecta as duas pernas
    n_points = 12
    crotch_height = 0.48 * height
    depth = 0.06
    
    # Pontos na frente
    for i in range(n_points):
        t = i / (n_points - 1)
        x = -0.06 + t * 0.12  # De perna esquerda para direita
        y = crotch_height + 0.02 * np.sin(np.pi * t)  # Leve curva para cima no meio
        z = depth
        vertices.append([x, y, z])
    
    # Pontos atrás
    for i in range(n_points):
        t = i / (n_points - 1)
        x = -0.06 + t * 0.12
        y = crotch_height + 0.02 * np.sin(np.pi * t)
        z = -depth * 0.5
        vertices.append([x, y, z])
    
    # Conectar frente e trás
    for i in range(n_points - 1):
        # Quad entre frente e trás
        faces.append([i, i + 1, n_points + i + 1])
        faces.append([i, n_points + i + 1, n_points + i])
    
    return np.array(vertices), np.array(faces)

def merge_meshes(meshes):
    """Combina múltiplas meshes em uma só"""
    all_vertices = []
    all_faces = []
    vertex_offset = 0
    
    for verts, fcs in meshes:
        all_vertices.extend(verts.tolist())
        all_faces.extend((fcs + vertex_offset).tolist())
        vertex_offset += len(verts)
    
    return np.array(all_vertices, dtype=np.float32), np.array(all_faces, dtype=np.int32)

def smooth_mesh(vertices, faces, iterations=3):
    """Aplica suavização Laplaciana"""
    mesh = trimesh.Trimesh(vertices=vertices, faces=faces)
    trimesh.smoothing.filter_laplacian(mesh, iterations=iterations)
    return mesh.vertices, mesh.faces

def create_morph_targets(vertices, height=1.75):
    """Cria morph targets para deformações clínicas"""
    n_verts = len(vertices)
    SCALE = 0.05  # 5cm de deslocamento máximo
    
    morph_targets = {}
    
    # Calcular centro e bounds
    y_min, y_max = vertices[:, 1].min(), vertices[:, 1].max()
    
    # 1. Weight - aumento geral do corpo
    weight = np.zeros((n_verts, 3), dtype=np.float32)
    for i, v in enumerate(vertices):
        y_norm = (v[1] - y_min) / (y_max - y_min)
        
        # Mais efeito no torso e pernas
        if 0.2 < y_norm < 0.9:
            dist_from_center = np.sqrt(v[0]**2 + v[2]**2)
            if dist_from_center > 0.02:
                direction = np.array([v[0], 0, v[2]])
                direction = direction / (np.linalg.norm(direction) + 1e-6)
                
                # Fator baseado na altura
                factor = 1.0
                if 0.5 < y_norm < 0.7:  # Abdômen
                    factor = 1.5
                elif 0.3 < y_norm < 0.5:  # Coxas
                    factor = 1.2
                
                weight[i] = direction * SCALE * factor
    
    morph_targets['Weight'] = weight
    
    # 2. AbdomenGirth - circunferência abdominal
    abdomen = np.zeros((n_verts, 3), dtype=np.float32)
    for i, v in enumerate(vertices):
        y_norm = (v[1] - y_min) / (y_max - y_min)
        
        if 0.5 < y_norm < 0.75:
            dist = np.sqrt(v[0]**2 + v[2]**2)
            if dist > 0.02:
                # Foco no abdômen frontal
                direction = np.array([v[0], 0, v[2]])
                direction = direction / (np.linalg.norm(direction) + 1e-6)
                
                # Mais efeito na frente
                front_factor = 1.0 + 0.5 * max(0, v[2] / (abs(v[2]) + 0.01))
                
                # Gaussiana centrada no abdômen
                y_factor = np.exp(-((y_norm - 0.62)**2) / 0.01)
                
                abdomen[i] = direction * SCALE * 1.5 * front_factor * y_factor
    
    morph_targets['AbdomenGirth'] = abdomen
    
    # 3. MuscleMass - massa muscular
    muscle = np.zeros((n_verts, 3), dtype=np.float32)
    for i, v in enumerate(vertices):
        y_norm = (v[1] - y_min) / (y_max - y_min)
        dist = np.sqrt(v[0]**2 + v[2]**2)
        
        if dist > 0.02:
            direction = np.array([v[0], 0, v[2]])
            direction = direction / (np.linalg.norm(direction) + 1e-6)
            
            # Braços e peito
            if 0.75 < y_norm < 0.90 or abs(v[0]) > 0.15:
                muscle[i] = direction * SCALE * 0.8
            # Pernas
            elif 0.1 < y_norm < 0.45:
                muscle[i] = direction * SCALE * 0.6
    
    morph_targets['MuscleMass'] = muscle
    
    # 4. Posture - postura
    posture = np.zeros((n_verts, 3), dtype=np.float32)
    for i, v in enumerate(vertices):
        y_norm = (v[1] - y_min) / (y_max - y_min)
        
        if 0.5 < y_norm < 0.95:
            # Inclinação para frente na parte superior
            forward_lean = (y_norm - 0.5) * 0.1
            posture[i] = [0, 0, forward_lean * SCALE]
    
    morph_targets['Posture'] = posture
    
    # 5-7. Efeitos de doenças (combinam os anteriores)
    morph_targets['DiabetesEffect'] = weight * 0.5 + abdomen * 0.8
    morph_targets['HypertensionEffect'] = weight * 0.3 + abdomen * 0.4
    morph_targets['HeartDiseaseEffect'] = weight * 0.2 + posture * 0.5
    
    return morph_targets

def export_to_glb(vertices, faces, morph_targets, output_path):
    """Exporta para GLB com morph targets"""
    # Calcular normais
    mesh = trimesh.Trimesh(vertices=vertices, faces=faces)
    mesh.fix_normals()
    normals = mesh.vertex_normals.astype(np.float32)
    
    # Criar buffers
    vertices_bytes = vertices.astype(np.float32).tobytes()
    normals_bytes = normals.astype(np.float32).tobytes()
    faces_bytes = faces.astype(np.uint32).flatten().tobytes()
    
    # Buffer para morph targets
    morph_bytes = b''
    morph_target_list = list(morph_targets.keys())
    for name in morph_target_list:
        morph_bytes += morph_targets[name].astype(np.float32).tobytes()
    
    # Buffer total
    total_buffer = vertices_bytes + normals_bytes + faces_bytes + morph_bytes
    
    # Criar GLTF
    gltf = GLTF2(
        asset={'version': '2.0', 'generator': 'Digital Twins Avatar Generator'},
        buffers=[Buffer(byteLength=len(total_buffer))],
        bufferViews=[],
        accessors=[],
        meshes=[],
        nodes=[],
        scenes=[],
        scene=0,
        materials=[]
    )
    
    # Buffer views e accessors
    offset = 0
    
    # Vertices
    gltf.bufferViews.append(BufferView(buffer=0, byteOffset=offset, byteLength=len(vertices_bytes), target=34962))
    gltf.accessors.append(Accessor(
        bufferView=0, byteOffset=0, componentType=5126,
        count=len(vertices), type='VEC3',
        max=vertices.max(axis=0).tolist(),
        min=vertices.min(axis=0).tolist()
    ))
    offset += len(vertices_bytes)
    
    # Normals
    gltf.bufferViews.append(BufferView(buffer=0, byteOffset=offset, byteLength=len(normals_bytes), target=34962))
    gltf.accessors.append(Accessor(bufferView=1, byteOffset=0, componentType=5126, count=len(normals), type='VEC3'))
    offset += len(normals_bytes)
    
    # Faces
    gltf.bufferViews.append(BufferView(buffer=0, byteOffset=offset, byteLength=len(faces_bytes), target=34963))
    gltf.accessors.append(Accessor(bufferView=2, byteOffset=0, componentType=5125, count=len(faces) * 3, type='SCALAR'))
    offset += len(faces_bytes)
    
    # Morph targets
    morph_accessor_indices = []
    for i, name in enumerate(morph_target_list):
        mt_data = morph_targets[name]
        mt_bytes_len = len(mt_data.tobytes())
        
        gltf.bufferViews.append(BufferView(buffer=0, byteOffset=offset, byteLength=mt_bytes_len, target=34962))
        gltf.accessors.append(Accessor(
            bufferView=3 + i, byteOffset=0, componentType=5126,
            count=len(mt_data), type='VEC3',
            max=mt_data.max(axis=0).tolist(),
            min=mt_data.min(axis=0).tolist()
        ))
        morph_accessor_indices.append(3 + i)
        offset += mt_bytes_len
    
    # Material
    gltf.materials.append(Material(
        pbrMetallicRoughness=PbrMetallicRoughness(
            baseColorFactor=[0.91, 0.89, 0.88, 1.0],
            metallicFactor=0.0,
            roughnessFactor=0.7
        ),
        doubleSided=True
    ))
    
    # Mesh com morph targets
    targets = [{'POSITION': idx} for idx in morph_accessor_indices]
    
    gltf.meshes.append(GLTFMesh(
        primitives=[Primitive(
            attributes={'POSITION': 0, 'NORMAL': 1},
            indices=2,
            material=0,
            targets=targets
        )],
        weights=[0.0] * len(morph_target_list),
        extras={'targetNames': morph_target_list}
    ))
    
    # Node e Scene
    gltf.nodes.append(Node(mesh=0))
    gltf.scenes.append(Scene(nodes=[0]))
    
    # Salvar
    gltf.set_binary_blob(total_buffer)
    gltf.save(output_path)
    
    return morph_target_list

def main():
    print("Criando avatar com geometria corrigida...")
    
    HEIGHT = 1.75  # metros
    
    # Criar partes separadas
    print("  - Criando torso...")
    torso_v, torso_f = create_torso_mesh(HEIGHT)
    
    print("  - Criando perna esquerda...")
    leg_l_v, leg_l_f = create_leg_mesh(HEIGHT, 'left')
    
    print("  - Criando perna direita...")
    leg_r_v, leg_r_f = create_leg_mesh(HEIGHT, 'right')
    
    print("  - Criando braço esquerdo...")
    arm_l_v, arm_l_f = create_arm_mesh(HEIGHT, 'left')
    
    print("  - Criando braço direito...")
    arm_r_v, arm_r_f = create_arm_mesh(HEIGHT, 'right')
    
    print("  - Criando ponte da virilha...")
    crotch_v, crotch_f = create_crotch_bridge(HEIGHT)
    
    # Combinar todas as partes
    print("  - Combinando meshes...")
    all_vertices, all_faces = merge_meshes([
        (torso_v, torso_f),
        (leg_l_v, leg_l_f),
        (leg_r_v, leg_r_f),
        (arm_l_v, arm_l_f),
        (arm_r_v, arm_r_f),
        (crotch_v, crotch_f),
    ])
    
    # Criar mesh e aplicar operações
    print("  - Processando mesh...")
    mesh = trimesh.Trimesh(vertices=all_vertices, faces=all_faces)
    
    # Remover duplicatas e corrigir normais
    mesh.merge_vertices()
    mesh.update_faces(mesh.nondegenerate_faces())
    mesh.update_faces(mesh.unique_faces())
    mesh.fix_normals()
    
    # Suavização
    print("  - Aplicando suavização...")
    trimesh.smoothing.filter_laplacian(mesh, iterations=2)
    
    vertices = np.array(mesh.vertices, dtype=np.float32)
    faces = np.array(mesh.faces, dtype=np.int32)
    
    print(f"  - Vértices: {len(vertices)}, Faces: {len(faces)}")
    
    # Criar morph targets
    print("  - Criando morph targets...")
    morph_targets = create_morph_targets(vertices, HEIGHT)
    
    # Exportar
    print("  - Exportando GLB...")
    output_path = '/home/ubuntu/digital_twins/nextjs_space/public/models/avatar_morphable.glb'
    target_names = export_to_glb(vertices, faces, morph_targets, output_path)
    
    # Metadata
    metadata = {
        'morphTargets': {name: {'index': i, 'range': [0, 1]} for i, name in enumerate(target_names)},
        'vertexCount': len(vertices),
        'faceCount': len(faces),
        'height': HEIGHT,
        'generator': 'create_fixed_avatar.py'
    }
    
    with open('/home/ubuntu/digital_twins/nextjs_space/public/models/avatar_metadata.json', 'w') as f:
        json.dump(metadata, f, indent=2)
    
    print(f"\n✅ Avatar criado com sucesso!")
    print(f"   - Arquivo: {output_path}")
    print(f"   - Vértices: {len(vertices)}")
    print(f"   - Faces: {len(faces)}")
    print(f"   - Morph targets: {target_names}")

if __name__ == '__main__':
    main()
