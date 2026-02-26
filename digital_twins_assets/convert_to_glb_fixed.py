import trimesh
import numpy as np
import json
from pygltflib import GLTF2, Scene, Node, Mesh as GLTFMesh, Primitive, Accessor, BufferView, Buffer, Material

def load_obj_and_create_glb():
    print("Carregando modelo OBJ do Blender...")
    mesh = trimesh.load("avatar_blender.obj")
    
    if isinstance(mesh, trimesh.Scene):
        geometries = list(mesh.geometry.values())
        if geometries:
            mesh = trimesh.util.concatenate(geometries)
    
    # Blender exporta com Y-up, Three.js usa Y-up também mas trimesh pode mudar
    vertices = mesh.vertices.astype(np.float32).copy()
    
    print(f"Original - X: {vertices[:,0].min():.2f} to {vertices[:,0].max():.2f}")
    print(f"Original - Y: {vertices[:,1].min():.2f} to {vertices[:,1].max():.2f}")
    print(f"Original - Z: {vertices[:,2].min():.2f} to {vertices[:,2].max():.2f}")
    
    # Verificar se Y é a altura (deve ir de ~0 a ~1.4)
    # Se Z for a altura, trocar
    y_range = vertices[:,1].max() - vertices[:,1].min()
    z_range = vertices[:,2].max() - vertices[:,2].min()
    
    if z_range > y_range:
        print("Trocando Y e Z...")
        vertices[:, [1, 2]] = vertices[:, [2, 1]]
    
    # Centralizar em X e Z, manter Y (altura) com pés no chão
    vertices[:, 0] -= vertices[:, 0].mean()
    vertices[:, 2] -= vertices[:, 2].mean()
    min_y = vertices[:, 1].min()
    vertices[:, 1] -= min_y  # Pés no Y=0
    
    print(f"Ajustado - X: {vertices[:,0].min():.2f} to {vertices[:,0].max():.2f}")
    print(f"Ajustado - Y: {vertices[:,1].min():.2f} to {vertices[:,1].max():.2f}")
    print(f"Ajustado - Z: {vertices[:,2].min():.2f} to {vertices[:,2].max():.2f}")
    
    # Recalcular normais
    mesh_fixed = trimesh.Trimesh(vertices=vertices, faces=mesh.faces)
    mesh_fixed.fix_normals()
    
    normals = mesh_fixed.vertex_normals.astype(np.float32)
    faces = mesh_fixed.faces.astype(np.uint32)
    
    print(f"Mesh: {len(vertices)} vértices, {len(faces)} faces")
    
    # Calcular centro do torso (para morph targets)
    torso_mask = (vertices[:, 1] > 0.5) & (vertices[:, 1] < 1.2)
    if torso_mask.any():
        torso_center = vertices[torso_mask].mean(axis=0)
    else:
        torso_center = vertices.mean(axis=0)
    
    print(f"Centro do torso: {torso_center}")
    
    # Altura total
    height = vertices[:, 1].max()
    print(f"Altura total: {height:.2f}m")
    
    # Criar morph targets
    print("Criando morph targets...")
    morph_targets = {}
    
    # 1. Weight - aumentar volume geral (principalmente torso)
    weight_delta = np.zeros_like(vertices)
    for i, v in enumerate(vertices):
        dx = v[0]  # Distância do eixo central X
        dz = v[2]  # Distância do eixo central Z
        dist = np.sqrt(dx**2 + dz**2)
        
        if dist > 0.02:
            # Mais efeito no torso (Y entre 0.4 e 1.2)
            y_factor = np.exp(-((v[1] - 0.8)**2) / 0.15)
            factor = 0.05 * (0.3 + 0.7 * y_factor)
            weight_delta[i, 0] = dx/dist * factor
            weight_delta[i, 2] = dz/dist * factor
    morph_targets['Weight'] = weight_delta.astype(np.float32)
    
    # 2. AbdomenGirth - barriga proeminente
    abdomen_delta = np.zeros_like(vertices)
    for i, v in enumerate(vertices):
        # Região abdominal (Y entre 0.5 e 0.9)
        y_factor = np.exp(-((v[1] - 0.7)**2) / 0.04)
        if v[2] > 0:  # Frente (Z positivo)
            front_factor = min(v[2] / 0.10, 1.0)
            abdomen_delta[i, 2] = 0.10 * y_factor * front_factor
    morph_targets['AbdomenGirth'] = abdomen_delta.astype(np.float32)
    
    # 3. MuscleMass - braços, pernas, peito
    muscle_delta = np.zeros_like(vertices)
    for i, v in enumerate(vertices):
        # Braços (X longe do centro)
        if abs(v[0]) > 0.15 and v[1] > 0.6:
            arm_dist = abs(v[0]) - 0.15
            muscle_delta[i, 0] = np.sign(v[0]) * 0.025 * min(arm_dist/0.20, 1.0)
        
        # Pernas (Y baixo)
        if v[1] < 0.5 and v[1] > 0.05:
            dist_xz = np.sqrt(v[0]**2 + v[2]**2)
            if dist_xz > 0.03:
                leg_factor = np.exp(-((v[1] - 0.25)**2) / 0.05)
                muscle_delta[i, 0] += v[0]/dist_xz * 0.02 * leg_factor
                muscle_delta[i, 2] += v[2]/dist_xz * 0.02 * leg_factor
        
        # Peito
        if 0.9 < v[1] < 1.2 and v[2] > 0.03:
            chest_factor = np.exp(-((v[1] - 1.05)**2) / 0.02)
            muscle_delta[i, 2] += 0.025 * chest_factor
    morph_targets['MuscleMass'] = muscle_delta.astype(np.float32)
    
    # 4. Posture - curvatura da coluna
    posture_delta = np.zeros_like(vertices)
    for i, v in enumerate(vertices):
        if v[1] > 1.0:
            y_factor = (v[1] - 1.0) / (height - 1.0)
            posture_delta[i, 1] = -0.05 * y_factor**2
            posture_delta[i, 2] = 0.06 * y_factor
    morph_targets['Posture'] = posture_delta.astype(np.float32)
    
    # 5. DiabetesEffect (combinação de Weight + AbdomenGirth aumentados)
    diabetes_delta = np.zeros_like(vertices)
    for i, v in enumerate(vertices):
        # Weight component (12%)
        dx, dz = v[0], v[2]
        dist = np.sqrt(dx**2 + dz**2)
        if dist > 0.02:
            y_factor = np.exp(-((v[1] - 0.8)**2) / 0.15)
            factor = 0.012 * (0.3 + 0.7 * y_factor)
            diabetes_delta[i, 0] = dx/dist * factor
            diabetes_delta[i, 2] = dz/dist * factor
        
        # Abdomen component (18%)
        y_factor = np.exp(-((v[1] - 0.7)**2) / 0.04)
        if v[2] > 0:
            diabetes_delta[i, 2] += 0.018 * y_factor * min(v[2] / 0.10, 1.0)
    morph_targets['DiabetesEffect'] = diabetes_delta.astype(np.float32)
    
    # 6. HypertensionEffect
    hypertension_delta = np.zeros_like(vertices)
    for i, v in enumerate(vertices):
        dx, dz = v[0], v[2]
        dist = np.sqrt(dx**2 + dz**2)
        if dist > 0.02:
            y_factor = np.exp(-((v[1] - 0.8)**2) / 0.15)
            factor = 0.008 * (0.3 + 0.7 * y_factor)
            hypertension_delta[i, 0] = dx/dist * factor
            hypertension_delta[i, 2] = dz/dist * factor
        
        y_factor = np.exp(-((v[1] - 0.7)**2) / 0.04)
        if v[2] > 0:
            hypertension_delta[i, 2] += 0.010 * y_factor * min(v[2] / 0.10, 1.0)
    morph_targets['HypertensionEffect'] = hypertension_delta.astype(np.float32)
    
    # 7. HeartDiseaseEffect
    heart_delta = np.zeros_like(vertices)
    for i, v in enumerate(vertices):
        dx, dz = v[0], v[2]
        dist = np.sqrt(dx**2 + dz**2)
        if dist > 0.02:
            y_factor = np.exp(-((v[1] - 0.8)**2) / 0.15)
            factor = 0.015 * (0.3 + 0.7 * y_factor)
            heart_delta[i, 0] = dx/dist * factor
            heart_delta[i, 2] = dz/dist * factor
        
        if v[1] > 1.0:
            py = (v[1] - 1.0) / (height - 1.0)
            heart_delta[i, 1] = -0.015 * py**2
            heart_delta[i, 2] += 0.018 * py
    morph_targets['HeartDiseaseEffect'] = heart_delta.astype(np.float32)
    
    print(f"Criados {len(morph_targets)} morph targets")
    
    # Criar GLTF
    print("Criando arquivo GLB...")
    buffer_data = bytearray()
    
    vertices_offset = len(buffer_data)
    buffer_data.extend(vertices.tobytes())
    
    normals_offset = len(buffer_data)
    buffer_data.extend(normals.tobytes())
    
    indices_offset = len(buffer_data)
    indices_flat = faces.flatten().astype(np.uint32)
    buffer_data.extend(indices_flat.tobytes())
    
    morph_offsets = {}
    for name, delta in morph_targets.items():
        morph_offsets[name] = len(buffer_data)
        buffer_data.extend(delta.tobytes())
    
    gltf = GLTF2()
    gltf.buffers = [Buffer(byteLength=len(buffer_data))]
    
    buffer_views = []
    accessors = []
    
    buffer_views.append(BufferView(buffer=0, byteOffset=vertices_offset, byteLength=vertices.nbytes, target=34962))
    accessors.append(Accessor(bufferView=0, componentType=5126, count=len(vertices), type="VEC3",
                              max=vertices.max(axis=0).tolist(), min=vertices.min(axis=0).tolist()))
    
    buffer_views.append(BufferView(buffer=0, byteOffset=normals_offset, byteLength=normals.nbytes, target=34962))
    accessors.append(Accessor(bufferView=1, componentType=5126, count=len(normals), type="VEC3"))
    
    buffer_views.append(BufferView(buffer=0, byteOffset=indices_offset, byteLength=indices_flat.nbytes, target=34963))
    accessors.append(Accessor(bufferView=2, componentType=5125, count=len(indices_flat), type="SCALAR"))
    
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
            "baseColorFactor": [0.78, 0.76, 0.74, 1.0],
            "metallicFactor": 0.0,
            "roughnessFactor": 0.65
        },
        doubleSided=True
    )]
    
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
    
    gltf.set_binary_blob(bytes(buffer_data))
    
    gltf.save("avatar_morphable.glb")
    print("✓ avatar_morphable.glb")
    
    gltf.meshes[0].weights = [0.0] * len(morph_targets)
    gltf.save("avatar_baseline.glb")
    print("✓ avatar_baseline.glb")
    
    weights = [0.0] * len(morph_targets)
    weights[target_names.index('DiabetesEffect')] = 0.6
    weights[target_names.index('HypertensionEffect')] = 0.4
    gltf.meshes[0].weights = weights
    gltf.save("avatar_clinical.glb")
    print("✓ avatar_clinical.glb")
    
    metadata = {
        "morphTargets": {name: {
            "index": i,
            "range": [0.0, 1.0]
        } for i, name in enumerate(target_names)},
        "vertexCount": len(vertices),
        "faceCount": len(faces),
        "height": float(height),
        "source": "Blender 3.4.1"
    }
    
    with open("avatar_metadata.json", "w") as f:
        json.dump(metadata, f, indent=2)
    print("✓ avatar_metadata.json")
    
    print("\n✅ Modelos GLB criados com sucesso!")

if __name__ == "__main__":
    load_obj_and_create_glb()
