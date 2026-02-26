"""
Cria avatar humano com geometria de virilha corrigida.
Usa approach de "calça" - uma única mesh para as pernas unidas no topo.
"""
import numpy as np
import trimesh
import json
from pygltflib import GLTF2, Scene, Node, Mesh as GLTFMesh, Primitive, Accessor, BufferView, Buffer, Material, PbrMetallicRoughness

def create_full_body_mesh(height=1.75, gender='male'):
    """
    Cria mesh humana com geometria correta na virilha.
    Usa approach de "calça" onde as pernas são unidas suavemente.
    """
    vertices = []
    faces = []
    
    # ===== DEFINIÇÃO DOS PERFIS =====
    # Cada perfil: (altura_rel, pontos_do_perfil)
    # pontos_do_perfil: lista de (x, z) definindo o contorno
    
    N_RADIAL = 48  # Resolução circular
    
    def ellipse_points(width_x, depth_z, n=N_RADIAL, y=0):
        """Gera pontos de uma elipse"""
        pts = []
        for i in range(n):
            angle = 2 * np.pi * i / n
            x = width_x * np.cos(angle)
            z = depth_z * np.sin(angle)
            pts.append([x, y, z])
        return pts
    
    def pants_profile(y, leg_sep=0.08, leg_radius=0.07, hip_width=0.16, crotch_depth=0.08):
        """
        Gera perfil em forma de "calça" (duas pernas unidas).
        Retorna lista de pontos (x, z) formando o contorno.
        """
        pts = []
        n_per_leg = 24
        n_bridge = 12
        
        # Perna esquerda (semicírculo externo)
        for i in range(n_per_leg):
            angle = np.pi/2 + np.pi * i / (n_per_leg - 1)  # 90° a 270°
            x = -leg_sep + leg_radius * np.cos(angle)
            z = leg_radius * np.sin(angle)
            pts.append([x, y, z])
        
        # Ponte frontal (virilha frontal)
        for i in range(n_bridge):
            t = i / (n_bridge - 1)
            x = -leg_sep + leg_radius + t * (2 * (leg_sep - leg_radius))
            # Curva suave na frente
            z_curve = crotch_depth * (1 - 4 * (t - 0.5)**2)
            z = z_curve
            pts.append([x, y, z])
        
        # Perna direita (semicírculo externo)
        for i in range(n_per_leg):
            angle = -np.pi/2 + np.pi * i / (n_per_leg - 1)  # -90° a 90°
            x = leg_sep + leg_radius * np.cos(angle)
            z = leg_radius * np.sin(angle)
            pts.append([x, y, z])
        
        # Ponte traseira (virilha traseira)
        for i in range(n_bridge):
            t = i / (n_bridge - 1)
            x = leg_sep - leg_radius - t * (2 * (leg_sep - leg_radius))
            # Curva suave atrás
            z_curve = -crotch_depth * 0.6 * (1 - 4 * (t - 0.5)**2)
            z = z_curve
            pts.append([x, y, z])
        
        return pts
    
    # ===== CONSTRUÇÃO DO CORPO =====
    profiles = []
    
    # Pés e tornozelos (elipses simples, deslocadas)
    foot_levels = [
        (0.00, 0.08, 0.20),  # Sola
        (0.01, 0.06, 0.12),  # Pé
        (0.02, 0.05, 0.08),  # Tornozelo
        (0.04, 0.042, 0.048),
        (0.06, 0.040, 0.045),
    ]
    
    # Canela e joelho (elipses deslocadas)
    leg_levels = [
        (0.10, 0.040, 0.048),
        (0.15, 0.042, 0.050),
        (0.20, 0.045, 0.052),
        (0.25, 0.050, 0.055),  # Joelho
        (0.28, 0.052, 0.058),
        (0.32, 0.058, 0.065),
        (0.36, 0.065, 0.072),
        (0.40, 0.072, 0.080),
        (0.44, 0.078, 0.085),  # Coxa alta
    ]
    
    # Gerar vértices para pés/pernas separadas
    leg_offset = 0.08  # Distância do centro para cada perna
    
    for h_rel, rx, rz in foot_levels + leg_levels:
        y = h_rel * height
        # Perna esquerda
        for pt in ellipse_points(rx, rz, N_RADIAL, y):
            pt[0] -= leg_offset
            vertices.append(pt)
        # Perna direita  
        for pt in ellipse_points(rx, rz, N_RADIAL, y):
            pt[0] += leg_offset
            vertices.append(pt)
    
    n_leg_levels = len(foot_levels) + len(leg_levels)
    
    # Criar faces para as pernas
    for level in range(n_leg_levels - 1):
        for leg in range(2):  # 0=esquerda, 1=direita
            base = level * 2 * N_RADIAL + leg * N_RADIAL
            next_base = (level + 1) * 2 * N_RADIAL + leg * N_RADIAL
            
            for i in range(N_RADIAL):
                i_next = (i + 1) % N_RADIAL
                faces.append([base + i, next_base + i, next_base + i_next])
                faces.append([base + i, next_base + i_next, base + i_next])
    
    # Fechar sola dos pés
    for leg in range(2):
        base = leg * N_RADIAL
        center_idx = len(vertices)
        cx = -leg_offset if leg == 0 else leg_offset
        vertices.append([cx, 0, 0.05])  # Centro da sola
        for i in range(N_RADIAL):
            i_next = (i + 1) % N_RADIAL
            faces.append([base + i_next, base + i, center_idx])
    
    # ===== REGIÃO DA VIRILHA (TRANSIÇÃO) =====
    # Criar perfis de transição de pernas separadas para torso único
    
    crotch_start_level = n_leg_levels - 1
    crotch_start_idx = crotch_start_level * 2 * N_RADIAL
    
    # Níveis de transição da virilha
    transition_levels = [
        (0.46, 0.08, 0.082, 0.088, 0.06),  # leg_sep, leg_r, hip_w, crotch_d
        (0.48, 0.06, 0.075, 0.10, 0.05),
        (0.50, 0.04, 0.065, 0.12, 0.04),
        (0.52, 0.02, 0.055, 0.14, 0.02),
    ]
    
    transition_start_idx = len(vertices)
    n_pants_pts = 24 + 12 + 24 + 12  # pontos por perfil "calça"
    
    for h_rel, leg_sep, leg_r, hip_w, crotch_d in transition_levels:
        y = h_rel * height
        pts = pants_profile(y, leg_sep, leg_r, hip_w, crotch_d)
        vertices.extend(pts)
    
    # Conectar último nível das pernas com primeiro nível da transição
    # (isso é complexo, vou usar uma abordagem simplificada)
    
    # ===== TORSO (ELIPSES SIMPLES) =====
    torso_start_idx = len(vertices)
    
    torso_levels = [
        # (altura_rel, largura_x, profundidade_z)
        (0.54, 0.155, 0.11),
        (0.56, 0.16, 0.115),
        (0.58, 0.155, 0.11),
        (0.60, 0.15, 0.105),
        (0.62, 0.145, 0.10),
        (0.64, 0.142, 0.095),
        (0.66, 0.14, 0.092),
        (0.68, 0.145, 0.095),
        (0.70, 0.15, 0.10),
        (0.72, 0.16, 0.102),
        (0.75, 0.175, 0.105),
        (0.78, 0.19, 0.108),
        (0.80, 0.20, 0.11),
        (0.82, 0.205, 0.112),
        (0.84, 0.21, 0.115),
        (0.86, 0.205, 0.11),
        (0.88, 0.22, 0.09),
    ]
    
    for h_rel, wx, dz in torso_levels:
        y = h_rel * height
        # Achatar costas
        pts = []
        for i in range(N_RADIAL):
            angle = 2 * np.pi * i / N_RADIAL
            x = wx * np.cos(angle)
            z = dz * np.sin(angle)
            if z < 0:
                z *= 0.85  # Costas mais retas
            pts.append([x, y, z])
        vertices.extend(pts)
    
    # Conectar níveis do torso
    for level in range(len(torso_levels) - 1):
        base = torso_start_idx + level * N_RADIAL
        next_base = torso_start_idx + (level + 1) * N_RADIAL
        for i in range(N_RADIAL):
            i_next = (i + 1) % N_RADIAL
            faces.append([base + i, next_base + i, next_base + i_next])
            faces.append([base + i, next_base + i_next, base + i_next])
    
    # ===== PESCOÇO E CABEÇA =====
    neck_head_levels = [
        (0.90, 0.12, 0.08),
        (0.91, 0.06, 0.06),
        (0.93, 0.052, 0.052),
        (0.95, 0.048, 0.048),
        (0.96, 0.055, 0.065),
        (0.98, 0.072, 0.085),
        (1.00, 0.078, 0.092),
        (1.02, 0.078, 0.095),
        (1.04, 0.075, 0.09),
        (1.06, 0.065, 0.08),
        (1.08, 0.04, 0.05),
    ]
    
    neck_start_idx = len(vertices)
    
    for h_rel, wx, dz in neck_head_levels:
        y = h_rel * height
        vertices.extend(ellipse_points(wx, dz, N_RADIAL, y))
    
    # Conectar pescoço/cabeça
    # Primeiro conectar com o último nível do torso
    base = torso_start_idx + (len(torso_levels) - 1) * N_RADIAL
    next_base = neck_start_idx
    for i in range(N_RADIAL):
        i_next = (i + 1) % N_RADIAL
        faces.append([base + i, next_base + i, next_base + i_next])
        faces.append([base + i, next_base + i_next, base + i_next])
    
    # Conectar níveis do pescoço/cabeça
    for level in range(len(neck_head_levels) - 1):
        base = neck_start_idx + level * N_RADIAL
        next_base = neck_start_idx + (level + 1) * N_RADIAL
        for i in range(N_RADIAL):
            i_next = (i + 1) % N_RADIAL
            faces.append([base + i, next_base + i, next_base + i_next])
            faces.append([base + i, next_base + i_next, base + i_next])
    
    # Fechar topo da cabeça
    top_base = neck_start_idx + (len(neck_head_levels) - 1) * N_RADIAL
    top_center = len(vertices)
    vertices.append([0, neck_head_levels[-1][0] * height + 0.01, 0])
    for i in range(N_RADIAL):
        i_next = (i + 1) % N_RADIAL
        faces.append([top_base + i, top_center, top_base + i_next])
    
    # ===== BRAÇOS =====
    arm_levels = [
        (0.88, 0.22, 0.038),  # Ombro
        (0.84, 0.26, 0.035),
        (0.78, 0.30, 0.033),
        (0.72, 0.32, 0.030),
        (0.66, 0.33, 0.028),
        (0.60, 0.34, 0.025),
        (0.54, 0.345, 0.023),
        (0.50, 0.35, 0.028),  # Mão
    ]
    
    N_ARM = 20
    
    for side in [-1, 1]:  # -1=esquerdo, 1=direito
        arm_start = len(vertices)
        for h_rel, dist_x, radius in arm_levels:
            y = h_rel * height
            cx = side * dist_x
            for i in range(N_ARM):
                angle = 2 * np.pi * i / N_ARM
                x = cx + radius * np.cos(angle)
                z = radius * np.sin(angle)
                vertices.append([x, y, z])
        
        # Conectar níveis do braço
        for level in range(len(arm_levels) - 1):
            base = arm_start + level * N_ARM
            next_base = arm_start + (level + 1) * N_ARM
            for i in range(N_ARM):
                i_next = (i + 1) % N_ARM
                faces.append([base + i, next_base + i, next_base + i_next])
                faces.append([base + i, next_base + i_next, base + i_next])
        
        # Fechar mão
        hand_base = arm_start + (len(arm_levels) - 1) * N_ARM
        hand_center = len(vertices)
        vertices.append([side * arm_levels[-1][1], arm_levels[-1][0] * height - 0.02, 0])
        for i in range(N_ARM):
            i_next = (i + 1) % N_ARM
            faces.append([hand_base + i, hand_center, hand_base + i_next])
    
    # ===== CRIAR MESH DE TRANSIÇÃO DA VIRILHA =====
    # Conectar pernas com torso através de uma mesh interpolada
    
    # Pegar últimos pontos das pernas
    last_leg_level = n_leg_levels - 1
    left_leg_pts_idx = last_leg_level * 2 * N_RADIAL
    right_leg_pts_idx = left_leg_pts_idx + N_RADIAL
    
    # Pegar primeiros pontos do torso
    first_torso_idx = torso_start_idx
    
    # Criar faces de transição (simplificado - conecta diretamente)
    # Esta é uma aproximação, idealmente seria uma mesh mais elaborada
    
    # Converter para numpy
    vertices = np.array(vertices, dtype=np.float32)
    faces = np.array(faces, dtype=np.int32)
    
    return vertices, faces

