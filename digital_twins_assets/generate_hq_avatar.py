import numpy as np
import trimesh
from scipy.spatial import Delaunay
import json
import struct

def create_human_body_mesh(resolution=50):
    """Cria uma malha humana mais detalhada usando superfícies paramétricas"""
    
    # Parâmetros do corpo
    body_height = 1.75
    
    # Criar seções do corpo com mais detalhes
    sections = []
    
    # Função para criar elipsoides com deformações
    def create_body_section(center_y, radius_x, radius_z, height, num_rings=20, num_segments=32):
        vertices = []
        for i in range(num_rings + 1):
            t = i / num_rings
            y = center_y - height/2 + t * height
            
            # Variação do raio ao longo da altura
            r_factor = np.sin(t * np.pi) ** 0.3  # Mais cheio no meio
            rx = radius_x * (0.7 + 0.3 * r_factor)
            rz = radius_z * (0.7 + 0.3 * r_factor)
            
            for j in range(num_segments):
                theta = 2 * np.pi * j / num_segments
                x = rx * np.cos(theta)
                z = rz * np.sin(theta)
                vertices.append([x, y, z])
        
        return np.array(vertices), num_rings + 1, num_segments
    
    # Criar corpo completo com proporções humanas realistas
    all_vertices = []
    
    # Cabeça (esfera mais suave)
    head_verts = []
    head_center = 1.65
    head_radius = 0.11
    for i in range(25):
        phi = np.pi * i / 24
        for j in range(32):
            theta = 2 * np.pi * j / 32
            # Modificar para forma de cabeça mais realista
            r_mod = head_radius * (1.0 - 0.15 * np.sin(phi) ** 2)  # Mais estreito nas laterais
            x = r_mod * np.sin(phi) * np.cos(theta)
            y = head_center + head_radius * 0.95 * np.cos(phi)
            z = r_mod * 0.9 * np.sin(phi) * np.sin(theta)  # Mais achatado frente/trás
            head_verts.append([x, y, z])
    all_vertices.extend(head_verts)
    
    # Pescoço
    neck_verts = []
    for i in range(8):
        y = 1.45 + i * 0.025
        r = 0.055 + 0.01 * np.sin(i * np.pi / 7)
        for j in range(24):
            theta = 2 * np.pi * j / 24
            x = r * np.cos(theta)
            z = r * 0.85 * np.sin(theta)
            neck_verts.append([x, y, z])
    all_vertices.extend(neck_verts)
    
    # Ombros e tronco superior
    torso_upper_verts = []
    for i in range(20):
        t = i / 19
        y = 1.45 - t * 0.35
        
        # Largura aumenta nos ombros
        shoulder_factor = np.sin(t * np.pi) ** 0.5
        width = 0.12 + 0.12 * shoulder_factor
        depth = 0.08 + 0.04 * shoulder_factor
        
        for j in range(32):
            theta = 2 * np.pi * j / 32
            x = width * np.cos(theta)
            z = depth * np.sin(theta)
            torso_upper_verts.append([x, y, z])
    all_vertices.extend(torso_upper_verts)
    
    # Peito/Tronco médio
    torso_mid_verts = []
    for i in range(25):
        t = i / 24
        y = 1.10 - t * 0.25
        
        # Forma do tronco
        width = 0.20 - 0.03 * t
        depth = 0.11 - 0.02 * t
        
        for j in range(32):
            theta = 2 * np.pi * j / 32
            # Adicionar detalhe do peito na frente
            chest_bulge = 0.015 * np.exp(-((theta - np.pi) ** 2) / 0.5) if t < 0.3 else 0
            x = width * np.cos(theta)
            z = (depth + chest_bulge) * np.sin(theta)
            torso_mid_verts.append([x, y, z])
    all_vertices.extend(torso_mid_verts)
    
    # Abdômen/Barriga (área principal para morph de peso)
    abdomen_verts = []
    for i in range(30):
        t = i / 29
        y = 0.85 - t * 0.30
        
        # Forma do abdômen - mais proeminente na frente
        base_width = 0.17 - 0.02 * t
        base_depth = 0.09
        
        for j in range(32):
            theta = 2 * np.pi * j / 32
            
            # Protuberância frontal (barriga)
            belly_bulge = 0.02 * np.exp(-((theta - np.pi/2) ** 2) / 0.8)
            
            x = base_width * np.cos(theta)
            z = (base_depth + belly_bulge) * np.sin(theta)
            abdomen_verts.append([x, y, z])
    all_vertices.extend(abdomen_verts)
    
    # Quadril
    hip_verts = []
    for i in range(20):
        t = i / 19
        y = 0.55 - t * 0.15
        
        width = 0.15 + 0.03 * np.sin(t * np.pi)
        depth = 0.10 + 0.02 * np.sin(t * np.pi)
        
        for j in range(32):
            theta = 2 * np.pi * j / 32
            x = width * np.cos(theta)
            z = depth * np.sin(theta)
            hip_verts.append([x, y, z])
    all_vertices.extend(hip_verts)
    
    # Pernas (coxa)
    for leg_side in [-1, 1]:
        thigh_verts = []
        leg_offset_x = 0.08 * leg_side
        
        for i in range(30):
            t = i / 29
            y = 0.40 - t * 0.45
            
            # Coxa mais grossa em cima, afina embaixo
            radius = 0.07 * (1 - 0.4 * t)
            
            for j in range(24):
                theta = 2 * np.pi * j / 24
                x = leg_offset_x + radius * np.cos(theta)
                z = radius * 0.9 * np.sin(theta)
                thigh_verts.append([x, y, z])
        all_vertices.extend(thigh_verts)
    
    # Pernas (panturrilha)
    for leg_side in [-1, 1]:
        calf_verts = []
        leg_offset_x = 0.08 * leg_side
        
        for i in range(25):
            t = i / 24
            y = -0.05 - t * 0.40
            
            # Panturrilha com forma característica
            calf_shape = 1.0 + 0.2 * np.sin(t * np.pi * 0.7)
            radius = 0.045 * calf_shape * (1 - 0.3 * t)
            
            for j in range(20):
                theta = 2 * np.pi * j / 20
                x = leg_offset_x + radius * np.cos(theta)
                z = radius * np.sin(theta)
                calf_verts.append([x, y, z])
        all_vertices.extend(calf_verts)
    
    # Pés
    for leg_side in [-1, 1]:
        foot_verts = []
        foot_offset_x = 0.08 * leg_side
        
        for i in range(15):
            t = i / 14
            y = -0.45 - 0.03 * (1 - np.cos(t * np.pi / 2))
            
            # Formato do pé
            foot_length = 0.12 * t
            foot_width = 0.04 * np.sin(t * np.pi) ** 0.5
            
            for j in range(16):
                theta = 2 * np.pi * j / 16
                x = foot_offset_x + foot_width * np.cos(theta)
                z = 0.05 + foot_length * np.sin(theta) if np.sin(theta) > 0 else 0.05 + 0.02 * np.sin(theta)
                foot_verts.append([x, y, z])
        all_vertices.extend(foot_verts)
    
    # Braços
    for arm_side in [-1, 1]:
        # Braço superior
        upper_arm_verts = []
        arm_offset_x = 0.22 * arm_side
        
        for i in range(25):
            t = i / 24
            y = 1.35 - t * 0.30
            x_offset = arm_offset_x + 0.03 * t * arm_side
            
            radius = 0.04 * (1 - 0.15 * t)
            
            for j in range(20):
                theta = 2 * np.pi * j / 20
                x = x_offset + radius * np.cos(theta)
                z = radius * np.sin(theta)
                upper_arm_verts.append([x, y, z])
        all_vertices.extend(upper_arm_verts)
        
        # Antebraço
        forearm_verts = []
        for i in range(25):
            t = i / 24
            y = 1.05 - t * 0.28
            x_offset = arm_offset_x + 0.05 * arm_side
            
            radius = 0.035 * (1 - 0.2 * t)
            
            for j in range(18):
                theta = 2 * np.pi * j / 18
                x = x_offset + radius * np.cos(theta)
                z = radius * np.sin(theta)
                forearm_verts.append([x, y, z])
        all_vertices.extend(forearm_verts)
        
        # Mão (simplificada)
        hand_verts = []
        for i in range(12):
            t = i / 11
            y = 0.77 - t * 0.10
            x_offset = arm_offset_x + 0.05 * arm_side
            
            width = 0.03 * (1 - 0.3 * t)
            depth = 0.015 * (1 - 0.3 * t)
            
            for j in range(12):
                theta = 2 * np.pi * j / 12
                x = x_offset + width * np.cos(theta)
                z = depth * np.sin(theta)
                hand_verts.append([x, y, z])
        all_vertices.extend(hand_verts)
    
    vertices = np.array(all_vertices)
    
    # Centralizar na posição correta
    vertices[:, 1] += 0.45  # Ajustar altura para pés no chão
    
    return vertices

