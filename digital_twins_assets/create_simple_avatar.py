"""
Cria avatar humano simples usando primitivas geométricas (cápsulas e esferas).
Abordagem mais robusta que perfis transversais.
"""
import numpy as np
import trimesh
import json
from pygltflib import GLTF2, Scene, Node, Mesh as GLTFMesh, Primitive, Accessor, BufferView, Buffer, Material, PbrMetallicRoughness

def create_capsule(radius, height, center, sections=32):
    """Cria uma cápsula (cilindro com hemisférios nas pontas)"""
    capsule = trimesh.creation.capsule(height=height, radius=radius, count=[sections, sections])
    capsule.apply_translation(center)
    return capsule

def create_ellipsoid(radii, center, subdivisions=3):
    """Cria um elipsoide"""
    sphere = trimesh.creation.icosphere(subdivisions=subdivisions, radius=1.0)
    # Escalar para elipsoide
    sphere.vertices *= np.array(radii)
    sphere.apply_translation(center)
    return sphere

def create_cylinder(radius, height, center, sections=32):
    """Cria um cilindro"""
    cyl = trimesh.creation.cylinder(radius=radius, height=height, sections=sections)
    cyl.apply_translation(center)
    return cyl

def create_human_body(height=1.75):
    """Cria corpo humano usando primitivas geométricas"""
    meshes = []
    
    # Proporções anatômicas (relativas à altura total)
    # Baseado em cânone de 8 cabeças
    head_height = height / 8
    
    # === TORSO ===
    # Torso principal (elipsoide achatado)
    torso_height = head_height * 3.2
    torso_center_y = height * 0.58
    torso = create_ellipsoid(
        radii=[0.18, torso_height/2, 0.12],
        center=[0, torso_center_y, 0],
        subdivisions=3
    )
    meshes.append(torso)
    
    # Quadril/pelve (elipsoide mais largo)
    hip_height = head_height * 0.8
    hip_center_y = height * 0.48
    hip = create_ellipsoid(
        radii=[0.17, hip_height/2, 0.11],
        center=[0, hip_center_y, 0],
        subdivisions=3
    )
    meshes.append(hip)
    
    # === PESCOÇO E CABEÇA ===
    # Pescoço
    neck_radius = 0.045
    neck_height = head_height * 0.5
    neck_center_y = height * 0.88
    neck = create_capsule(
        radius=neck_radius,
        height=neck_height,
        center=[0, neck_center_y, 0]
    )
    meshes.append(neck)
    
    # Cabeça (elipsoide)
    head = create_ellipsoid(
        radii=[0.08, head_height/2 * 0.95, 0.09],
        center=[0, height * 0.96, 0],
        subdivisions=3
    )
    meshes.append(head)
    
    # === PERNAS ===
    leg_offset_x = 0.085  # Distância do centro
    
    for side in [-1, 1]:
        x_offset = side * leg_offset_x
        
        # Coxa
        thigh_radius = 0.065
        thigh_height = head_height * 1.8
        thigh_center_y = height * 0.32
        thigh = create_capsule(
            radius=thigh_radius,
            height=thigh_height,
            center=[x_offset, thigh_center_y, 0]
        )
        meshes.append(thigh)
        
        # Canela
        shin_radius = 0.045
        shin_height = head_height * 1.7
        shin_center_y = height * 0.12
        shin = create_capsule(
            radius=shin_radius,
            height=shin_height,
            center=[x_offset, shin_center_y, 0]
        )
        meshes.append(shin)
        
        # Pé (elipsoide alongado)
        foot = create_ellipsoid(
            radii=[0.045, 0.025, 0.10],
            center=[x_offset, 0.025, 0.03],
            subdivisions=2
        )
        meshes.append(foot)
    
    # === BRAÇOS ===
    arm_offset_x = 0.22
    
    for side in [-1, 1]:
        x_offset = side * arm_offset_x
        
        # Ombro (esfera de transição)
        shoulder = create_ellipsoid(
            radii=[0.05, 0.04, 0.04],
            center=[x_offset * 0.9, height * 0.82, 0],
            subdivisions=2
        )
        meshes.append(shoulder)
        
        # Braço superior
        upper_arm_radius = 0.035
        upper_arm_height = head_height * 1.3
        upper_arm = create_capsule(
            radius=upper_arm_radius,
            height=upper_arm_height,
            center=[x_offset * 1.15, height * 0.70, 0]
        )
        meshes.append(upper_arm)
        
        # Antebraço
        forearm_radius = 0.028
        forearm_height = head_height * 1.1
        forearm = create_capsule(
            radius=forearm_radius,
            height=forearm_height,
            center=[x_offset * 1.25, height * 0.54, 0]
        )
        meshes.append(forearm)
        
        # Mão (elipsoide)
        hand = create_ellipsoid(
            radii=[0.025, 0.04, 0.012],
            center=[x_offset * 1.28, height * 0.44, 0],
            subdivisions=2
        )
        meshes.append(hand)
    
    # Combinar todas as meshes
    combined = trimesh.util.concatenate(meshes)
    
    # Suavizar a mesh combinada
    # Primeiro fazer boolean union para remover geometria interna
    print("  Processando mesh...")
    
    # Merge vertices próximos
    combined.merge_vertices(merge_tex=True, merge_norm=True)
    
    # Remover faces degeneradas
    combined.update_faces(combined.nondegenerate_faces())
    combined.update_faces(combined.unique_faces())
    
    # Corrigir normais
    combined.fix_normals()
    
    # Aplicar suavização
    print("  Aplicando suavização...")
    trimesh.smoothing.filter_laplacian(combined, iterations=2)
    
    return combined

