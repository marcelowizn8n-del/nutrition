import numpy as np
import trimesh
from scipy.ndimage import gaussian_filter1d
from scipy.interpolate import interp1d
import json

def create_realistic_human_body():
    """
    Cria um corpo humano 3D realista usando perfis de seção transversal
    baseados em dados antropométricos reais
    """
    
    # Definir perfis de seção transversal ao longo do corpo
    # Baseado em dados antropométricos (altura normalizada 0-1)
    
    # Y positions (altura normalizada, 0 = pés, 1 = topo da cabeça)
    # Perfis: (y_norm, width_front_back, width_side, x_offset, z_offset)
    
    body_profiles = [
        # Pés
        (0.00, 0.06, 0.10, 0.0, 0.05),   # Base do pé
        (0.02, 0.05, 0.08, 0.0, 0.03),   # Calcanhar
        (0.04, 0.04, 0.06, 0.0, 0.0),    # Tornozelo
        
        # Pernas
        (0.08, 0.07, 0.08, 0.0, 0.0),    # Panturrilha inferior
        (0.14, 0.09, 0.10, 0.0, 0.0),    # Panturrilha (mais larga)
        (0.20, 0.07, 0.08, 0.0, 0.0),    # Panturrilha superior
        (0.24, 0.06, 0.06, 0.0, 0.0),    # Joelho
        (0.30, 0.10, 0.11, 0.0, 0.0),    # Coxa inferior
        (0.38, 0.12, 0.13, 0.0, 0.0),    # Coxa média
        (0.44, 0.14, 0.14, 0.0, 0.0),    # Coxa superior
        
        # Quadril e abdômen
        (0.48, 0.13, 0.17, 0.0, 0.0),    # Virilha
        (0.52, 0.14, 0.18, 0.0, 0.01),   # Quadril inferior
        (0.56, 0.15, 0.19, 0.0, 0.02),   # Quadril
        (0.60, 0.16, 0.18, 0.0, 0.03),   # Abdômen inferior
        (0.64, 0.17, 0.17, 0.0, 0.04),   # Abdômen (umbigo)
        (0.68, 0.16, 0.17, 0.0, 0.03),   # Abdômen superior
        
        # Tronco
        (0.72, 0.14, 0.18, 0.0, 0.02),   # Cintura
        (0.76, 0.13, 0.20, 0.0, 0.02),   # Costelas inferiores
        (0.80, 0.14, 0.22, 0.0, 0.03),   # Costelas / Peito inferior
        (0.84, 0.15, 0.23, 0.0, 0.04),   # Peito (mamilos)
        (0.88, 0.13, 0.22, 0.0, 0.02),   # Peito superior
        
        # Ombros e pescoço
        (0.90, 0.11, 0.24, 0.0, 0.0),    # Axilas
        (0.92, 0.10, 0.22, 0.0, -0.01),  # Ombros
        (0.94, 0.08, 0.12, 0.0, -0.01),  # Base do pescoço
        (0.96, 0.07, 0.08, 0.0, 0.0),    # Pescoço
        
        # Cabeça
        (0.98, 0.09, 0.09, 0.0, 0.01),   # Queixo
        (1.00, 0.10, 0.10, 0.0, 0.02),   # Face
        (1.02, 0.11, 0.10, 0.0, 0.0),    # Têmporas
        (1.04, 0.10, 0.10, 0.0, -0.02),  # Testa
        (1.06, 0.08, 0.08, 0.0, -0.02),  # Topo da cabeça
    ]
    
    height = 1.75  # metros
    
    vertices = []
    
    # Criar seções circulares suaves para cada perfil
    num_segments = 48  # Aumentar para mais suavidade
    
    for y_norm, depth, width, x_off, z_off in body_profiles:
        y = y_norm * height - 0.05  # Ajustar para pés no chão
        
        for i in range(num_segments):
            theta = 2 * np.pi * i / num_segments
            
            # Usar elipse para a seção transversal
            # Com modificação para tornar mais natural
            cos_t = np.cos(theta)
            sin_t = np.sin(theta)
            
            # Modificador para forma mais natural (não perfeitamente elíptica)
            shape_mod = 1.0 + 0.05 * np.cos(2 * theta)  # Leve achatamento
            
            x = x_off + (width/2) * cos_t * shape_mod
            z = z_off + (depth/2) * sin_t * shape_mod
            
            vertices.append([x, y, z])
    
    vertices = np.array(vertices)
    
    # Criar faces conectando as seções
    faces = []
    num_sections = len(body_profiles)
    
    for section in range(num_sections - 1):
        for seg in range(num_segments):
            # Índices dos vértices
            i0 = section * num_segments + seg
            i1 = section * num_segments + (seg + 1) % num_segments
            i2 = (section + 1) * num_segments + seg
            i3 = (section + 1) * num_segments + (seg + 1) % num_segments
            
            # Dois triângulos por quad
            faces.append([i0, i2, i1])
            faces.append([i1, i2, i3])
    
    # Fechar topo e base
    # Base (pés)
    center_bottom = len(vertices)
    vertices = np.vstack([vertices, [0, vertices[0, 1], 0]])
    for seg in range(num_segments):
        i0 = seg
        i1 = (seg + 1) % num_segments
        faces.append([center_bottom, i1, i0])
    
    # Topo (cabeça)
    center_top = len(vertices)
    top_section_start = (num_sections - 1) * num_segments
    vertices = np.vstack([vertices, [0, vertices[top_section_start, 1], 0]])
    for seg in range(num_segments):
        i0 = top_section_start + seg
        i1 = top_section_start + (seg + 1) % num_segments
        faces.append([center_top, i0, i1])
    
    faces = np.array(faces)
    
    # Criar mesh
    mesh = trimesh.Trimesh(vertices=vertices, faces=faces)
    
    # Corrigir normais
    mesh.fix_normals()
    
    return mesh

