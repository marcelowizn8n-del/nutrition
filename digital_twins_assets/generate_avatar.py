"""
Digital Twins Avatar Generator
Creates a parametric human body mesh with morph targets for clinical visualization.
Compatible with Three.js morph target system.

Author: Digital Twins MVP - Hospital Albert Einstein
"""

import bpy
import bmesh
import math
from mathutils import Vector

def clear_scene():
    """Remove all objects from the scene"""
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    
def create_humanoid_mesh():
    """Create a simplified humanoid mesh suitable for clinical visualization"""
    
    # Create the body parts
    mesh = bpy.data.meshes.new("HumanBody")
    obj = bpy.data.objects.new("Avatar", mesh)
    
    bpy.context.collection.objects.link(obj)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    
    bm = bmesh.new()
    
    # Body proportions (in meters, roughly)
    # Total height ~1.75m
    
    # === TORSO ===
    # Create torso as a subdivided cube scaled to body shape
    torso_verts = []
    torso_faces = []
    
    # Torso dimensions
    torso_width = 0.35
    torso_depth = 0.22
    torso_height = 0.55
    torso_base_y = 0.95  # hip level
    
    # Create torso with more detail (8 rings)
    rings = 8
    for i in range(rings + 1):
        t = i / rings
        y = torso_base_y + t * torso_height
        
        # Taper torso (wider at shoulders, narrower at waist)
        if t < 0.3:  # Hip to waist
            w_scale = 0.9 + 0.1 * (t / 0.3)
            d_scale = 1.0
        elif t < 0.7:  # Waist to chest
            w_scale = 1.0 + 0.15 * ((t - 0.3) / 0.4)
            d_scale = 0.95 + 0.1 * ((t - 0.3) / 0.4)
        else:  # Chest to shoulders
            w_scale = 1.15 - 0.05 * ((t - 0.7) / 0.3)
            d_scale = 1.05 - 0.1 * ((t - 0.7) / 0.3)
        
        w = torso_width * w_scale
        d = torso_depth * d_scale
        
        # 8 vertices per ring
        for j in range(8):
            angle = j * math.pi / 4
            x = w * math.cos(angle)
            z = d * math.sin(angle)
            torso_verts.append(bm.verts.new((x, y, z)))
    
    bm.verts.ensure_lookup_table()
    
    # Create faces between rings
    for i in range(rings):
        for j in range(8):
            v1 = torso_verts[i * 8 + j]
            v2 = torso_verts[i * 8 + (j + 1) % 8]
            v3 = torso_verts[(i + 1) * 8 + (j + 1) % 8]
            v4 = torso_verts[(i + 1) * 8 + j]
            bm.faces.new([v1, v2, v3, v4])
    
    # Cap top and bottom
    bm.faces.new(torso_verts[:8])
    bm.faces.new(torso_verts[-8:][::-1])
    
    # === HEAD ===
    head_center = Vector((0, 1.62, 0))
    head_radius = 0.11
    bmesh.ops.create_uvsphere(bm, u_segments=16, v_segments=12, radius=head_radius)
    for v in bm.verts:
        if v not in torso_verts:
            v.co.y += head_center.y
    
    # === NECK ===
    neck_verts = []
    neck_rings = 3
    for i in range(neck_rings + 1):
        t = i / neck_rings
        y = 1.5 + t * 0.08
        r = 0.06 - t * 0.01
        for j in range(8):
            angle = j * math.pi / 4
            x = r * math.cos(angle)
            z = r * math.sin(angle)
            neck_verts.append(bm.verts.new((x, y, z)))
    
    bm.verts.ensure_lookup_table()
    
    # Neck faces
    neck_start = len(torso_verts)
    for i in range(neck_rings):
        for j in range(8):
            idx = neck_start + i * 8
            v1 = bm.verts[idx + j]
            v2 = bm.verts[idx + (j + 1) % 8]
            v3 = bm.verts[idx + 8 + (j + 1) % 8]
            v4 = bm.verts[idx + 8 + j]
            try:
                bm.faces.new([v1, v2, v3, v4])
            except:
                pass
    
    # === ARMS ===
    def create_limb(start_pos, length, start_radius, end_radius, segments=6, direction=(0, -1, 0)):
        limb_verts = []
        dir_vec = Vector(direction).normalized()
        
        for i in range(segments + 1):
            t = i / segments
            pos = Vector(start_pos) + dir_vec * length * t
            r = start_radius + (end_radius - start_radius) * t
            
            # Create ring perpendicular to direction
            for j in range(8):
                angle = j * math.pi / 4
                # Simple perpendicular offset
                if abs(dir_vec.y) > 0.9:
                    offset = Vector((r * math.cos(angle), 0, r * math.sin(angle)))
                else:
                    offset = Vector((r * math.cos(angle), r * math.sin(angle), 0))
                limb_verts.append(bm.verts.new(pos + offset))
        
        bm.verts.ensure_lookup_table()
        
        # Create faces
        start_idx = len(bm.verts) - len(limb_verts)
        for i in range(segments):
            for j in range(8):
                idx = start_idx + i * 8
                v1 = bm.verts[idx + j]
                v2 = bm.verts[idx + (j + 1) % 8]
                v3 = bm.verts[idx + 8 + (j + 1) % 8]
                v4 = bm.verts[idx + 8 + j]
                try:
                    bm.faces.new([v1, v2, v3, v4])
                except:
                    pass
        
        return limb_verts
    
    # Left arm (upper)
    create_limb((0.38, 1.42, 0), 0.28, 0.06, 0.045, direction=(0, -1, 0))
    # Left forearm
    create_limb((0.38, 1.14, 0), 0.26, 0.045, 0.035, direction=(0, -1, 0))
    # Left hand
    create_limb((0.38, 0.88, 0), 0.10, 0.035, 0.025, direction=(0, -1, 0))
    
    # Right arm (upper)
    create_limb((-0.38, 1.42, 0), 0.28, 0.06, 0.045, direction=(0, -1, 0))
    # Right forearm
    create_limb((-0.38, 1.14, 0), 0.26, 0.045, 0.035, direction=(0, -1, 0))
    # Right hand
    create_limb((-0.38, 0.88, 0), 0.10, 0.035, 0.025, direction=(0, -1, 0))
    
    # === LEGS ===
    # Left thigh
    create_limb((0.1, 0.95, 0), 0.42, 0.09, 0.065, direction=(0, -1, 0))
    # Left calf
    create_limb((0.1, 0.53, 0), 0.40, 0.06, 0.045, direction=(0, -1, 0))
    # Left foot (simplified)
    create_limb((0.1, 0.13, 0.05), 0.10, 0.045, 0.04, segments=3, direction=(0, -0.3, 1))
    
    # Right thigh
    create_limb((-0.1, 0.95, 0), 0.42, 0.09, 0.065, direction=(0, -1, 0))
    # Right calf
    create_limb((-0.1, 0.53, 0), 0.40, 0.06, 0.045, direction=(0, -1, 0))
    # Right foot
    create_limb((-0.1, 0.13, 0.05), 0.10, 0.045, 0.04, segments=3, direction=(0, -0.3, 1))
    
    # === ABDOMEN DETAIL ===
    # Add belly bump area
    belly_center = Vector((0, 1.05, 0.15))
    bmesh.ops.create_uvsphere(bm, u_segments=12, v_segments=8, radius=0.08)
    for v in bm.verts[-97:]:  # Approximate sphere verts
        v.co += belly_center
    
    # Finalize mesh
    bm.to_mesh(mesh)
    bm.free()
    
    # Smooth shading
    for poly in mesh.polygons:
        poly.use_smooth = True
    
    return obj

