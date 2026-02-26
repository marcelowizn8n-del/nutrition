import bpy
import bmesh
import math
import os

def clear_scene():
    """Limpa a cena"""
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete()

def create_human_body():
    """Cria um corpo humano usando metaballs e mesh"""
    
    # Usar Human Meta-Rig como base se disponível, ou criar manualmente
    
    # Criar corpo usando cilindros e esferas modificados
    bpy.ops.mesh.primitive_cylinder_add(radius=0.15, depth=0.5, location=(0, 0, 1.0))
    torso = bpy.context.active_object
    torso.name = "Torso"
    
    # Subdividir e esculpir
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.subdivide(number_cuts=3)
    bpy.ops.object.mode_set(mode='OBJECT')
    
    # Adicionar modifier Subdivision Surface
    subsurf = torso.modifiers.new(name="Subsurf", type='SUBSURF')
    subsurf.levels = 2
    subsurf.render_levels = 3
    
    # Criar cabeça
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.12, location=(0, 0, 1.65))
    head = bpy.context.active_object
    head.name = "Head"
    head.scale = (1.0, 0.9, 1.1)  # Alongar verticalmente
    
    # Subdividir cabeça
    subsurf_head = head.modifiers.new(name="Subsurf", type='SUBSURF')
    subsurf_head.levels = 2
    
    # Criar pescoço
    bpy.ops.mesh.primitive_cylinder_add(radius=0.06, depth=0.15, location=(0, 0, 1.48))
    neck = bpy.context.active_object
    neck.name = "Neck"
    
    # Criar abdômen
    bpy.ops.mesh.primitive_cylinder_add(radius=0.14, depth=0.3, location=(0, 0, 0.65))
    abdomen = bpy.context.active_object
    abdomen.name = "Abdomen"
    
    # Criar quadril
    bpy.ops.mesh.primitive_cylinder_add(radius=0.16, depth=0.2, location=(0, 0, 0.45))
    hip = bpy.context.active_object
    hip.name = "Hip"
    
    # Criar pernas
    for side in [-1, 1]:
        x_offset = 0.08 * side
        
        # Coxa
        bpy.ops.mesh.primitive_cylinder_add(radius=0.07, depth=0.45, location=(x_offset, 0, 0.12))
        thigh = bpy.context.active_object
        thigh.name = f"Thigh_{'L' if side < 0 else 'R'}"
        
        # Panturrilha
        bpy.ops.mesh.primitive_cylinder_add(radius=0.05, depth=0.42, location=(x_offset, 0, -0.35))
        calf = bpy.context.active_object
        calf.name = f"Calf_{'L' if side < 0 else 'R'}"
        
        # Pé
        bpy.ops.mesh.primitive_cube_add(size=0.12, location=(x_offset, 0.04, -0.60))
        foot = bpy.context.active_object
        foot.name = f"Foot_{'L' if side < 0 else 'R'}"
        foot.scale = (0.5, 1.2, 0.3)
    
    # Criar braços
    for side in [-1, 1]:
        x_offset = 0.22 * side
        
        # Ombro
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.055, location=(x_offset, 0, 1.32))
        shoulder = bpy.context.active_object
        shoulder.name = f"Shoulder_{'L' if side < 0 else 'R'}"
        
        # Braço superior
        bpy.ops.mesh.primitive_cylinder_add(radius=0.04, depth=0.30, location=(x_offset + 0.02*side, 0, 1.12))
        upper_arm = bpy.context.active_object
        upper_arm.name = f"UpperArm_{'L' if side < 0 else 'R'}"
        
        # Antebraço
        bpy.ops.mesh.primitive_cylinder_add(radius=0.035, depth=0.28, location=(x_offset + 0.04*side, 0, 0.83))
        forearm = bpy.context.active_object
        forearm.name = f"Forearm_{'L' if side < 0 else 'R'}"
        
        # Mão
        bpy.ops.mesh.primitive_cube_add(size=0.06, location=(x_offset + 0.05*side, 0, 0.65))
        hand = bpy.context.active_object
        hand.name = f"Hand_{'L' if side < 0 else 'R'}"
        hand.scale = (0.6, 0.3, 1.0)
    
    # Selecionar todos e unir
    bpy.ops.object.select_all(action='SELECT')
    bpy.context.view_layer.objects.active = torso
    bpy.ops.object.join()
    
    # Renomear objeto final
    body = bpy.context.active_object
    body.name = "Avatar"
    
    # Aplicar Subdivision Surface
    bpy.ops.object.modifier_add(type='SUBSURF')
    body.modifiers["Subdivision"].levels = 2
    body.modifiers["Subdivision"].render_levels = 3
    
    # Aplicar Smooth
    bpy.ops.object.shade_smooth()
    
    # Remesh para unificar a geometria
    bpy.ops.object.modifier_add(type='REMESH')
    body.modifiers["Remesh"].mode = 'SMOOTH'
    body.modifiers["Remesh"].octree_depth = 7
    body.modifiers["Remesh"].scale = 0.99
    body.modifiers["Remesh"].use_smooth_shade = True
    
    # Aplicar modificadores
    bpy.ops.object.modifier_apply(modifier="Subdivision")
    bpy.ops.object.modifier_apply(modifier="Remesh")
    
    return body