def add_arms_to_mesh(body_mesh):
    """Adiciona braços ao corpo"""
    
    arm_profiles = [
        # (distância do ombro, raio)
        (0.00, 0.055),  # Ombro
        (0.05, 0.050),  # Deltóide
        (0.12, 0.045),  # Bíceps superior
        (0.20, 0.042),  # Bíceps
        (0.28, 0.038),  # Cotovelo
        (0.35, 0.035),  # Antebraço superior
        (0.45, 0.032),  # Antebraço
        (0.52, 0.028),  # Pulso
        (0.58, 0.025),  # Mão
    ]
    
    arm_length = 0.60
    shoulder_height = 1.55
    shoulder_width = 0.22
    
    all_meshes = [body_mesh]
    
    for side in [-1, 1]:
        arm_verts = []
        num_segments = 24
        
        for dist, radius in arm_profiles:
            y = shoulder_height - dist * arm_length * 0.3  # Leve inclinação
            x = side * (shoulder_width + dist * arm_length * 0.1)
            
            for i in range(num_segments):
                theta = 2 * np.pi * i / num_segments
                ax = x + radius * np.cos(theta)
                ay = y - dist * arm_length * 0.8
                az = radius * np.sin(theta)
                arm_verts.append([ax, ay, az])
        
        arm_verts = np.array(arm_verts)
        
        # Criar faces do braço
        arm_faces = []
        num_sections = len(arm_profiles)
        
        for section in range(num_sections - 1):
            for seg in range(num_segments):
                i0 = section * num_segments + seg
                i1 = section * num_segments + (seg + 1) % num_segments
                i2 = (section + 1) * num_segments + seg
                i3 = (section + 1) * num_segments + (seg + 1) % num_segments
                
                arm_faces.append([i0, i2, i1])
                arm_faces.append([i1, i2, i3])
        
        # Fechar extremidades
        center_top = len(arm_verts)
        arm_verts = np.vstack([arm_verts, [side * shoulder_width, shoulder_height - 0.02, 0]])
        for seg in range(num_segments):
            i0 = seg
            i1 = (seg + 1) % num_segments
            arm_faces.append([center_top, i1 if side > 0 else i0, i0 if side > 0 else i1])
        
        center_bottom = len(arm_verts)
        bottom_start = (num_sections - 1) * num_segments
        arm_verts = np.vstack([arm_verts, [side * (shoulder_width + 0.06), shoulder_height - arm_length * 0.8, 0]])
        for seg in range(num_segments):
            i0 = bottom_start + seg
            i1 = bottom_start + (seg + 1) % num_segments
            arm_faces.append([center_bottom, i0 if side > 0 else i1, i1 if side > 0 else i0])
        
        arm_mesh = trimesh.Trimesh(vertices=arm_verts, faces=np.array(arm_faces))
        arm_mesh.fix_normals()
        all_meshes.append(arm_mesh)
    
    # Combinar todas as meshes
    combined = trimesh.util.concatenate(all_meshes)
    return combined