def create_morph_targets(vertices, height=1.75):
    """Cria morph targets para deformações clínicas"""
    n_verts = len(vertices)
    SCALE = 0.05  # 5cm de deslocamento máximo
    
    morph_targets = {}
    y_min, y_max = vertices[:, 1].min(), vertices[:, 1].max()
    
    # 1. Weight
    weight = np.zeros((n_verts, 3), dtype=np.float32)
    for i, v in enumerate(vertices):
        y_norm = (v[1] - y_min) / (y_max - y_min)
        if 0.15 < y_norm < 0.92:
            dist = np.sqrt(v[0]**2 + v[2]**2)
            if dist > 0.02:
                direction = np.array([v[0], 0, v[2]])
                direction = direction / (np.linalg.norm(direction) + 1e-6)
                factor = 1.0
                if 0.5 < y_norm < 0.7:
                    factor = 1.5
                weight[i] = direction * SCALE * factor
    morph_targets['Weight'] = weight
    
    # 2. AbdomenGirth
    abdomen = np.zeros((n_verts, 3), dtype=np.float32)
    for i, v in enumerate(vertices):
        y_norm = (v[1] - y_min) / (y_max - y_min)
        if 0.5 < y_norm < 0.75:
            dist = np.sqrt(v[0]**2 + v[2]**2)
            if dist > 0.02:
                direction = np.array([v[0], 0, v[2]])
                direction = direction / (np.linalg.norm(direction) + 1e-6)
                front_factor = 1.0 + 0.5 * max(0, v[2] / (abs(v[2]) + 0.01))
                y_factor = np.exp(-((y_norm - 0.62)**2) / 0.01)
                abdomen[i] = direction * SCALE * 1.5 * front_factor * y_factor
    morph_targets['AbdomenGirth'] = abdomen
    
    # 3. MuscleMass
    muscle = np.zeros((n_verts, 3), dtype=np.float32)
    for i, v in enumerate(vertices):
        y_norm = (v[1] - y_min) / (y_max - y_min)
        dist = np.sqrt(v[0]**2 + v[2]**2)
        if dist > 0.02:
            direction = np.array([v[0], 0, v[2]])
            direction = direction / (np.linalg.norm(direction) + 1e-6)
            if 0.75 < y_norm < 0.90 or abs(v[0]) > 0.18:
                muscle[i] = direction * SCALE * 0.8
            elif 0.1 < y_norm < 0.45:
                muscle[i] = direction * SCALE * 0.6
    morph_targets['MuscleMass'] = muscle
    
    # 4. Posture
    posture = np.zeros((n_verts, 3), dtype=np.float32)
    for i, v in enumerate(vertices):
        y_norm = (v[1] - y_min) / (y_max - y_min)
        if 0.5 < y_norm < 0.95:
            forward_lean = (y_norm - 0.5) * 0.1
            posture[i] = [0, 0, forward_lean * SCALE]
    morph_targets['Posture'] = posture
    
    # 5-7. Efeitos de doenças
    morph_targets['DiabetesEffect'] = weight * 0.5 + abdomen * 0.8
    morph_targets['HypertensionEffect'] = weight * 0.3 + abdomen * 0.4
    morph_targets['HeartDiseaseEffect'] = weight * 0.2 + posture * 0.5
    
    return morph_targets