def add_shape_keys(obj):
    """Adiciona shape keys para morph targets"""
    
    # Criar shape key base
    obj.shape_key_add(name='Basis')
    
    # Weight - aumentar volume geral
    sk_weight = obj.shape_key_add(name='Weight')
    for i, v in enumerate(sk_weight.data):
        # Calcular direção do centro
        center = (0, 0, 1.0)
        dx = v.co.x - center[0]
        dy = v.co.y - center[1]
        dz = v.co.z - center[2]
        dist = math.sqrt(dx*dx + dy*dy)
        
        if dist > 0.01:
            # Mais efeito no torso
            y_factor = math.exp(-((v.co.z - 1.0)**2) / 0.2)
            factor = 0.03 * (0.5 + y_factor)
            v.co.x += dx/dist * factor
            v.co.y += dy/dist * factor
    
    # AbdomenGirth - aumentar barriga
    sk_abdomen = obj.shape_key_add(name='AbdomenGirth')
    for i, v in enumerate(sk_abdomen.data):
        # Região abdominal
        y_factor = math.exp(-((v.co.z - 0.85)**2) / 0.08)
        if v.co.y > 0:  # Frente
            v.co.y += 0.06 * y_factor * (v.co.y / 0.15)
    
    # MuscleMass - aumentar músculos
    sk_muscle = obj.shape_key_add(name='MuscleMass')
    for i, v in enumerate(sk_muscle.data):
        # Braços
        if abs(v.co.x) > 0.15:
            factor = (abs(v.co.x) - 0.15) / 0.1
            v.co.x += math.copysign(0.015 * min(factor, 1.0), v.co.x)
        
        # Pernas
        if v.co.z < 0.4 and v.co.z > -0.5:
            dist = math.sqrt(v.co.x**2 + v.co.y**2)
            if dist > 0.01:
                leg_factor = 0.5 + 0.5 * math.sin(math.pi * (v.co.z + 0.5) / 0.9)
                v.co.x += v.co.x/dist * 0.01 * leg_factor
                v.co.y += v.co.y/dist * 0.01 * leg_factor
    
    # Posture - curvatura da coluna
    sk_posture = obj.shape_key_add(name='Posture')
    for i, v in enumerate(sk_posture.data):
        if v.co.z > 1.0:
            z_factor = (v.co.z - 1.0) / 0.7
            v.co.z -= 0.03 * z_factor**2
            v.co.y += 0.04 * z_factor
    
    # DiabetesEffect
    sk_diabetes = obj.shape_key_add(name='DiabetesEffect')
    for i, v in enumerate(sk_diabetes.data):
        # Combinação de Weight e AbdomenGirth
        center = (0, 0, 1.0)
        dx = v.co.x - center[0]
        dy = v.co.y - center[1]
        dist = math.sqrt(dx*dx + dy*dy)
        
        # Weight component
        if dist > 0.01:
            y_factor = math.exp(-((v.co.z - 1.0)**2) / 0.2)
            factor = 0.012 * (0.5 + y_factor)
            v.co.x += dx/dist * factor
            v.co.y += dy/dist * factor
        
        # Abdomen component
        abdomen_factor = math.exp(-((v.co.z - 0.85)**2) / 0.08)
        if v.co.y > 0:
            v.co.y += 0.018 * abdomen_factor * (v.co.y / 0.15)
    
    # HypertensionEffect
    sk_hypertension = obj.shape_key_add(name='HypertensionEffect')
    for i, v in enumerate(sk_hypertension.data):
        center = (0, 0, 1.0)
        dx = v.co.x - center[0]
        dy = v.co.y - center[1]
        dist = math.sqrt(dx*dx + dy*dy)
        
        if dist > 0.01:
            y_factor = math.exp(-((v.co.z - 1.0)**2) / 0.2)
            factor = 0.008 * (0.5 + y_factor)
            v.co.x += dx/dist * factor
            v.co.y += dy/dist * factor
        
        abdomen_factor = math.exp(-((v.co.z - 0.85)**2) / 0.08)
        if v.co.y > 0:
            v.co.y += 0.010 * abdomen_factor * (v.co.y / 0.15)
    
    # HeartDiseaseEffect
    sk_heart = obj.shape_key_add(name='HeartDiseaseEffect')
    for i, v in enumerate(sk_heart.data):
        center = (0, 0, 1.0)
        dx = v.co.x - center[0]
        dy = v.co.y - center[1]
        dist = math.sqrt(dx*dx + dy*dy)
        
        if dist > 0.01:
            y_factor = math.exp(-((v.co.z - 1.0)**2) / 0.2)
            factor = 0.015 * (0.5 + y_factor)
            v.co.x += dx/dist * factor
            v.co.y += dy/dist * factor
        
        # Posture component
        if v.co.z > 1.0:
            z_factor = (v.co.z - 1.0) / 0.7
            v.co.z -= 0.009 * z_factor**2
            v.co.y += 0.012 * z_factor

