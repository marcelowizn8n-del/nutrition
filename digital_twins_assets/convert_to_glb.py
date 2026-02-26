import trimesh
import numpy as np
import json
from pygltflib import GLTF2, Scene, Node, Mesh as GLTFMesh, Primitive, Accessor, BufferView, Buffer, Material

def load_obj_and_create_glb():
    print("Carregando modelo OBJ do Blender...")
    mesh = trimesh.load("avatar_blender.obj")
    
    if isinstance(mesh, trimesh.Scene):
        # Combinar todas as geometrias
        geometries = list(mesh.geometry.values())
        if geometries:
            mesh = trimesh.util.concatenate(geometries)
    
    print(f"Mesh carregada: {len(mesh.vertices)} vértices, {len(mesh.faces)} faces")
    
    # Garantir que é um Trimesh
    if not isinstance(mesh, trimesh.Trimesh):
        print("Convertendo para Trimesh...")
        mesh = trimesh.Trimesh(vertices=mesh.vertices, faces=mesh.faces)
    
    # Suavizar normais
    mesh.fix_normals()
    
    vertices = mesh.vertices.astype(np.float32)
    normals = mesh.vertex_normals.astype(np.float32)
    faces = mesh.faces.astype(np.uint32)
    
    # Calcular centro do corpo
    center = vertices.mean(axis=0)
    center[2] = vertices[:, 2].mean()  # Centro Z
    
    print(f"Centro do modelo: {center}")
    print(f"Range Z: {vertices[:, 2].min():.2f} - {vertices[:, 2].max():.2f}")
    
    # Criar morph targets
    print("Criando morph targets...")
    morph_targets = {}
    
    # 1. Weight
    weight_delta = np.zeros_like(vertices)
    for i, v in enumerate(vertices):
        dx, dy = v[0] - center[0], v[1] - center[1]
        dist = np.sqrt(dx**2 + dy**2)
        if dist > 0.02:
            z_factor = np.exp(-((v[2] - 0.9)**2) / 0.15)
            factor = 0.04 * (0.4 + 0.6 * z_factor)
            weight_delta[i, 0] = dx/dist * factor
            weight_delta[i, 1] = dy/dist * factor
    morph_targets['Weight'] = weight_delta.astype(np.float32)
    
    # 2. AbdomenGirth
    abdomen_delta = np.zeros_like(vertices)
    for i, v in enumerate(vertices):
        z_factor = np.exp(-((v[2] - 0.7)**2) / 0.06)
        if v[1] > 0.02:
            front_factor = min(v[1] / 0.12, 1.0)
            abdomen_delta[i, 1] = 0.08 * z_factor * front_factor
    morph_targets['AbdomenGirth'] = abdomen_delta.astype(np.float32)
    
    # 3. MuscleMass
    muscle_delta = np.zeros_like(vertices)
    for i, v in enumerate(vertices):
        if abs(v[0]) > 0.2 and v[2] > 0.5:
            arm_dist = abs(v[0]) - 0.2
            muscle_delta[i, 0] = np.sign(v[0]) * 0.02 * min(arm_dist/0.15, 1.0)
        
        if v[2] < 0.4:
            dist_xy = np.sqrt(v[0]**2 + v[1]**2)
            if dist_xy > 0.03:
                leg_factor = np.exp(-((v[2] - 0.1)**2) / 0.1)
                muscle_delta[i, 0] += v[0]/dist_xy * 0.015 * leg_factor
                muscle_delta[i, 1] += v[1]/dist_xy * 0.015 * leg_factor
        
        if 1.0 < v[2] < 1.3 and v[1] > 0.05:
            chest_factor = np.exp(-((v[2] - 1.15)**2) / 0.02)
            muscle_delta[i, 1] += 0.02 * chest_factor
    morph_targets['MuscleMass'] = muscle_delta.astype(np.float32)
    
    # 4. Posture
    posture_delta = np.zeros_like(vertices)
    for i, v in enumerate(vertices):
        if v[2] > 1.0:
            z_factor = (v[2] - 1.0) / 0.6
            posture_delta[i, 2] = -0.04 * z_factor**2
            posture_delta[i, 1] = 0.05 * z_factor
    morph_targets['Posture'] = posture_delta.astype(np.float32)
    
    # 5. DiabetesEffect
    diabetes_delta = np.zeros_like(vertices)
    for i, v in enumerate(vertices):
        dx, dy = v[0] - center[0], v[1] - center[1]
        dist = np.sqrt(dx**2 + dy**2)
        if dist > 0.02:
            z_factor = np.exp(-((v[2] - 0.9)**2) / 0.15)
            diabetes_delta[i, 0] = dx/dist * 0.012 * (0.4 + 0.6 * z_factor)
            diabetes_delta[i, 1] = dy/dist * 0.012 * (0.4 + 0.6 * z_factor)
        
        abdomen_factor = np.exp(-((v[2] - 0.7)**2) / 0.06)
        if v[1] > 0.02:
            diabetes_delta[i, 1] += 0.018 * abdomen_factor * min(v[1] / 0.12, 1.0)
    morph_targets['DiabetesEffect'] = diabetes_delta.astype(np.float32)
    
    # 6. HypertensionEffect
    hypertension_delta = np.zeros_like(vertices)
    for i, v in enumerate(vertices):
        dx, dy = v[0], v[1]
        dist = np.sqrt(dx**2 + dy**2)
        if dist > 0.02:
            z_factor = np.exp(-((v[2] - 0.9)**2) / 0.15)
            hypertension_delta[i, 0] = dx/dist * 0.008 * (0.4 + 0.6 * z_factor)
            hypertension_delta[i, 1] = dy/dist * 0.008 * (0.4 + 0.6 * z_factor)
        
        abdomen_factor = np.exp(-((v[2] - 0.7)**2) / 0.06)
        if v[1] > 0.02:
            hypertension_delta[i, 1] += 0.010 * abdomen_factor * min(v[1] / 0.12, 1.0)
    morph_targets['HypertensionEffect'] = hypertension_delta.astype(np.float32)
    
    # 7. HeartDiseaseEffect
    heart_delta = np.zeros_like(vertices)
    for i, v in enumerate(vertices):
        dx, dy = v[0], v[1]
        dist = np.sqrt(dx**2 + dy**2)
        if dist > 0.02:
            z_factor = np.exp(-((v[2] - 0.9)**2) / 0.15)
            heart_delta[i, 0] = dx/dist * 0.015 * (0.4 + 0.6 * z_factor)
            heart_delta[i, 1] = dy/dist * 0.015 * (0.4 + 0.6 * z_factor)
        
        if v[2] > 1.0:
            pz = (v[2] - 1.0) / 0.6
            heart_delta[i, 2] = -0.012 * pz**2
            heart_delta[i, 1] += 0.015 * pz
    morph_targets['HeartDiseaseEffect'] = heart_delta.astype(np.float32)
    
    print(f"Criados {len(morph_targets)} morph targets")
    
    # Criar buffer binário
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
    
    # Construir GLTF
    gltf = GLTF2()
    gltf.buffers = [Buffer(byteLength=len(buffer_data))]
    
    buffer_views = []
    accessors = []
    
    # Vértices
    buffer_views.append(BufferView(buffer=0, byteOffset=vertices_offset, byteLength=vertices.nbytes, target=34962))
    accessors.append(Accessor(bufferView=0, componentType=5126, count=len(vertices), type="VEC3",
                              max=vertices.max(axis=0).tolist(), min=vertices.min(axis=0).tolist()))
    
    # Normais
    buffer_views.append(BufferView(buffer=0, byteOffset=normals_offset, byteLength=normals.nbytes, target=34962))
    accessors.append(Accessor(bufferView=1, componentType=5126, count=len(normals), type="VEC3"))
    
    # Índices
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
    
    # Material
    gltf.materials = [Material(
        pbrMetallicRoughness={
            "baseColorFactor": [0.78, 0.76, 0.74, 1.0],
            "metallicFactor": 0.0,
            "roughnessFactor": 0.65
        },
        doubleSided=True
    )]
    
    # Mesh
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
    
    # Salvar
    gltf.set_binary_blob(bytes(buffer_data))
    
    gltf.save("avatar_morphable.glb")
    print("Salvo: avatar_morphable.glb")
    
    gltf.meshes[0].weights = [0.0] * len(morph_targets)
    gltf.save("avatar_baseline.glb")
    print("Salvo: avatar_baseline.glb")
    
    weights = [0.0] * len(morph_targets)
    weights[target_names.index('DiabetesEffect')] = 0.6
    weights[target_names.index('HypertensionEffect')] = 0.4
    gltf.meshes[0].weights = weights
    gltf.save("avatar_clinical.glb")
    print("Salvo: avatar_clinical.glb")
    
    # Metadata
    metadata = {
        "morphTargets": {name: {
            "index": i,
            "description": {
                "Weight": "Aumento geral de massa corporal",
                "AbdomenGirth": "Circunferência abdominal",
                "MuscleMass": "Massa muscular",
                "Posture": "Postura/curvatura",
                "DiabetesEffect": "Diabetes Tipo 2",
                "HypertensionEffect": "Hipertensão",
                "HeartDiseaseEffect": "Doença Cardíaca"
            }.get(name, "Parâmetro clínico"),
            "range": [0.0, 1.0]
        } for i, name in enumerate(target_names)},
        "vertexCount": len(vertices),
        "faceCount": len(faces),
        "source": "Blender 3.4.1 Metaballs"
    }
    
    with open("avatar_metadata.json", "w") as f:
        json.dump(metadata, f, indent=2, ensure_ascii=False)
    print("Salvo: avatar_metadata.json")
    
    print("\n✅ Conversão concluída!")

if __name__ == "__main__":
    load_obj_and_create_glb()
