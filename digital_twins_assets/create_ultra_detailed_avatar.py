"""
Avatar humano ultra-detalhado com anatomia realista.
Baseado em proporções antropométricas e modelos SMPL.
"""
import numpy as np
import trimesh
import json
from pygltflib import GLTF2, Scene, Node, Mesh as GLTFMesh, Primitive, Accessor, BufferView, Buffer, Material

def create_ellipsoid_profile(width_x, depth_z, n_pts, front_flat=0.0, back_flat=0.0, side_bulge=0.0):
    """Cria perfil elíptico com modificações anatômicas"""
    angles = np.linspace(0, 2*np.pi, n_pts, endpoint=False)
    profile = []
    
    for angle in angles:
        x = width_x * np.cos(angle)
        z = depth_z * np.sin(angle)
        
        # Achatar costas
        if z < 0:
            z *= (1.0 - back_flat)
        
        # Achatar frente ligeiramente
        if z > 0:
            z *= (1.0 - front_flat * 0.3)
        
        # Adicionar volume lateral
        if abs(np.cos(angle)) > 0.7:
            x *= (1.0 + side_bulge)
        
        profile.append([x, z])
    
    return np.array(profile)

def create_detailed_human_body(height=1.75, detail_level=48):
    """
    Cria corpo humano com alta resolução anatômica.
    """
    vertices = []
    faces = []
    
    # Definição anatômica detalhada
    # (y_rel, width_x, depth_z, n_points, front_flat, back_flat, side_bulge)
    anatomy = [
        # PÉS
        (0.000, 0.045, 0.11, 24, 0.0, 0.0, 0.0),    # Sola pé
        (0.008, 0.042, 0.10, 24, 0.0, 0.0, 0.0),    # Pé baixo
        (0.020, 0.038, 0.06, 24, 0.0, 0.0, 0.0),    # Tornozelo
        
        # CANELA
        (0.040, 0.040, 0.045, 32, 0.0, 0.1, 0.0),
        (0.080, 0.042, 0.048, 32, 0.0, 0.1, 0.0),
        (0.120, 0.044, 0.052, 32, 0.0, 0.1, 0.0),
        (0.160, 0.046, 0.056, 32, 0.0, 0.1, 0.0),   # Panturrilha max
        (0.200, 0.044, 0.052, 32, 0.0, 0.1, 0.0),
        
        # JOELHO
        (0.240, 0.048, 0.055, 32, 0.0, 0.15, 0.0),
        (0.260, 0.052, 0.058, 32, 0.0, 0.2, 0.0),   # Joelho
        (0.280, 0.050, 0.056, 32, 0.0, 0.15, 0.0),
        
        # COXA
        (0.320, 0.058, 0.062, 32, 0.0, 0.1, 0.0),
        (0.360, 0.068, 0.072, 32, 0.0, 0.1, 0.0),
        (0.400, 0.078, 0.082, 32, 0.0, 0.1, 0.05),
        (0.440, 0.088, 0.090, 32, 0.0, 0.1, 0.08),  # Coxa máxima
        (0.470, 0.092, 0.092, 32, 0.0, 0.1, 0.1),
        
        # QUADRIL/VIRILHA
        (0.500, 0.145, 0.095, 40, 0.0, 0.15, 0.05),
        (0.520, 0.155, 0.100, 40, 0.0, 0.15, 0.05),
        (0.540, 0.160, 0.105, 40, 0.0, 0.15, 0.05), # Quadril máximo
        
        # ABDÔMEN BAIXO
        (0.560, 0.155, 0.100, 40, 0.0, 0.2, 0.0),
        (0.580, 0.148, 0.095, 40, 0.0, 0.2, 0.0),
        (0.600, 0.142, 0.092, 40, 0.0, 0.25, 0.0),
        
        # CINTURA
        (0.620, 0.135, 0.088, 40, 0.0, 0.25, 0.0),
        (0.640, 0.130, 0.085, 40, 0.0, 0.25, 0.0),  # Cintura mínima
        (0.660, 0.132, 0.087, 40, 0.0, 0.25, 0.0),
        
        # COSTELAS
        (0.680, 0.138, 0.090, 40, 0.0, 0.2, 0.0),
        (0.700, 0.148, 0.095, 40, 0.0, 0.2, 0.0),
        (0.720, 0.158, 0.100, 40, 0.0, 0.18, 0.0),
        (0.740, 0.168, 0.105, 40, 0.0, 0.15, 0.0),
        
        # PEITO
        (0.760, 0.175, 0.108, 40, 0.0, 0.12, 0.0),
        (0.780, 0.180, 0.112, 40, 0.0, 0.1, 0.0),
        (0.800, 0.182, 0.115, 40, 0.0, 0.08, 0.0),  # Peito máximo
        (0.820, 0.178, 0.110, 40, 0.0, 0.1, 0.0),
        
        # OMBROS
        (0.840, 0.170, 0.100, 40, 0.0, 0.12, 0.0),
        (0.855, 0.190, 0.090, 40, 0.0, 0.15, 0.0),  # Deltoides
        (0.870, 0.195, 0.085, 40, 0.0, 0.18, 0.0),  # Ombro máximo
        (0.880, 0.165, 0.078, 36, 0.0, 0.2, 0.0),
        
        # PESCOÇO
        (0.895, 0.065, 0.065, 28, 0.0, 0.1, 0.0),
        (0.910, 0.058, 0.058, 28, 0.0, 0.1, 0.0),
        (0.925, 0.052, 0.052, 28, 0.0, 0.1, 0.0),
        (0.940, 0.048, 0.050, 28, 0.0, 0.1, 0.0),
        
        # CABEÇA
        (0.950, 0.055, 0.060, 32, 0.1, 0.0, 0.0),   # Base crânio
        (0.965, 0.068, 0.075, 32, 0.1, 0.0, 0.0),   # Mandíbula
        (0.980, 0.072, 0.082, 32, 0.08, 0.0, 0.0),  # Face inferior
        (1.000, 0.075, 0.088, 32, 0.05, 0.0, 0.0),  # Face média
        (1.020, 0.074, 0.085, 32, 0.0, 0.0, 0.0),   # Têmporas
        (1.045, 0.072, 0.082, 32, 0.0, 0.0, 0.0),   # Testa
        (1.070, 0.065, 0.072, 28, 0.0, 0.0, 0.0),   # Topo cabeça
        (1.090, 0.045, 0.050, 20, 0.0, 0.0, 0.0),   # Coroa
        (1.100, 0.020, 0.022, 12, 0.0, 0.0, 0.0),   # Pico
    ]
    
    current_idx = 0
    
    for i, (y_rel, w_x, d_z, n_pts, f_flat, b_flat, s_bulge) in enumerate(anatomy):
        y = y_rel * height
        profile = create_ellipsoid_profile(w_x, d_z, n_pts, f_flat, b_flat, s_bulge)
        
        for x, z in profile:
            vertices.append([x, y, z])
        
        if i > 0:
            prev_n = anatomy[i-1][3]
            curr_n = n_pts
            prev_start = current_idx - prev_n
            curr_start = current_idx
            
            # Conectar anéis com diferentes números de pontos
            for j in range(max(prev_n, curr_n)):
                p_idx = prev_start + (j * prev_n // max(prev_n, curr_n)) % prev_n
                c_idx = curr_start + (j * curr_n // max(prev_n, curr_n)) % curr_n
                np_idx = prev_start + ((j + 1) * prev_n // max(prev_n, curr_n)) % prev_n
                nc_idx = curr_start + ((j + 1) * curr_n // max(prev_n, curr_n)) % curr_n
                
                if p_idx != np_idx or c_idx != nc_idx:
                    faces.append([p_idx, c_idx, nc_idx])
                    if p_idx != np_idx:
                        faces.append([p_idx, nc_idx, np_idx])
        
        current_idx += n_pts
    
    # Fechar topo
    top_n = anatomy[-1][3]
    top_start = current_idx - top_n
    top_center = len(vertices)
    vertices.append([0, anatomy[-1][0] * height + 0.01, 0])
    for j in range(top_n):
        faces.append([top_start + j, top_center, top_start + (j + 1) % top_n])
    
    # Fechar fundo
    bottom_n = anatomy[0][3]
    bottom_center = len(vertices)
    vertices.append([0, 0.005, 0.04])
    for j in range(bottom_n):
        faces.append([j, (j + 1) % bottom_n, bottom_center])
    
    return np.array(vertices, dtype=np.float32), np.array(faces, dtype=np.int32)

def add_arms(vertices, faces, height=1.75):
    """Adiciona braços detalhados"""
    arm_verts = list(vertices)
    arm_faces = list(faces)
    
    # Braço: (dist_from_center, y_rel, radius_x, radius_z, n_pts)
    arm_segments = [
        (0.195, 0.870, 0.045, 0.040, 20),   # Ombro
        (0.220, 0.840, 0.040, 0.038, 20),   # Deltóide
        (0.240, 0.800, 0.038, 0.036, 20),   # Braço alto
        (0.255, 0.750, 0.036, 0.034, 20),   # Bíceps
        (0.265, 0.700, 0.034, 0.032, 20),   # Braço médio
        (0.270, 0.650, 0.030, 0.028, 18),   # Cotovelo
        (0.275, 0.600, 0.028, 0.025, 18),   # Antebraço alto
        (0.278, 0.550, 0.026, 0.023, 18),   # Antebraço médio
        (0.280, 0.500, 0.022, 0.020, 16),   # Pulso
        (0.282, 0.470, 0.024, 0.012, 14),   # Mão
        (0.283, 0.450, 0.020, 0.010, 12),   # Dedos
    ]
    
    for side in [-1, 1]:
        base_idx = len(arm_verts)
        
        for i, (dist, y_rel, rx, rz, n) in enumerate(arm_segments):
            y = y_rel * height
            x_center = dist * side
            
            for j in range(n):
                angle = 2 * np.pi * j / n
                x = x_center + rx * np.cos(angle) * side * 0.8
                z = rz * np.sin(angle)
                arm_verts.append([x, y, z])
            
            if i > 0:
                prev_n = arm_segments[i-1][4]
                curr_n = n
                prev_start = base_idx + sum(s[4] for s in arm_segments[:i-1])
                curr_start = base_idx + sum(s[4] for s in arm_segments[:i])
                
                for j in range(max(prev_n, curr_n)):
                    pi = prev_start + (j * prev_n // max(prev_n, curr_n)) % prev_n
                    ci = curr_start + (j * curr_n // max(prev_n, curr_n)) % curr_n
                    npi = prev_start + ((j + 1) * prev_n // max(prev_n, curr_n)) % prev_n
                    nci = curr_start + ((j + 1) * curr_n // max(prev_n, curr_n)) % curr_n
                    
                    arm_faces.append([pi, ci, nci])
                    if pi != npi:
                        arm_faces.append([pi, nci, npi])
        
        # Fechar mão
        hand_start = base_idx + sum(s[4] for s in arm_segments[:-1])
        hand_n = arm_segments[-1][4]
        hand_center = len(arm_verts)
        arm_verts.append([arm_segments[-1][0] * side, arm_segments[-1][1] * height - 0.01, 0])
        for j in range(hand_n):
            arm_faces.append([hand_start + j, hand_center, hand_start + (j + 1) % hand_n])
    
    return np.array(arm_verts, dtype=np.float32), np.array(arm_faces, dtype=np.int32)

def create_morph_targets(vertices, height):
    """Cria morph targets realistas"""
    morph = {}
    n = len(vertices)
    
    # Weight - aumento de massa corporal
    weight = np.zeros((n, 3), dtype=np.float32)
    for i, v in enumerate(vertices):
        y_norm = v[1] / height
        dx, dz = v[0], v[2]
        dist = np.sqrt(dx**2 + dz**2)
        
        if dist > 0.01:
            # Gradiente suave com mais efeito no torso
            torso_factor = np.exp(-((y_norm - 0.65)**2) / 0.08)
            factor = 0.07 * (0.25 + 0.75 * torso_factor)
            weight[i, 0] = dx / dist * factor
            weight[i, 2] = dz / dist * factor
    morph['Weight'] = weight
    
    # AbdomenGirth - barriga proeminente
    abdomen = np.zeros((n, 3), dtype=np.float32)
    for i, v in enumerate(vertices):
        y_norm = v[1] / height
        # Pico na região abdominal
        y_factor = np.exp(-((y_norm - 0.60)**2) / 0.015)
        if v[2] > 0:  # Frente
            front_factor = min(v[2] / 0.08, 1.0)
            abdomen[i, 2] = 0.15 * y_factor * front_factor
            # Também expande lateralmente
            if abs(v[0]) > 0.05:
                abdomen[i, 0] = np.sign(v[0]) * 0.03 * y_factor
    morph['AbdomenGirth'] = abdomen
    
    # MuscleMass - definição muscular
    muscle = np.zeros((n, 3), dtype=np.float32)
    for i, v in enumerate(vertices):
        y_norm = v[1] / height
        
        # Peito
        if 0.75 < y_norm < 0.82 and v[2] > 0.02:
            chest_factor = np.exp(-((y_norm - 0.79)**2) / 0.003)
            muscle[i, 2] += 0.03 * chest_factor
        
        # Ombros/deltoides
        if 0.84 < y_norm < 0.89 and abs(v[0]) > 0.12:
            muscle[i, 0] += np.sign(v[0]) * 0.025
        
        # Braços
        if abs(v[0]) > 0.2 and 0.5 < y_norm < 0.85:
            muscle[i, 0] += np.sign(v[0]) * 0.02
        
        # Coxas
        if y_norm < 0.48 and y_norm > 0.28:
            dist_xz = np.sqrt(v[0]**2 + v[2]**2)
            if dist_xz > 0.04:
                thigh_factor = np.exp(-((y_norm - 0.40)**2) / 0.01)
                muscle[i, 0] += v[0] / dist_xz * 0.02 * thigh_factor
                muscle[i, 2] += v[2] / dist_xz * 0.02 * thigh_factor
    morph['MuscleMass'] = muscle
    
    # Posture - curvatura espinhal
    posture = np.zeros((n, 3), dtype=np.float32)
    for i, v in enumerate(vertices):
        y_norm = v[1] / height
        if y_norm > 0.82:
            factor = (y_norm - 0.82) / 0.18
            posture[i, 1] = -0.07 * factor**2
            posture[i, 2] = 0.08 * factor
    morph['Posture'] = posture
    
    # DiabetesEffect
    diabetes = weight * 0.35 + abdomen * 0.55 + np.zeros_like(weight)
    for i, v in enumerate(vertices):
        y_norm = v[1] / height
        # Retenção de líquidos nas pernas
        if y_norm < 0.3:
            dist = np.sqrt(v[0]**2 + v[2]**2)
            if dist > 0.02:
                diabetes[i, 0] += v[0] / dist * 0.015
                diabetes[i, 2] += v[2] / dist * 0.015
    morph['DiabetesEffect'] = diabetes.astype(np.float32)
    
    # HypertensionEffect
    hypertension = weight * 0.25 + abdomen * 0.35
    morph['HypertensionEffect'] = hypertension.astype(np.float32)
    
    # HeartDiseaseEffect
    heart = weight * 0.45 + posture * 0.35 + abdomen * 0.2
    morph['HeartDiseaseEffect'] = heart.astype(np.float32)
    
    return morph

def export_glb(vertices, faces, normals, morphs, output_name):
    """Exporta para GLB"""
    buffer = bytearray()
    
    v_off = len(buffer)
    buffer.extend(vertices.tobytes())
    
    n_off = len(buffer)
    buffer.extend(normals.tobytes())
    
    i_off = len(buffer)
    indices = faces.flatten().astype(np.uint32)
    buffer.extend(indices.tobytes())
    
    m_offs = {}
    for name, delta in morphs.items():
        m_offs[name] = len(buffer)
        buffer.extend(delta.astype(np.float32).tobytes())
    
    gltf = GLTF2()
    gltf.buffers = [Buffer(byteLength=len(buffer))]
    
    bv = []
    ac = []
    
    bv.append(BufferView(buffer=0, byteOffset=v_off, byteLength=vertices.nbytes, target=34962))
    ac.append(Accessor(bufferView=0, componentType=5126, count=len(vertices), type="VEC3",
                       max=vertices.max(axis=0).tolist(), min=vertices.min(axis=0).tolist()))
    
    bv.append(BufferView(buffer=0, byteOffset=n_off, byteLength=normals.nbytes, target=34962))
    ac.append(Accessor(bufferView=1, componentType=5126, count=len(normals), type="VEC3"))
    
    bv.append(BufferView(buffer=0, byteOffset=i_off, byteLength=indices.nbytes, target=34963))
    ac.append(Accessor(bufferView=2, componentType=5125, count=len(indices), type="SCALAR"))
    
    m_acc = {}
    for name, delta in morphs.items():
        bvi = len(bv)
        bv.append(BufferView(buffer=0, byteOffset=m_offs[name], byteLength=delta.nbytes, target=34962))
        aci = len(ac)
        ac.append(Accessor(bufferView=bvi, componentType=5126, count=len(delta), type="VEC3",
                           max=delta.max(axis=0).tolist(), min=delta.min(axis=0).tolist()))
        m_acc[name] = aci
    
    gltf.bufferViews = bv
    gltf.accessors = ac
    
    gltf.materials = [Material(
        pbrMetallicRoughness={
            "baseColorFactor": [0.85, 0.82, 0.80, 1.0],
            "metallicFactor": 0.0,
            "roughnessFactor": 0.40
        },
        doubleSided=True
    )]
    
    names = list(morphs.keys())
    targets = [{"POSITION": m_acc[n]} for n in names]
    
    gltf.meshes = [GLTFMesh(
        primitives=[Primitive(
            attributes={"POSITION": 0, "NORMAL": 1},
            indices=2,
            material=0,
            targets=targets
        )],
        weights=[0.0] * len(morphs),
        extras={"targetNames": names}
    )]
    
    gltf.nodes = [Node(mesh=0, name="Avatar")]
    gltf.scenes = [Scene(nodes=[0])]
    gltf.scene = 0
    
    gltf.set_binary_blob(bytes(buffer))
    gltf.save(output_name)
    print(f"✓ {output_name}")
    return gltf, names

def main():
    height = 1.75
    
    print("Criando corpo ultra-detalhado...")
    verts, faces = create_detailed_human_body(height=height)
    print(f"Corpo: {len(verts)} vértices, {len(faces)} faces")
    
    print("Adicionando braços...")
    verts, faces = add_arms(verts, faces, height)
    print(f"Com braços: {len(verts)} vértices, {len(faces)} faces")
    
    # Subdividir 2x para mais detalhes
    print("Subdividindo mesh...")
    mesh = trimesh.Trimesh(vertices=verts, faces=faces)
    mesh = mesh.subdivide()
    mesh = mesh.subdivide()
    
    # Suavizar
    print("Suavizando...")
    trimesh.smoothing.filter_laplacian(mesh, lamb=0.5, iterations=8)
    
    verts = mesh.vertices.astype(np.float32)
    faces = mesh.faces.astype(np.int32)
    
    print(f"Final: {len(verts)} vértices, {len(faces)} faces")
    
    # Centralizar
    verts[:, 0] -= verts[:, 0].mean()
    verts[:, 2] -= verts[:, 2].mean()
    verts[:, 1] -= verts[:, 1].min()
    
    actual_height = verts[:, 1].max()
    print(f"Altura: {actual_height:.2f}m")
    
    # Normais
    mesh = trimesh.Trimesh(vertices=verts, faces=faces)
    mesh.fix_normals()
    normals = mesh.vertex_normals.astype(np.float32)
    
    # Morph targets
    print("Criando morph targets...")
    morphs = create_morph_targets(verts, actual_height)
    
    # Exportar
    print("Exportando GLB...")
    gltf, names = export_glb(verts, faces, normals, morphs, "avatar_morphable.glb")
    
    gltf.meshes[0].weights = [0.0] * len(morphs)
    gltf.save("avatar_baseline.glb")
    print("✓ avatar_baseline.glb")
    
    weights = [0.0] * len(morphs)
    weights[names.index('Weight')] = 0.6
    weights[names.index('AbdomenGirth')] = 0.7
    weights[names.index('DiabetesEffect')] = 0.5
    gltf.meshes[0].weights = weights
    gltf.save("avatar_clinical.glb")
    print("✓ avatar_clinical.glb")
    
    meta = {
        "morphTargets": {n: {"index": i, "range": [0, 1]} for i, n in enumerate(names)},
        "vertexCount": len(verts),
        "faceCount": len(faces),
        "height": float(actual_height),
        "source": "Ultra-Detailed Procedural Model"
    }
    with open("avatar_metadata.json", "w") as f:
        json.dump(meta, f, indent=2)
    print("✓ avatar_metadata.json")
    
    print(f"\n✅ Modelo criado: {len(verts)} vértices, {len(faces)} faces")

if __name__ == "__main__":
    main()