def create_morphable_glb(mesh, output_prefix="avatar"):
    """Cria GLB com morph targets"""
    from pygltflib import GLTF2, Scene, Node, Mesh as GLTFMesh, Primitive, Accessor, BufferView, Buffer, Material
    
    vertices = mesh.vertices.astype(np.float32)
    normals = mesh.vertex_normals.astype(np.float32)
    faces = mesh.faces.astype(np.uint32)
    
    print(f"Mesh final: {len(vertices)} vértices, {len(faces)} faces")
    
    # Calcular centro e bounds do corpo
    body_center = vertices.mean(axis=0)
    
    # Criar morph targets
    morph_targets = {}
    
    # 1. Weight - aumento geral de volume
    weight_delta = np.zeros_like(vertices)
    for i, v in enumerate(vertices):
        direction = v - body_center
        direction[1] = 0  # Não mudar altura
        dist = np.linalg.norm(direction)
        if dist > 0.01:
            # Mais efeito no torso (y entre 0.6 e 1.3)
            y_factor = np.exp(-((v[1] - 1.0) ** 2) / 0.15)
            weight_delta[i] = (direction / dist) * 0.03 * (0.5 + y_factor)
    morph_targets['Weight'] = weight_delta.astype(np.float32)
    
    # 2. AbdomenGirth - barriga proeminente
    abdomen_delta = np.zeros_like(vertices)
    for i, v in enumerate(vertices):
        # Região abdominal (y entre 0.8 e 1.2)
        y_factor = np.exp(-((v[1] - 1.05) ** 2) / 0.08)
        # Mais na frente (z positivo)
        if v[2] > 0:
            z_factor = v[2] / 0.15
            abdomen_delta[i] = np.array([0, 0, 0.06 * y_factor * z_factor])
    morph_targets['AbdomenGirth'] = abdomen_delta.astype(np.float32)
    
    # 3. MuscleMass - aumento muscular (braços, pernas, peito)
    muscle_delta = np.zeros_like(vertices)
    for i, v in enumerate(vertices):
        # Braços (x longe do centro)
        if abs(v[0]) > 0.15:
            direction = np.array([np.sign(v[0]), 0, 0])
            arm_factor = (abs(v[0]) - 0.15) / 0.1
            muscle_delta[i] += direction * 0.015 * min(arm_factor, 1.0)
        
        # Pernas
        if v[1] < 0.8 and v[1] > 0.1:
            direction = np.array([v[0], 0, v[2]])
            norm = np.linalg.norm(direction)
            if norm > 0.01:
                leg_factor = 0.5 + 0.5 * np.sin(np.pi * (v[1] - 0.1) / 0.7)
                muscle_delta[i] += (direction / norm) * 0.01 * leg_factor
        
        # Peito
        if 1.2 < v[1] < 1.5 and v[2] > 0.02:
            chest_factor = np.exp(-((v[1] - 1.4) ** 2) / 0.02)
            muscle_delta[i] += np.array([0, 0, 0.015 * chest_factor])
    
    morph_targets['MuscleMass'] = muscle_delta.astype(np.float32)
    
    # 4. Posture - curvatura da coluna (envelhecimento)
    posture_delta = np.zeros_like(vertices)
    for i, v in enumerate(vertices):
        if v[1] > 1.0:
            y_factor = (v[1] - 1.0) / 0.7
            # Curvar para frente e baixo
            posture_delta[i] = np.array([0, -0.03 * y_factor ** 2, 0.04 * y_factor])
    morph_targets['Posture'] = posture_delta.astype(np.float32)
    
    # Efeitos compostos de doenças
    morph_targets['DiabetesEffect'] = (
        morph_targets['Weight'] * 0.12 / 0.03 +
        morph_targets['AbdomenGirth'] * 0.18 / 0.06
    ).astype(np.float32)
    
    morph_targets['HypertensionEffect'] = (
        morph_targets['Weight'] * 0.08 / 0.03 +
        morph_targets['AbdomenGirth'] * 0.10 / 0.06 -
        morph_targets['MuscleMass'] * 0.05 / 0.015
    ).astype(np.float32)
    
    morph_targets['HeartDiseaseEffect'] = (
        morph_targets['Weight'] * 0.15 / 0.03 +
        morph_targets['Posture'] * 0.3 / 0.04
    ).astype(np.float32)
    
    # Criar buffer binário
    buffer_data = bytearray()
    
    # Vértices
    vertices_offset = len(buffer_data)
    buffer_data.extend(vertices.tobytes())
    
    # Normais
    normals_offset = len(buffer_data)
    buffer_data.extend(normals.tobytes())
    
    # Índices
    indices_offset = len(buffer_data)
    indices_flat = faces.flatten().astype(np.uint32)
    buffer_data.extend(indices_flat.tobytes())
    
    # Morph targets
    morph_offsets = {}
    for name, delta in morph_targets.items():
        morph_offsets[name] = len(buffer_data)
        buffer_data.extend(delta.tobytes())
    
    # Construir GLTF
    gltf = GLTF2()
    gltf.buffers = [Buffer(byteLength=len(buffer_data))]
    
    buffer_views = []
    accessors = []
    
    # Vértices (0)
    buffer_views.append(BufferView(buffer=0, byteOffset=vertices_offset, byteLength=vertices.nbytes, target=34962))
    accessors.append(Accessor(bufferView=0, componentType=5126, count=len(vertices), type="VEC3",
                              max=vertices.max(axis=0).tolist(), min=vertices.min(axis=0).tolist()))
    
    # Normais (1)
    buffer_views.append(BufferView(buffer=0, byteOffset=normals_offset, byteLength=normals.nbytes, target=34962))
    accessors.append(Accessor(bufferView=1, componentType=5126, count=len(normals), type="VEC3"))
    
    # Índices (2)
    buffer_views.append(BufferView(buffer=0, byteOffset=indices_offset, byteLength=indices_flat.nbytes, target=34963))
    accessors.append(Accessor(bufferView=2, componentType=5125, count=len(indices_flat), type="SCALAR"))
    
    # Morph targets
    morph_accessor_indices = {}
    for name, delta in morph_targets.items():
        bv_idx = len(buffer_views)
        buffer_views.append(BufferView(buffer=0, byteOffset=morph_offsets[name], byteLength=delta.nbytes, target=34962))
        
        acc_idx = len(accessors)
        accessors.append(Accessor(bufferView=bv_idx, componentType=5126, count=len(delta), type="VEC3",
                                  max=delta.max(axis=0).tolist(), min=delta.min(axis=0).tolist()))
        morph_accessor_indices[name] = acc_idx
    
    gltf.bufferViews = buffer_views
    gltf.accessors = accessors
    
    # Material cinza clínico
    gltf.materials = [Material(
        pbrMetallicRoughness={
            "baseColorFactor": [0.75, 0.73, 0.72, 1.0],
            "metallicFactor": 0.0,
            "roughnessFactor": 0.7
        },
        doubleSided=True
    )]
    
    # Mesh com morph targets
    target_names = list(morph_targets.keys())
    targets = [{"POSITION": morph_accessor_indices[name]} for name in target_names]
    
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
    
    # Salvar versões
    gltf.set_binary_blob(bytes(buffer_data))
    
    # Morphable (base)
    gltf.save(f"{output_prefix}_morphable.glb")
    print(f"Salvo: {output_prefix}_morphable.glb")
    
    # Baseline
    gltf.meshes[0].weights = [0.0] * len(morph_targets)
    gltf.save(f"{output_prefix}_baseline.glb")
    print(f"Salvo: {output_prefix}_baseline.glb")
    
    # Clinical
    weights = [0.0] * len(morph_targets)
    weights[target_names.index('DiabetesEffect')] = 0.6
    weights[target_names.index('HypertensionEffect')] = 0.4
    gltf.meshes[0].weights = weights
    gltf.save(f"{output_prefix}_clinical.glb")
    print(f"Salvo: {output_prefix}_clinical.glb")
    
    # Metadata
    metadata = {
        "morphTargets": {name: {
            "index": i,
            "description": {
                "Weight": "Aumento geral de massa corporal",
                "AbdomenGirth": "Circunferência abdominal (barriga)",
                "MuscleMass": "Massa muscular (braços, pernas, peito)",
                "Posture": "Postura/curvatura da coluna",
                "DiabetesEffect": "Efeito composto do Diabetes Tipo 2",
                "HypertensionEffect": "Efeito composto da Hipertensão",
                "HeartDiseaseEffect": "Efeito composto de Doença Cardíaca"
            }.get(name, "Parâmetro clínico"),
            "range": [0.0, 1.0]
        } for i, name in enumerate(target_names)},
        "vertexCount": len(vertices),
        "faceCount": len(faces),
        "height": 1.75
    }
    
    with open(f"{output_prefix}_metadata.json", "w") as f:
        json.dump(metadata, f, indent=2, ensure_ascii=False)
    print(f"Salvo: {output_prefix}_metadata.json")

def main():
    print("Criando corpo humano realista...")
    body = create_realistic_human_body()
    
    print("Adicionando braços...")
    full_body = add_arms_to_mesh(body)
    
    # Suavizar mesh
    print("Suavizando malha...")
    full_body = trimesh.smoothing.filter_laplacian(full_body, iterations=2)
    
    # Subdividir para mais detalhes
    print("Subdividindo para maior resolução...")
    full_body = full_body.subdivide()
    full_body = trimesh.smoothing.filter_laplacian(full_body, iterations=1)
    
    # Salvar OBJ de referência
    full_body.export("avatar_hq_reference.obj")
    print("Referência OBJ salva")
    
    # Criar GLB com morph targets
    print("\nCriando arquivos GLB...")
    create_morphable_glb(full_body, "avatar")
    
    print("\n✅ Modelos de alta qualidade criados com sucesso!")

if __name__ == "__main__":
    main()