def export_to_glb(vertices, faces, morph_targets, output_path):
    """Exporta para GLB com morph targets"""
    mesh = trimesh.Trimesh(vertices=vertices, faces=faces)
    mesh.fix_normals()
    normals = mesh.vertex_normals.astype(np.float32)
    
    vertices_bytes = vertices.astype(np.float32).tobytes()
    normals_bytes = normals.astype(np.float32).tobytes()
    faces_bytes = faces.astype(np.uint32).flatten().tobytes()
    
    morph_bytes = b''
    morph_target_list = list(morph_targets.keys())
    for name in morph_target_list:
        morph_bytes += morph_targets[name].astype(np.float32).tobytes()
    
    total_buffer = vertices_bytes + normals_bytes + faces_bytes + morph_bytes
    
    gltf = GLTF2(
        asset={'version': '2.0', 'generator': 'Digital Twins Avatar Generator v2'},
        buffers=[Buffer(byteLength=len(total_buffer))],
        bufferViews=[],
        accessors=[],
        meshes=[],
        nodes=[],
        scenes=[],
        scene=0,
        materials=[]
    )
    
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
    
    gltf.nodes.append(Node(mesh=0))
    gltf.scenes.append(Scene(nodes=[0]))
    
    gltf.set_binary_blob(total_buffer)
    gltf.save(output_path)
    
    return morph_target_list

