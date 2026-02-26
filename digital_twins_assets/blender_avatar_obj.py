import bpy
import bmesh
import math
import os

def clear_scene():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete()

def create_human_body():
    """Cria um corpo humano usando metaballs para forma orgânica"""
    
    # Usar metaballs para criar forma suave
    bpy.ops.object.metaball_add(type='BALL', location=(0, 0, 1.0))
    torso = bpy.context.active_object
    torso.name = "Body"
    mball = torso.data
    mball.resolution = 0.05
    mball.render_resolution = 0.02
    
    # Configurar elemento inicial (tronco superior)
    elem = mball.elements[0]
    elem.radius = 0.25
    elem.co = (0, 0, 0.25)
    
    # Adicionar elementos para formar corpo
    body_parts = [
        # (x, y, z, radius, type) - z relativo ao centro do metaball
        # Tronco
        (0, 0, 0.10, 0.22, 'BALL'),   # Peito
        (0, 0, -0.10, 0.20, 'BALL'),  # Abdômen superior
        (0, 0.02, -0.25, 0.22, 'BALL'), # Abdômen (barriga)
        (0, 0, -0.40, 0.20, 'BALL'),  # Quadril
        
        # Cabeça
        (0, 0, 0.55, 0.15, 'ELLIPSOID'),  # Cabeça
        (0, 0, 0.38, 0.08, 'BALL'),       # Pescoço
        
        # Perna esquerda
        (-0.10, 0, -0.60, 0.10, 'CAPSULE'),  # Coxa
        (-0.10, 0, -0.90, 0.08, 'CAPSULE'),  # Panturrilha
        (-0.10, 0.05, -1.15, 0.06, 'ELLIPSOID'), # Pé
        
        # Perna direita
        (0.10, 0, -0.60, 0.10, 'CAPSULE'),
        (0.10, 0, -0.90, 0.08, 'CAPSULE'),
        (0.10, 0.05, -1.15, 0.06, 'ELLIPSOID'),
        
        # Braço esquerdo
        (-0.28, 0, 0.20, 0.07, 'BALL'),    # Ombro
        (-0.35, 0, 0.02, 0.055, 'CAPSULE'), # Braço
        (-0.40, 0, -0.20, 0.045, 'CAPSULE'), # Antebraço
        (-0.42, 0, -0.38, 0.04, 'ELLIPSOID'), # Mão
        
        # Braço direito
        (0.28, 0, 0.20, 0.07, 'BALL'),
        (0.35, 0, 0.02, 0.055, 'CAPSULE'),
        (0.40, 0, -0.20, 0.045, 'CAPSULE'),
        (0.42, 0, -0.38, 0.04, 'ELLIPSOID'),
    ]
    
    for x, y, z, radius, elem_type in body_parts:
        elem = mball.elements.new()
        elem.co = (x, y, z)
        elem.radius = radius
        if elem_type == 'ELLIPSOID':
            elem.type = 'ELLIPSOID'
            elem.size_x = radius * 0.8
            elem.size_y = radius * 1.2
            elem.size_z = radius
        elif elem_type == 'CAPSULE':
            elem.type = 'CAPSULE'
            elem.size_x = radius * 1.5
        else:
            elem.type = 'BALL'
    
    # Converter metaball para mesh
    bpy.ops.object.convert(target='MESH')
    body = bpy.context.active_object
    body.name = "Avatar"
    
    # Suavizar
    bpy.ops.object.shade_smooth()
    
    # Adicionar subdivision surface
    subsurf = body.modifiers.new(name="Subsurf", type='SUBSURF')
    subsurf.levels = 1
    subsurf.render_levels = 2
    
    # Aplicar modificador
    bpy.ops.object.modifier_apply(modifier="Subsurf")
    
    return body