def add_shape_keys(obj):
    """Add morph targets for clinical parameters"""
    
    mesh = obj.data
    
    # Add basis shape key
    obj.shape_key_add(name='Basis', from_mix=False)
    
    # === WEIGHT SHAPE KEY ===
    # Overall body mass - scales everything outward
    sk_weight = obj.shape_key_add(name='Weight', from_mix=False)
    for i, v in enumerate(sk_weight.data):
        orig = mesh.vertices[i].co
        # Scale outward from center axis, more effect on torso
        center_dist = math.sqrt(orig.x**2 + orig.z**2)
        
        if 0.8 < orig.y < 1.5:  # Torso region
            scale_factor = 0.25
        elif orig.y <= 0.8:  # Legs
            scale_factor = 0.15
        else:  # Arms/head
            scale_factor = 0.1
        
        direction = Vector((orig.x, 0, orig.z)).normalized() if center_dist > 0.01 else Vector((0, 0, 0))
        v.co = orig + direction * scale_factor * center_dist
    
    # === ABDOMEN GIRTH SHAPE KEY ===
    # Belly size for metabolic conditions
    sk_abdomen = obj.shape_key_add(name='AbdomenGirth', from_mix=False)
    for i, v in enumerate(sk_abdomen.data):
        orig = mesh.vertices[i].co
        
        # Only affect belly area (front of lower torso)
        if 0.85 < orig.y < 1.25 and orig.z > -0.05:
            # Distance from belly center
            belly_center = Vector((0, 1.05, 0.1))
            dist = (Vector(orig) - belly_center).length
            
            if dist < 0.3:
                # Push forward and outward
                influence = 1.0 - (dist / 0.3)
                influence = influence ** 0.5  # Smooth falloff
                
                push_dir = Vector((orig.x * 0.3, 0, 1)).normalized()
                v.co = orig + push_dir * influence * 0.12
    
    # === MUSCLE MASS SHAPE KEY ===
    # Arm and leg thickness for fitness level
    sk_muscle = obj.shape_key_add(name='MuscleMass', from_mix=False)
    for i, v in enumerate(sk_muscle.data):
        orig = mesh.vertices[i].co
        
        # Arms (x > 0.25 or x < -0.25)
        if abs(orig.x) > 0.25 and 0.8 < orig.y < 1.5:
            center = Vector((orig.x, orig.y, 0))
            direction = (Vector(orig) - center).normalized()
            dist = (Vector(orig) - center).length
            v.co = orig + direction * 0.02
        
        # Legs
        elif abs(orig.x) < 0.2 and orig.y < 0.95:
            center = Vector((0.1 if orig.x > 0 else -0.1, orig.y, 0))
            direction = (Vector(orig) - center).normalized()
            dist = (Vector(orig) - center).length
            if dist > 0.01:
                v.co = orig + direction * 0.015
        
        # Chest/shoulders
        elif 1.3 < orig.y < 1.5 and abs(orig.x) < 0.4:
            if orig.z > 0:  # Front
                v.co = orig + Vector((0, 0, 0.02))
    
    # === POSTURE SHAPE KEY ===
    # Spine curvature for aging effect
    sk_posture = obj.shape_key_add(name='Posture', from_mix=False)
    for i, v in enumerate(sk_posture.data):
        orig = mesh.vertices[i].co
        
        # Affect upper body - forward lean and shoulder droop
        if orig.y > 1.0:
            # Height above hip as factor
            height_factor = (orig.y - 1.0) / 0.7
            height_factor = min(height_factor, 1.0)
            
            # Forward lean increases with height
            forward_lean = height_factor * 0.06
            
            # Shoulder droop (x movement inward, y movement down)
            if abs(orig.x) > 0.2:
                shoulder_droop = height_factor * 0.02
                inward = -0.02 if orig.x > 0 else 0.02
            else:
                shoulder_droop = 0
                inward = 0
            
            v.co = Vector((
                orig.x + inward * height_factor,
                orig.y - shoulder_droop,
                orig.z + forward_lean
            ))
    
    # === CLINICAL COMPOSITE: DIABETES EFFECT ===
    sk_diabetes = obj.shape_key_add(name='DiabetesEffect', from_mix=False)
    for i, v in enumerate(sk_diabetes.data):
        orig = mesh.vertices[i].co
        
        # Combination: increased abdomen, slight weight gain, reduced muscle
        # Abdomen effect
        if 0.85 < orig.y < 1.25 and orig.z > -0.05:
            belly_center = Vector((0, 1.05, 0.1))
            dist = (Vector(orig) - belly_center).length
            if dist < 0.3:
                influence = (1.0 - (dist / 0.3)) ** 0.5
                push_dir = Vector((orig.x * 0.3, 0, 1)).normalized()
                v.co = orig + push_dir * influence * 0.08
        
        # Overall slight weight increase
        center_dist = math.sqrt(orig.x**2 + orig.z**2)
        if center_dist > 0.01:
            direction = Vector((orig.x, 0, orig.z)).normalized()
            v.co = Vector(v.co) + direction * 0.01 * center_dist
    
    # === CLINICAL COMPOSITE: HEART DISEASE EFFECT ===
    sk_heart = obj.shape_key_add(name='HeartDiseaseEffect', from_mix=False)
    for i, v in enumerate(sk_heart.data):
        orig = mesh.vertices[i].co
        
        # Slight posture change (fatigue), potential weight changes
        if orig.y > 1.0:
            height_factor = min((orig.y - 1.0) / 0.7, 1.0)
            forward_lean = height_factor * 0.03
            v.co = Vector((orig.x, orig.y, orig.z + forward_lean))
        
        # Slight limb thinning (reduced activity)
        if (abs(orig.x) > 0.25 and 0.8 < orig.y < 1.5) or (abs(orig.x) < 0.2 and orig.y < 0.95):
            center = Vector((orig.x, orig.y, 0))
            direction = (Vector(orig) - center).normalized()
            dist = (Vector(orig) - center).length
            if dist > 0.01:
                v.co = Vector(v.co) - direction * 0.01
    
    return obj