def create_morph_targets(vertices, height=1.75):
    """Cria morph targets para deformações clínicas"""
    n_verts = len(vertices)
    SCALE = 0.04
    
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
                norm = np.linalg.norm(direction)
                if norm > 0:
                    direction = direction / norm
                    factor = 1.0
                    if 0.45 < y_norm < 0.75:
                        factor = 1.5
                    weight[i] = direction * SCALE * factor
    morph_targets['Weight'] = weight
    
    # 2. AbdomenGirth
    abdomen = np.zeros((n_verts, 3), dtype=np.float32)
    for i, v in enumerate(vertices):
        y_norm = (v[1] - y_min) / (y_max - y_min)
        if 0.45 < y_norm < 0.75:
            dist = np.sqrt(v[0]**2 + v[2]**2)
            if dist > 0.02:
                direction = np.array([v[0], 0, v[2]])
                norm = np.linalg.norm(direction)
                if norm > 0:
                    direction = direction / norm
                    front_factor = 1.0 + 0.6 * max(0, v[2] / (abs(v[2]) + 0.01))
                    y_factor = np.exp(-((y_norm - 0.58)**2) / 0.015)
                    abdomen[i] = direction * SCALE * 2.0 * front_factor * y_factor
    morph_targets['AbdomenGirth'] = abdomen
    
    # 3. MuscleMass
    muscle = np.zeros((n_verts, 3), dtype=np.float32)
    for i, v in enumerate(vertices):
        y_norm = (v[1] - y_min) / (y_max - y_min)
        dist = np.sqrt(v[0]**2 + v[2]**2)
        if dist > 0.02:
            direction = np.array([v[0], 0, v[2]])
            norm = np.linalg.norm(direction)
            if norm > 0:
                direction = direction / norm
                if 0.70 < y_norm < 0.88 or abs(v[0]) > 0.15:
                    muscle[i] = direction * SCALE * 0.8
                elif 0.08 < y_norm < 0.45:
                    muscle[i] = direction * SCALE * 0.6
    morph_targets['MuscleMass'] = muscle
    
    # 4. Posture
    posture = np.zeros((n_verts, 3), dtype=np.float32)
    for i, v in enumerate(vertices):
        y_norm = (v[1] - y_min) / (y_max - y_min)
        if 0.5 < y_norm < 0.98:
            forward_lean = (y_norm - 0.5) * 0.08
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
        asset={'version': '2.0', 'generator': 'Digital Twins Simple Avatar'},
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
            baseColorFactor=[0.92, 0.87, 0.84, 1.0],
            metallicFactor=0.0,
            roughnessFactor=0.6
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
    print("Criando avatar simples com primitivas...")
    
    HEIGHT = 1.75
    
    print("  Gerando geometria com primitivas...")
    mesh = create_human_body(HEIGHT)
    
    vertices = np.array(mesh.vertices, dtype=np.float32)
    faces = np.array(mesh.faces, dtype=np.int32)
    
    print(f"  Vértices: {len(vertices)}, Faces: {len(faces)}")
    
    print("  Criando morph targets...")
    morph_targets = create_morph_targets(vertices, HEIGHT)
    
    print("  Exportando GLB...")
    output_path = '/home/ubuntu/digital_twins/nextjs_space/public/models/avatar_morphable.glb'
    target_names = export_to_glb(vertices, faces, morph_targets, output_path)
    
    # Também criar versão feminina (levemente diferente)
    print("  Criando versão feminina...")
    # Ajustar mesh para feminino
    female_mesh = create_human_body(HEIGHT * 0.98)  # Levemente menor
    # Ajustar proporções
    female_verts = np.array(female_mesh.vertices, dtype=np.float32)
    # Quadril mais largo, cintura mais fina
    for i, v in enumerate(female_verts):
        y_norm = v[1] / (HEIGHT * 0.98)
        if 0.45 < y_norm < 0.55:  # Quadril
            female_verts[i, 0] *= 1.08  # Mais largo
        elif 0.58 < y_norm < 0.68:  # Cintura
            female_verts[i, 0] *= 0.92  # Mais fino
    
    female_faces = np.array(female_mesh.faces, dtype=np.int32)
    female_morph_targets = create_morph_targets(female_verts, HEIGHT * 0.98)
    
    female_output = '/home/ubuntu/digital_twins/nextjs_space/public/models/avatar_female.glb'
    export_to_glb(female_verts, female_faces, female_morph_targets, female_output)
    
    # Metadata
    metadata = {
        'morphTargets': {name: {'index': i, 'range': [0, 1]} for i, name in enumerate(target_names)},
        'vertexCount': len(vertices),
        'faceCount': len(faces),
        'height': HEIGHT,
        'generator': 'create_simple_avatar.py'
    }
    
    with open('/home/ubuntu/digital_twins/nextjs_space/public/models/avatar_metadata.json', 'w') as f:
        json.dump(metadata, f, indent=2)
    
    print(f"\n✅ Avatares criados com sucesso!")
    print(f"   - Masculino: {output_path}")
    print(f"   - Feminino: {female_output}")
    print(f"   - Vértices: {len(vertices)}")
    print(f"   - Faces: {len(faces)}")
    print(f"   - Morph targets: {target_names}")

if __name__ == '__main__':
    main()