def create_mesh_from_vertices(vertices, connect_threshold=0.08):
    """Cria uma malha triangular a partir dos vértices usando ball pivoting ou similar"""
    
    # Usar trimesh para criar a malha
    cloud = trimesh.PointCloud(vertices)
    
    # Tentar criar convex hull primeiro como base
    try:
        # Criar malha usando alpha shapes ou convex hull modificado
        mesh = trimesh.convex.convex_hull(vertices)
        
        # Subdividir para mais detalhes
        mesh = mesh.subdivide()
        
        return mesh
    except Exception as e:
        print(f"Convex hull failed: {e}")
        return None

def create_morphable_human_glb():
    """Cria um modelo humano GLB com morph targets de alta qualidade"""
    
    print("Gerando malha base do corpo humano...")
    base_vertices = create_human_body_mesh()
    
    # Criar mesh usando trimesh
    print("Criando malha triangular...")
    
    # Usar convex hull e depois subdivide
    mesh = trimesh.convex.convex_hull(base_vertices)
    
    # Suavizar a malha
    mesh = trimesh.smoothing.filter_laplacian(mesh, iterations=2)
    
    # Subdividir para mais detalhes
    for _ in range(2):
        mesh = mesh.subdivide()
        mesh = trimesh.smoothing.filter_laplacian(mesh, iterations=1)
    
    print(f"Malha criada: {len(mesh.vertices)} vértices, {len(mesh.faces)} faces")
    
    # Salvar como OBJ para referência
    mesh.export('avatar_hq_reference.obj')
    print("Modelo de referência salvo: avatar_hq_reference.obj")
    
    # Criar GLB com morph targets (usando pygltflib)
    create_glb_with_morphs(mesh)
    
    return mesh