def setup_material(obj):
    """Create a simple skin-like material"""
    mat = bpy.data.materials.new(name="SkinMaterial")
    mat.use_nodes = True
    
    nodes = mat.node_tree.nodes
    nodes.clear()
    
    # Create principled BSDF
    bsdf = nodes.new('ShaderNodeBsdfPrincipled')
    bsdf.inputs['Base Color'].default_value = (0.8, 0.65, 0.55, 1.0)  # Skin tone
    bsdf.inputs['Roughness'].default_value = 0.7
    bsdf.inputs['Subsurface'].default_value = 0.1
    bsdf.location = (0, 0)
    
    # Output node
    output = nodes.new('ShaderNodeOutputMaterial')
    output.location = (300, 0)
    
    # Link
    mat.node_tree.links.new(bsdf.outputs['BSDF'], output.inputs['Surface'])
    
    # Assign to object
    obj.data.materials.append(mat)
    
    return mat

def export_glb(obj, filepath, shape_key_values=None):
    """Export object as GLB with specified shape key values"""
    
    # Reset all shape keys to 0
    if obj.data.shape_keys:
        for key in obj.data.shape_keys.key_blocks:
            if key.name != 'Basis':
                key.value = 0.0
    
    # Set specified shape key values
    if shape_key_values:
        for name, value in shape_key_values.items():
            if name in obj.data.shape_keys.key_blocks:
                obj.data.shape_keys.key_blocks[name].value = value
    
    # Select only our object
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    
    # Export as GLB
    bpy.ops.export_scene.gltf(
        filepath=filepath,
        use_selection=True,
        export_format='GLB',
        export_apply=False,  # Keep shape keys!
        export_morph=True,   # Export morph targets
        export_morph_normal=True,
        export_morph_tangent=False,
        export_materials='EXPORT',
        export_colors=True,
    )
    
    print(f"Exported: {filepath}")