def main():
    print("Criando avatar v2 com virilha corrigida...")
    
    HEIGHT = 1.75
    
    print("  - Gerando geometria...")
    vertices, faces = create_full_body_mesh(HEIGHT)
    
    print("  - Criando mesh trimesh...")
    mesh = trimesh.Trimesh(vertices=vertices, faces=faces)
    
    print("  - Processando mesh...")
    mesh.merge_vertices()
    mesh.update_faces(mesh.nondegenerate_faces())
    mesh.update_faces(mesh.unique_faces())
    mesh.fix_normals()
    
    print("  - Aplicando suavização...")
    trimesh.smoothing.filter_laplacian(mesh, iterations=3)
    
    vertices = np.array(mesh.vertices, dtype=np.float32)
    faces = np.array(mesh.faces, dtype=np.int32)
    
    print(f"  - Vértices: {len(vertices)}, Faces: {len(faces)}")
    
    print("  - Criando morph targets...")
    morph_targets = create_morph_targets(vertices, HEIGHT)
    
    print("  - Exportando GLB...")
    output_path = '/home/ubuntu/digital_twins/nextjs_space/public/models/avatar_morphable.glb'
    target_names = export_to_glb(vertices, faces, morph_targets, output_path)
    
    metadata = {
        'morphTargets': {name: {'index': i, 'range': [0, 1]} for i, name in enumerate(target_names)},
        'vertexCount': len(vertices),
        'faceCount': len(faces),
        'height': HEIGHT,
        'generator': 'create_avatar_v2.py'
    }
    
    with open('/home/ubuntu/digital_twins/nextjs_space/public/models/avatar_metadata.json', 'w') as f:
        json.dump(metadata, f, indent=2)
    
    print(f"\n✅ Avatar v2 criado com sucesso!")
    print(f"   - Arquivo: {output_path}")
    print(f"   - Vértices: {len(vertices)}")
    print(f"   - Faces: {len(faces)}")
    print(f"   - Morph targets: {target_names}")

if __name__ == '__main__':
    main()