def create_glb_with_morphs(mesh):
    """Cria arquivo GLB com morph targets"""
    from pygltflib import GLTF2, Scene, Node, Mesh, Primitive, Accessor, BufferView, Buffer, Material
    import base64
    
    vertices = mesh.vertices.astype(np.float32)
    normals = mesh.vertex_normals.astype(np.float32)
    faces = mesh.faces.astype(np.uint32)
    
    # Definir morph targets
    morph_targets_data = {}
    
    # 1. Weight (aumenta volume geral)
    weight_delta = vertices.copy()
    center = vertices.mean(axis=0)
    for i, v in enumerate(vertices):
        direction = v - center
        dist = np.linalg.norm(direction)
        if dist > 0:
            # Aumentar mais no torso
            y_factor = 1.0 + 0.5 * np.exp(-((v[1] - 1.0) ** 2) / 0.3)
            weight_delta[i] = direction * 0.15 * y_factor
        else:
            weight_delta[i] = np.zeros(3)
    morph_targets_data['Weight'] = weight_delta.astype(np.float32)
    
    # 2. AbdomenGirth (aumenta barriga)
    abdomen_delta = np.zeros_like(vertices, dtype=np.float32)
    for i, v in enumerate(vertices):
        # Foco na região abdominal (y entre 0.8 e 1.2)
        y_factor = np.exp(-((v[1] - 1.0) ** 2) / 0.1)
        # Mais na frente (z positivo)
        z_factor = max(0, v[2]) / (abs(v[2]) + 0.01)
        
        direction = np.array([0, 0, v[2]]) if abs(v[2]) > 0.01 else np.array([0, 0, 0.01])
        direction = direction / (np.linalg.norm(direction) + 0.001)
        
        abdomen_delta[i] = direction * 0.08 * y_factor * (0.5 + 0.5 * z_factor)
    morph_targets_data['AbdomenGirth'] = abdomen_delta
    
    # 3. MuscleMass (aumenta braços e pernas)
    muscle_delta = np.zeros_like(vertices, dtype=np.float32)
    for i, v in enumerate(vertices):
        # Detectar braços (x longe do centro)
        arm_factor = np.exp(-((abs(v[0]) - 0.15) ** 2) / 0.01) if abs(v[0]) > 0.1 else 0
        # Detectar pernas
        leg_factor = np.exp(-((v[1] - 0.5) ** 2) / 0.2) if v[1] < 0.8 else 0
        
        direction = np.array([v[0], 0, v[2]])
        norm = np.linalg.norm(direction)
        if norm > 0.01:
            direction = direction / norm
            muscle_delta[i] = direction * 0.03 * (arm_factor + leg_factor)
    morph_targets_data['MuscleMass'] = muscle_delta
    
    # 4. Posture (curvar coluna)
    posture_delta = np.zeros_like(vertices, dtype=np.float32)
    for i, v in enumerate(vertices):
        # Afetar principalmente o tronco superior
        if 1.0 < v[1] < 1.5:
            y_factor = (v[1] - 1.0) / 0.5
            # Curvar para frente
            posture_delta[i] = np.array([0, -0.02 * y_factor, 0.03 * y_factor])
    morph_targets_data['Posture'] = posture_delta
    
    # 5-7. Efeitos de doenças (compostos)
    morph_targets_data['DiabetesEffect'] = (morph_targets_data['Weight'] * 0.12 + morph_targets_data['AbdomenGirth'] * 0.18).astype(np.float32)
    morph_targets_data['HypertensionEffect'] = (morph_targets_data['Weight'] * 0.08 + morph_targets_data['AbdomenGirth'] * 0.10 - morph_targets_data['MuscleMass'] * 0.05).astype(np.float32)
    morph_targets_data['HeartDiseaseEffect'] = (morph_targets_data['Weight'] * 0.15 + morph_targets_data['Posture'] * 0.3).astype(np.float32)
    
    # Criar buffer binário
    buffer_data = bytearray()
    
    # Adicionar vértices
    vertices_offset = len(buffer_data)
    buffer_data.extend(vertices.tobytes())
    
    # Adicionar normais
    normals_offset = len(buffer_data)
    buffer_data.extend(normals.tobytes())
    
    # Adicionar índices
    indices_offset = len(buffer_data)
    indices_flat = faces.flatten().astype(np.uint32)
    buffer_data.extend(indices_flat.tobytes())
    
    # Adicionar morph targets
    morph_offsets = {}
    for name, delta in morph_targets_data.items():
        morph_offsets[name] = len(buffer_data)
        buffer_data.extend(delta.tobytes())
    
    # Criar GLTF
    gltf = GLTF2()
    
    # Buffer
    gltf.buffers = [Buffer(byteLength=len(buffer_data))]
    
    # Buffer Views
    buffer_views = []
    accessors = []
    
    # Vertices buffer view (0)
    buffer_views.append(BufferView(buffer=0, byteOffset=vertices_offset, byteLength=vertices.nbytes, target=34962))
    accessors.append(Accessor(bufferView=0, componentType=5126, count=len(vertices), type="VEC3",
                              max=vertices.max(axis=0).tolist(), min=vertices.min(axis=0).tolist()))
    
    # Normals buffer view (1)
    buffer_views.append(BufferView(buffer=0, byteOffset=normals_offset, byteLength=normals.nbytes, target=34962))
    accessors.append(Accessor(bufferView=1, componentType=5126, count=len(normals), type="VEC3"))
    
    # Indices buffer view (2)
    buffer_views.append(BufferView(buffer=0, byteOffset=indices_offset, byteLength=indices_flat.nbytes, target=34963))
    accessors.append(Accessor(bufferView=2, componentType=5125, count=len(indices_flat), type="SCALAR"))
    
    # Morph target buffer views e accessors
    morph_accessor_indices = {}
    for name, delta in morph_targets_data.items():
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
            "baseColorFactor": [0.7, 0.7, 0.7, 1.0],
            "metallicFactor": 0.1,
            "roughnessFactor": 0.6
        },
        doubleSided=True
    )]
    
    # Mesh com morph targets
    targets = [{"POSITION": morph_accessor_indices[name]} for name in morph_targets_data.keys()]
    
    gltf.meshes = [Mesh(
        primitives=[Primitive(
            attributes={"POSITION": 0, "NORMAL": 1},
            indices=2,
            material=0,
            targets=targets
        )],
        weights=[0.0] * len(morph_targets_data),
        extras={"targetNames": list(morph_targets_data.keys())}
    )]
    
    # Node e Scene
    gltf.nodes = [Node(mesh=0, name="Avatar")]
    gltf.scenes = [Scene(nodes=[0])]
    gltf.scene = 0
    
    # Salvar como GLB
    gltf.set_binary_blob(bytes(buffer_data))
    gltf.save("avatar_morphable.glb")
    print("Modelo GLB com morph targets salvo: avatar_morphable.glb")
    
    # Criar versões baseline e clinical
    # Baseline (todos morph targets em 0)
    gltf.meshes[0].weights = [0.0] * len(morph_targets_data)
    gltf.save("avatar_baseline.glb")
    print("Modelo baseline salvo: avatar_baseline.glb")
    
    # Clinical (com condições aplicadas)
    weights = [0.0] * len(morph_targets_data)
    target_names = list(morph_targets_data.keys())
    weights[target_names.index('DiabetesEffect')] = 0.5
    weights[target_names.index('HypertensionEffect')] = 0.3
    weights[target_names.index('HeartDiseaseEffect')] = 0.4
    gltf.meshes[0].weights = weights
    gltf.save("avatar_clinical.glb")
    print("Modelo clinical salvo: avatar_clinical.glb")
    
    # Salvar metadata
    metadata = {
        "morphTargets": {name: {
            "index": i,
            "description": {
                "Weight": "Overall body mass",
                "AbdomenGirth": "Belly/abdominal size",
                "MuscleMass": "Arm and leg muscle volume",
                "Posture": "Spine curvature (aging)",
                "DiabetesEffect": "Diabetes Type 2 composite effect",
                "HypertensionEffect": "Hypertension composite effect",
                "HeartDiseaseEffect": "Heart disease composite effect"
            }.get(name, "Clinical parameter"),
            "range": [0.0, 1.0]
        } for i, name in enumerate(morph_targets_data.keys())},
        "vertexCount": len(vertices),
        "faceCount": len(faces)
    }
    
    with open("avatar_metadata.json", "w") as f:
        json.dump(metadata, f, indent=2)
    print("Metadata salvo: avatar_metadata.json")

if __name__ == "__main__":
    create_morphable_human_glb()
    print("\n✅ Modelos de alta qualidade gerados com sucesso!")