def add_shape_keys(obj):
    """Adiciona shape keys para morph targets"""
    
    mesh = obj.data
    
    # Criar shape key base
    obj.shape_key_add(name='Basis')
    basis = obj.data.shape_keys.key_blocks['Basis']
    
    # Weight - aumentar volume geral
    sk_weight = obj.shape_key_add(name='Weight')
    for i, v in enumerate(sk_weight.data):
        # Centro aproximado do corpo
        cx, cy, cz = 0, 0, 1.0
        dx = v.co.x - cx
        dy = v.co.y - cy
        
        dist = math.sqrt(dx*dx + dy*dy)
        if dist > 0.02:
            # Mais efeito no torso (z entre 0.5 e 1.3)
            z_factor = math.exp(-((v.co.z - 0.9)**2) / 0.15)
            factor = 0.04 * (0.4 + 0.6 * z_factor)
            v.co.x += dx/dist * factor
            v.co.y += dy/dist * factor
    
    # AbdomenGirth
    sk_abdomen = obj.shape_key_add(name='AbdomenGirth')
    for i, v in enumerate(sk_abdomen.data):
        z_factor = math.exp(-((v.co.z - 0.7)**2) / 0.06)
        if v.co.y > 0.02:  # Frente
            front_factor = min(v.co.y / 0.12, 1.0)
            v.co.y += 0.08 * z_factor * front_factor
    
    # MuscleMass
    sk_muscle = obj.shape_key_add(name='MuscleMass')
    for i, v in enumerate(sk_muscle.data):
        # Braços (x longe do centro)
        if abs(v.co.x) > 0.2 and v.co.z > 0.5:
            arm_dist = abs(v.co.x) - 0.2
            v.co.x += math.copysign(0.02 * min(arm_dist/0.15, 1.0), v.co.x)
        
        # Pernas
        if v.co.z < 0.4:
            dist_xy = math.sqrt(v.co.x**2 + v.co.y**2)
            if dist_xy > 0.03:
                leg_factor = math.exp(-((v.co.z - 0.1)**2) / 0.1)
                v.co.x += v.co.x/dist_xy * 0.015 * leg_factor
                v.co.y += v.co.y/dist_xy * 0.015 * leg_factor
        
        # Peito
        if 1.0 < v.co.z < 1.3 and v.co.y > 0.05:
            chest_factor = math.exp(-((v.co.z - 1.15)**2) / 0.02)
            v.co.y += 0.02 * chest_factor
    
    # Posture
    sk_posture = obj.shape_key_add(name='Posture')
    for i, v in enumerate(sk_posture.data):
        if v.co.z > 1.0:
            z_factor = (v.co.z - 1.0) / 0.6
            v.co.z -= 0.04 * z_factor**2
            v.co.y += 0.05 * z_factor
    
    # Disease effects (compostos)
    sk_diabetes = obj.shape_key_add(name='DiabetesEffect')
    for i, v in enumerate(sk_diabetes.data):
        cx, cy, cz = 0, 0, 1.0
        dx, dy = v.co.x - cx, v.co.y - cy
        dist = math.sqrt(dx*dx + dy*dy)
        
        if dist > 0.02:
            z_factor = math.exp(-((v.co.z - 0.9)**2) / 0.15)
            v.co.x += dx/dist * 0.012 * (0.4 + 0.6 * z_factor)
            v.co.y += dy/dist * 0.012 * (0.4 + 0.6 * z_factor)
        
        abdomen_factor = math.exp(-((v.co.z - 0.7)**2) / 0.06)
        if v.co.y > 0.02:
            v.co.y += 0.018 * abdomen_factor * min(v.co.y / 0.12, 1.0)
    
    sk_hypertension = obj.shape_key_add(name='HypertensionEffect')
    for i, v in enumerate(sk_hypertension.data):
        cx, cy = 0, 0
        dx, dy = v.co.x - cx, v.co.y - cy
        dist = math.sqrt(dx*dx + dy*dy)
        
        if dist > 0.02:
            z_factor = math.exp(-((v.co.z - 0.9)**2) / 0.15)
            v.co.x += dx/dist * 0.008 * (0.4 + 0.6 * z_factor)
            v.co.y += dy/dist * 0.008 * (0.4 + 0.6 * z_factor)
        
        abdomen_factor = math.exp(-((v.co.z - 0.7)**2) / 0.06)
        if v.co.y > 0.02:
            v.co.y += 0.010 * abdomen_factor * min(v.co.y / 0.12, 1.0)
    
    sk_heart = obj.shape_key_add(name='HeartDiseaseEffect')
    for i, v in enumerate(sk_heart.data):
        cx, cy = 0, 0
        dx, dy = v.co.x - cx, v.co.y - cy
        dist = math.sqrt(dx*dx + dy*dy)
        
        if dist > 0.02:
            z_factor = math.exp(-((v.co.z - 0.9)**2) / 0.15)
            v.co.x += dx/dist * 0.015 * (0.4 + 0.6 * z_factor)
            v.co.y += dy/dist * 0.015 * (0.4 + 0.6 * z_factor)
        
        if v.co.z > 1.0:
            pz = (v.co.z - 1.0) / 0.6
            v.co.z -= 0.012 * pz**2
            v.co.y += 0.015 * pz

def create_material():
    mat = bpy.data.materials.new(name="ClinicalGray")
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    principled = nodes.get("Principled BSDF")
    if principled:
        principled.inputs["Base Color"].default_value = (0.78, 0.76, 0.74, 1.0)
        principled.inputs["Roughness"].default_value = 0.65
        principled.inputs["Metallic"].default_value = 0.0
    return mat

def main():
    print("Iniciando geração do avatar com metaballs...")
    
    clear_scene()
    
    print("Criando corpo humano...")
    body = create_human_body()
    
    print(f"Mesh criada: {len(body.data.vertices)} vértices, {len(body.data.polygons)} faces")
    
    print("Adicionando morph targets...")
    add_shape_keys(body)
    
    print("Aplicando material...")
    mat = create_material()
    body.data.materials.append(mat)
    
    # Ajustar posição (pés no chão)
    min_z = min(v.co.z for v in body.data.vertices)
    body.location.z = -min_z + 0.02
    bpy.ops.object.transform_apply(location=True)
    
    # Exportar OBJ para referência
    output_dir = "/home/ubuntu/digital_twins_assets"
    
    print("Exportando OBJ...")
    bpy.ops.export_scene.obj(
        filepath=os.path.join(output_dir, "avatar_blender.obj"),
        use_selection=True,
        use_mesh_modifiers=True
    )
    
    # Salvar .blend
    print("Salvando arquivo Blender...")
    bpy.ops.wm.save_as_mainfile(
        filepath=os.path.join(output_dir, "avatar.blend")
    )
    
    print("\n✅ Arquivos criados!")
    print(f"   Vértices: {len(body.data.vertices)}")
    print(f"   Faces: {len(body.data.polygons)}")

if __name__ == "__main__":
    main()