def create_material():
    """Cria material cinza clínico"""
    mat = bpy.data.materials.new(name="ClinicalGray")
    mat.use_nodes = True
    
    # Configurar nós
    nodes = mat.node_tree.nodes
    principled = nodes.get("Principled BSDF")
    
    if principled:
        principled.inputs["Base Color"].default_value = (0.78, 0.76, 0.74, 1.0)
        principled.inputs["Roughness"].default_value = 0.7
        principled.inputs["Metallic"].default_value = 0.0
    
    return mat

def main():
    print("Iniciando geração do avatar...")
    
    # Limpar cena
    clear_scene()
    
    # Criar corpo
    print("Criando corpo humano...")
    body = create_human_body()
    
    # Adicionar shape keys
    print("Adicionando morph targets...")
    add_shape_keys(body)
    
    # Criar e aplicar material
    print("Aplicando material...")
    mat = create_material()
    body.data.materials.append(mat)
    
    # Centralizar origem
    bpy.ops.object.origin_set(type='ORIGIN_CENTER_OF_VOLUME')
    
    # Mover para pés no chão
    body.location.z = 0.65
    
    # Exportar GLB
    output_dir = "/home/ubuntu/digital_twins_assets"
    
    # Exportar morphable (base)
    print("Exportando avatar_morphable.glb...")
    bpy.ops.export_scene.gltf(
        filepath=os.path.join(output_dir, "avatar_morphable.glb"),
        export_format='GLB',
        export_morph=True,
        export_morph_normal=True,
        export_materials='EXPORT',
        export_apply=False
    )
    
    # Exportar baseline (shape keys em 0)
    for key in body.data.shape_keys.key_blocks:
        key.value = 0.0
    
    print("Exportando avatar_baseline.glb...")
    bpy.ops.export_scene.gltf(
        filepath=os.path.join(output_dir, "avatar_baseline.glb"),
        export_format='GLB',
        export_morph=True,
        export_morph_normal=True,
        export_materials='EXPORT',
        export_apply=False
    )
    
    # Exportar clinical (com condições)
    body.data.shape_keys.key_blocks["DiabetesEffect"].value = 0.6
    body.data.shape_keys.key_blocks["HypertensionEffect"].value = 0.4
    
    print("Exportando avatar_clinical.glb...")
    bpy.ops.export_scene.gltf(
        filepath=os.path.join(output_dir, "avatar_clinical.glb"),
        export_format='GLB',
        export_morph=True,
        export_morph_normal=True,
        export_materials='EXPORT',
        export_apply=False
    )
    
    print("\n✅ Modelos exportados com sucesso!")
    print(f"   - {output_dir}/avatar_morphable.glb")
    print(f"   - {output_dir}/avatar_baseline.glb")
    print(f"   - {output_dir}/avatar_clinical.glb")

if __name__ == "__main__":
    main()