def main():
    """Main execution"""
    print("=" * 50)
    print("Digital Twins Avatar Generator")
    print("Hospital Albert Einstein MVP")
    print("=" * 50)
    
    # Clear existing scene
    clear_scene()
    
    # Create humanoid mesh
    print("\nCreating humanoid mesh...")
    avatar = create_humanoid_mesh()
    
    # Add shape keys (morph targets)
    print("Adding shape keys (morph targets)...")
    avatar = add_shape_keys(avatar)
    
    # Setup material
    print("Setting up materials...")
    setup_material(avatar)
    
    # Center object
    bpy.ops.object.select_all(action='DESELECT')
    avatar.select_set(True)
    bpy.context.view_layer.objects.active = avatar
    bpy.ops.object.origin_set(type='ORIGIN_GEOMETRY', center='MEDIAN')
    
    # Export directory
    export_dir = "/home/ubuntu/digital_twins_assets/"
    
    # Export morphable avatar (with all shape keys at 0)
    print("\nExporting morphable avatar with all shape keys...")
    export_glb(avatar, export_dir + "avatar_morphable.glb")
    
    # Export baseline (healthy) state
    print("Exporting baseline (healthy) avatar...")
    export_glb(avatar, export_dir + "avatar_baseline.glb", {
        'Weight': 0.0,
        'AbdomenGirth': 0.0,
        'MuscleMass': 0.3,  # Some muscle tone
        'Posture': 0.0,
    })
    
    # Export clinical state (with conditions applied)
    print("Exporting clinical condition avatar...")
    export_glb(avatar, export_dir + "avatar_clinical.glb", {
        'Weight': 0.5,
        'AbdomenGirth': 0.7,
        'MuscleMass': -0.2,  # Reduced muscle
        'Posture': 0.4,
        'DiabetesEffect': 0.5,
    })
    
    # List all shape keys
    print("\n" + "=" * 50)
    print("Available Shape Keys (Morph Targets):")
    print("=" * 50)
    for key in avatar.data.shape_keys.key_blocks:
        print(f"  - {key.name}")
    
    print("\n" + "=" * 50)
    print("Export complete!")
    print(f"Files saved to: {export_dir}")
    print("=" * 50)
    
    # Save blend file for reference
    bpy.ops.wm.save_as_mainfile(filepath=export_dir + "avatar_source.blend")
    print(f"Blend file saved: {export_dir}avatar_source.blend")

if __name__ == "__main__":
    main()
