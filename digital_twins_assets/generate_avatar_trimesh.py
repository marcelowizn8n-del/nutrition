"""
Digital Twins Avatar Generator using Trimesh
Creates a parametric human body mesh with morph targets for clinical visualization.
Compatible with Three.js morph target system via glTF/GLB export.

Author: Digital Twins MVP - Hospital Albert Einstein
"""

import numpy as np
import trimesh
from pygltflib import GLTF2, Buffer, BufferView, Accessor, Mesh, Primitive, Node, Scene, Material, Asset
import struct
import json
import os
from pathlib import Path

def create_capsule(radius, height, segments_around=16, segments_height=8):
    """Create a capsule mesh (cylinder with hemispheres on ends)"""
    # Use trimesh's built-in capsule
    mesh = trimesh.creation.capsule(height=height, radius=radius, count=[segments_around, segments_height])
    return mesh

def create_ellipsoid(radii, segments=16):
    """Create an ellipsoid (stretched sphere)"""
    sphere = trimesh.creation.icosphere(subdivisions=2, radius=1.0)
    sphere.vertices *= np.array(radii)
    return sphere

def create_humanoid_mesh():
    """Create a simplified humanoid mesh suitable for clinical visualization"""
    
    meshes = []
    
    # Body proportions (in meters)
    # Total height ~1.75m
    
    # === TORSO ===
    torso = create_ellipsoid([0.18, 0.28, 0.12])
    torso.vertices[:, 1] += 1.22  # Move to chest height
    meshes.append(torso)
    
    # === ABDOMEN/BELLY ===
    abdomen = create_ellipsoid([0.17, 0.18, 0.13])
    abdomen.vertices[:, 1] += 1.02
    abdomen.vertices[:, 2] += 0.02  # Slight forward
    meshes.append(abdomen)
    
    # === HIPS ===
    hips = create_ellipsoid([0.18, 0.12, 0.11])
    hips.vertices[:, 1] += 0.88
    meshes.append(hips)
    
    # === HEAD ===
    head = create_ellipsoid([0.09, 0.11, 0.09])
    head.vertices[:, 1] += 1.64
    meshes.append(head)
    
    # === NECK ===
    neck = trimesh.creation.cylinder(radius=0.05, height=0.1, sections=12)
    neck.vertices[:, 1] += 1.5
    meshes.append(neck)
    
    # === ARMS ===
    # Left upper arm
    l_upper_arm = create_capsule(0.045, 0.26, 12, 4)
    l_upper_arm.vertices[:, 1] += 1.3
    l_upper_arm.vertices[:, 0] += 0.25
    meshes.append(l_upper_arm)
    
    # Left forearm
    l_forearm = create_capsule(0.035, 0.24, 12, 4)
    l_forearm.vertices[:, 1] += 1.0
    l_forearm.vertices[:, 0] += 0.25
    meshes.append(l_forearm)
    
    # Left hand
    l_hand = create_ellipsoid([0.04, 0.06, 0.02])
    l_hand.vertices[:, 1] += 0.72
    l_hand.vertices[:, 0] += 0.25
    meshes.append(l_hand)
    
    # Right upper arm
    r_upper_arm = create_capsule(0.045, 0.26, 12, 4)
    r_upper_arm.vertices[:, 1] += 1.3
    r_upper_arm.vertices[:, 0] -= 0.25
    meshes.append(r_upper_arm)
    
    # Right forearm
    r_forearm = create_capsule(0.035, 0.24, 12, 4)
    r_forearm.vertices[:, 1] += 1.0
    r_forearm.vertices[:, 0] -= 0.25
    meshes.append(r_forearm)
    
    # Right hand
    r_hand = create_ellipsoid([0.04, 0.06, 0.02])
    r_hand.vertices[:, 1] += 0.72
    r_hand.vertices[:, 0] -= 0.25
    meshes.append(r_hand)
    
    # === LEGS ===
    # Left thigh
    l_thigh = create_capsule(0.07, 0.40, 12, 4)
    l_thigh.vertices[:, 1] += 0.58
    l_thigh.vertices[:, 0] += 0.1
    meshes.append(l_thigh)
    
    # Left calf
    l_calf = create_capsule(0.05, 0.38, 12, 4)
    l_calf.vertices[:, 1] += 0.22
    l_calf.vertices[:, 0] += 0.1
    meshes.append(l_calf)
    
    # Left foot
    l_foot = create_ellipsoid([0.04, 0.03, 0.10])
    l_foot.vertices[:, 1] += 0.03
    l_foot.vertices[:, 0] += 0.1
    l_foot.vertices[:, 2] += 0.05
    meshes.append(l_foot)
    
    # Right thigh
    r_thigh = create_capsule(0.07, 0.40, 12, 4)
    r_thigh.vertices[:, 1] += 0.58
    r_thigh.vertices[:, 0] -= 0.1
    meshes.append(r_thigh)
    
    # Right calf
    r_calf = create_capsule(0.05, 0.38, 12, 4)
    r_calf.vertices[:, 1] += 0.22
    r_calf.vertices[:, 0] -= 0.1
    meshes.append(r_calf)
    
    # Right foot
    r_foot = create_ellipsoid([0.04, 0.03, 0.10])
    r_foot.vertices[:, 1] += 0.03
    r_foot.vertices[:, 0] -= 0.1
    r_foot.vertices[:, 2] += 0.05
    meshes.append(r_foot)
    
    # Combine all meshes
    combined = trimesh.util.concatenate(meshes)
    
    # Center the mesh
    combined.vertices[:, 1] -= 0.87  # Center vertically
    
    return combined


def create_morph_targets(base_vertices):
    """
    Create morph target displacements for various body parameters.
    Returns dict of {name: displacement_array}
    """
    n_verts = len(base_vertices)
    morph_targets = {}
    
    # Helper to identify body regions
    def get_region_mask(verts, y_min=-np.inf, y_max=np.inf, x_abs_min=0, x_abs_max=np.inf, z_min=-np.inf):
        return (
            (verts[:, 1] >= y_min) & 
            (verts[:, 1] <= y_max) & 
            (np.abs(verts[:, 0]) >= x_abs_min) &
            (np.abs(verts[:, 0]) <= x_abs_max) &
            (verts[:, 2] >= z_min)
        )
    
    # === WEIGHT MORPH TARGET ===
    # Overall body mass - scales everything outward from center axis
    weight_displ = np.zeros_like(base_vertices)
    
    # Torso region (more effect)
    torso_mask = get_region_mask(base_vertices, y_min=-0.1, y_max=0.7)
    center_dist = np.sqrt(base_vertices[:, 0]**2 + base_vertices[:, 2]**2)
    
    # Direction from center axis
    direction = np.zeros_like(base_vertices)
    nonzero_mask = center_dist > 0.01
    direction[nonzero_mask, 0] = base_vertices[nonzero_mask, 0] / center_dist[nonzero_mask]
    direction[nonzero_mask, 2] = base_vertices[nonzero_mask, 2] / center_dist[nonzero_mask]
    
    # Scale factor based on region
    scale = np.where(torso_mask, 0.15, 0.08)
    weight_displ = direction * (scale * center_dist)[:, np.newaxis]
    
    morph_targets['Weight'] = weight_displ.astype(np.float32)
    
    # === ABDOMEN GIRTH MORPH TARGET ===
    # Belly size for metabolic conditions
    abdomen_displ = np.zeros_like(base_vertices)
    
    # Belly region: lower torso, front-facing
    belly_center = np.array([0, 0.15, 0.08])
    belly_dist = np.linalg.norm(base_vertices - belly_center, axis=1)
    
    belly_mask = (belly_dist < 0.25) & (base_vertices[:, 2] > -0.05)
    influence = np.zeros(n_verts)
    influence[belly_mask] = (1.0 - belly_dist[belly_mask] / 0.25) ** 0.5
    
    # Push forward and slightly outward
    push_dir = np.zeros_like(base_vertices)
    push_dir[:, 0] = base_vertices[:, 0] * 0.3
    push_dir[:, 2] = 1.0
    push_dir = push_dir / (np.linalg.norm(push_dir, axis=1, keepdims=True) + 0.001)
    
    abdomen_displ = push_dir * (influence * 0.08)[:, np.newaxis]
    morph_targets['AbdomenGirth'] = abdomen_displ.astype(np.float32)
    
    # === MUSCLE MASS MORPH TARGET ===
    # Arm and leg thickness
    muscle_displ = np.zeros_like(base_vertices)
    
    # Arms (|x| > 0.15)
    arm_mask = get_region_mask(base_vertices, y_min=-0.2, y_max=0.6, x_abs_min=0.15)
    
    # Legs (|x| < 0.15, y < -0.1)
    leg_mask = get_region_mask(base_vertices, y_max=-0.1, x_abs_max=0.15)
    
    # Chest/shoulders
    chest_mask = get_region_mask(base_vertices, y_min=0.3, y_max=0.7, x_abs_max=0.2, z_min=0)
    
    # Expand limbs outward
    limb_mask = arm_mask | leg_mask
    limb_direction = np.zeros_like(base_vertices)
    limb_direction[limb_mask, 0] = base_vertices[limb_mask, 0]
    limb_direction[limb_mask, 2] = base_vertices[limb_mask, 2]
    limb_norm = np.linalg.norm(limb_direction, axis=1, keepdims=True) + 0.001
    limb_direction = limb_direction / limb_norm
    
    muscle_displ[limb_mask] = limb_direction[limb_mask] * 0.015
    muscle_displ[chest_mask, 2] += 0.015
    
    morph_targets['MuscleMass'] = muscle_displ.astype(np.float32)
    
    # === POSTURE MORPH TARGET ===
    # Spine curvature for aging effect
    posture_displ = np.zeros_like(base_vertices)
    
    # Upper body forward lean
    upper_mask = base_vertices[:, 1] > 0.1
    height_factor = np.clip((base_vertices[:, 1] - 0.1) / 0.7, 0, 1)
    
    # Forward lean
    posture_displ[upper_mask, 2] += height_factor[upper_mask] * 0.05
    
    # Shoulder droop (move down and inward)
    shoulder_mask = (base_vertices[:, 1] > 0.4) & (np.abs(base_vertices[:, 0]) > 0.15)
    posture_displ[shoulder_mask, 1] -= 0.02
    posture_displ[shoulder_mask, 0] -= np.sign(base_vertices[shoulder_mask, 0]) * 0.015
    
    morph_targets['Posture'] = posture_displ.astype(np.float32)
    
    # === DIABETES EFFECT COMPOSITE ===
    diabetes_displ = np.zeros_like(base_vertices)
    
    # Increased abdomen
    diabetes_displ += abdomen_displ * 0.6
    # Slight overall weight
    diabetes_displ += weight_displ * 0.3
    
    morph_targets['DiabetesEffect'] = diabetes_displ.astype(np.float32)
    
    # === HEART DISEASE EFFECT ===
    heart_displ = np.zeros_like(base_vertices)
    
    # Slight posture (fatigue)
    heart_displ += posture_displ * 0.5
    # Slight limb thinning (reduced activity)
    heart_displ -= muscle_displ * 0.3
    
    morph_targets['HeartDiseaseEffect'] = heart_displ.astype(np.float32)
    
    # === HYPERTENSION EFFECT ===
    hyper_displ = np.zeros_like(base_vertices)
    # Slight weight gain tendency
    hyper_displ += weight_displ * 0.4
    hyper_displ += abdomen_displ * 0.3
    
    morph_targets['HypertensionEffect'] = hyper_displ.astype(np.float32)
    
    return morph_targets


def export_glb_with_morphs(mesh, morph_targets, filepath, base_morph_values=None):
    """
    Export mesh as GLB with morph targets using pygltflib.
    """
    vertices = mesh.vertices.astype(np.float32)
    faces = mesh.faces.astype(np.uint32)
    
    # Calculate normals
    if hasattr(mesh, 'vertex_normals'):
        normals = mesh.vertex_normals.astype(np.float32)
    else:
        mesh.fix_normals()
        normals = mesh.vertex_normals.astype(np.float32)
    
    # Apply base morph values if specified
    if base_morph_values:
        for name, value in base_morph_values.items():
            if name in morph_targets:
                vertices = vertices + morph_targets[name] * value
    
    # Build binary buffer
    buffer_data = bytearray()
    
    # Vertices
    vertices_blob = vertices.tobytes()
    vertices_offset = len(buffer_data)
    buffer_data.extend(vertices_blob)
    
    # Normals
    normals_blob = normals.tobytes()
    normals_offset = len(buffer_data)
    buffer_data.extend(normals_blob)
    
    # Indices
    indices_blob = faces.flatten().astype(np.uint32).tobytes()
    indices_offset = len(buffer_data)
    buffer_data.extend(indices_blob)
    
    # Morph targets (as displacements from base)
    morph_offsets = {}
    morph_names = list(morph_targets.keys())
    
    for name in morph_names:
        displ = morph_targets[name].astype(np.float32)
        morph_blob = displ.tobytes()
        morph_offsets[name] = len(buffer_data)
        buffer_data.extend(morph_blob)
    
    # Calculate bounds
    v_min = vertices.min(axis=0).tolist()
    v_max = vertices.max(axis=0).tolist()
    
    # Create glTF structure
    gltf = GLTF2(
        asset=Asset(version="2.0", generator="Digital Twins Avatar Generator"),
        scene=0,
        scenes=[Scene(nodes=[0])],
        nodes=[Node(mesh=0, name="Avatar")],
        meshes=[],
        accessors=[],
        bufferViews=[],
        buffers=[Buffer(byteLength=len(buffer_data))],
        materials=[Material(
            name="SkinMaterial",
            pbrMetallicRoughness={
                "baseColorFactor": [0.85, 0.7, 0.6, 1.0],
                "metallicFactor": 0.0,
                "roughnessFactor": 0.7
            }
        )]
    )
    
    # Buffer views
    # 0: Vertices
    gltf.bufferViews.append(BufferView(
        buffer=0,
        byteOffset=vertices_offset,
        byteLength=len(vertices_blob),
        target=34962  # ARRAY_BUFFER
    ))
    
    # 1: Normals
    gltf.bufferViews.append(BufferView(
        buffer=0,
        byteOffset=normals_offset,
        byteLength=len(normals_blob),
        target=34962
    ))
    
    # 2: Indices
    gltf.bufferViews.append(BufferView(
        buffer=0,
        byteOffset=indices_offset,
        byteLength=len(indices_blob),
        target=34963  # ELEMENT_ARRAY_BUFFER
    ))
    
    # Morph target buffer views
    morph_bv_start = 3
    for i, name in enumerate(morph_names):
        gltf.bufferViews.append(BufferView(
            buffer=0,
            byteOffset=morph_offsets[name],
            byteLength=morph_targets[name].nbytes,
            target=34962
        ))
    
    # Accessors
    # 0: Vertices
    gltf.accessors.append(Accessor(
        bufferView=0,
        byteOffset=0,
        componentType=5126,  # FLOAT
        count=len(vertices),
        type="VEC3",
        max=v_max,
        min=v_min
    ))
    
    # 1: Normals
    gltf.accessors.append(Accessor(
        bufferView=1,
        byteOffset=0,
        componentType=5126,
        count=len(normals),
        type="VEC3"
    ))
    
    # 2: Indices
    gltf.accessors.append(Accessor(
        bufferView=2,
        byteOffset=0,
        componentType=5125,  # UNSIGNED_INT
        count=len(faces.flatten()),
        type="SCALAR"
    ))
    
    # Morph target accessors
    morph_accessor_start = 3
    for i, name in enumerate(morph_names):
        displ = morph_targets[name]
        d_min = displ.min(axis=0).tolist()
        d_max = displ.max(axis=0).tolist()
        
        gltf.accessors.append(Accessor(
            bufferView=morph_bv_start + i,
            byteOffset=0,
            componentType=5126,
            count=len(displ),
            type="VEC3",
            max=d_max,
            min=d_min
        ))
    
    # Build morph targets for primitive
    morph_target_list = []
    for i in range(len(morph_names)):
        morph_target_list.append({"POSITION": morph_accessor_start + i})
    
    # Create mesh with primitive
    primitive = Primitive(
        attributes={"POSITION": 0, "NORMAL": 1},
        indices=2,
        material=0,
        targets=morph_target_list
    )
    
    gltf.meshes.append(Mesh(
        name="AvatarMesh",
        primitives=[primitive],
        weights=[0.0] * len(morph_names),
        extras={"targetNames": morph_names}
    ))
    
    # Convert buffer_data to bytes
    gltf.set_binary_blob(bytes(buffer_data))
    
    # Save
    gltf.save(filepath)
    print(f"Exported: {filepath}")
    print(f"  - Vertices: {len(vertices)}")
    print(f"  - Faces: {len(faces)}")
    print(f"  - Morph targets: {morph_names}")


def main():
    """Main execution"""
    print("=" * 60)
    print("Digital Twins Avatar Generator (Trimesh version)")
    print("Hospital Albert Einstein MVP")
    print("=" * 60)
    
    # Create output directory
    output_dir = Path("/home/ubuntu/digital_twins_assets")
    output_dir.mkdir(exist_ok=True)
    
    # Create humanoid mesh
    print("\nCreating humanoid mesh...")
    avatar_mesh = create_humanoid_mesh()
    print(f"  Created mesh with {len(avatar_mesh.vertices)} vertices, {len(avatar_mesh.faces)} faces")
    
    # Create morph targets
    print("\nCreating morph targets...")
    morph_targets = create_morph_targets(avatar_mesh.vertices)
    print(f"  Created {len(morph_targets)} morph targets:")
    for name in morph_targets:
        print(f"    - {name}")
    
    # Export morphable avatar (all morphs at 0)
    print("\n" + "=" * 60)
    print("Exporting GLB files...")
    print("=" * 60)
    
    export_glb_with_morphs(
        avatar_mesh,
        morph_targets,
        str(output_dir / "avatar_morphable.glb")
    )
    
    # Export baseline (healthy) state
    export_glb_with_morphs(
        avatar_mesh,
        morph_targets,
        str(output_dir / "avatar_baseline.glb"),
        base_morph_values={'MuscleMass': 0.3}
    )
    
    # Export clinical state
    export_glb_with_morphs(
        avatar_mesh,
        morph_targets,
        str(output_dir / "avatar_clinical.glb"),
        base_morph_values={
            'Weight': 0.5,
            'AbdomenGirth': 0.7,
            'MuscleMass': -0.2,
            'Posture': 0.4,
            'DiabetesEffect': 0.5
        }
    )
    
    # Also export as OBJ for reference
    avatar_mesh.export(str(output_dir / "avatar_reference.obj"))
    print(f"\nExported reference OBJ: {output_dir / 'avatar_reference.obj'}")
    
    # Create a metadata file
    metadata = {
        "name": "Digital Twins Human Avatar",
        "version": "1.0",
        "generator": "Trimesh + pygltflib",
        "morphTargets": {
            "Weight": {
                "description": "Overall body mass scaling",
                "range": [-1.0, 2.0],
                "clinicalMapping": "BMI changes"
            },
            "AbdomenGirth": {
                "description": "Belly/abdominal size",
                "range": [0.0, 2.0],
                "clinicalMapping": "Waist circumference, metabolic syndrome"
            },
            "MuscleMass": {
                "description": "Arm and leg muscle thickness",
                "range": [-1.0, 2.0],
                "clinicalMapping": "Physical activity level, sarcopenia"
            },
            "Posture": {
                "description": "Spine curvature and shoulder position",
                "range": [0.0, 1.0],
                "clinicalMapping": "Aging effect, chronic fatigue"
            },
            "DiabetesEffect": {
                "description": "Composite body changes from diabetes",
                "range": [0.0, 1.0],
                "clinicalMapping": "Type 2 diabetes progression"
            },
            "HeartDiseaseEffect": {
                "description": "Body changes from cardiovascular conditions",
                "range": [0.0, 1.0],
                "clinicalMapping": "Heart failure, reduced activity"
            },
            "HypertensionEffect": {
                "description": "Body changes associated with hypertension",
                "range": [0.0, 1.0],
                "clinicalMapping": "Hypertension, metabolic changes"
            }
        },
        "files": {
            "avatar_morphable.glb": "Base avatar with all morph targets at 0",
            "avatar_baseline.glb": "Healthy baseline state",
            "avatar_clinical.glb": "Clinical condition state with morphs applied"
        },
        "threeJsUsage": """
// Load the morphable avatar
const loader = new GLTFLoader();
loader.load('avatar_morphable.glb', (gltf) => {
    const avatar = gltf.scene.children[0];
    const mesh = avatar.children[0]; // or traverse to find mesh
    
    // Access morph targets by name
    const morphDict = mesh.morphTargetDictionary;
    const influences = mesh.morphTargetInfluences;
    
    // Set morph target values (0-1 range typically)
    influences[morphDict['Weight']] = 0.5;
    influences[morphDict['AbdomenGirth']] = 0.3;
    influences[morphDict['MuscleMass']] = 0.2;
    influences[morphDict['Posture']] = 0.1;
    
    // For clinical conditions
    influences[morphDict['DiabetesEffect']] = severity;
});
"""
    }
    
    with open(output_dir / "avatar_metadata.json", "w") as f:
        json.dump(metadata, f, indent=2)
    print(f"Exported metadata: {output_dir / 'avatar_metadata.json'}")
    
    print("\n" + "=" * 60)
    print("Export complete!")
    print(f"Files saved to: {output_dir}")
    print("=" * 60)
    
    # List files
    print("\nGenerated files:")
    for f in sorted(output_dir.glob("avatar*")):
        size = f.stat().st_size
        print(f"  {f.name}: {size:,} bytes")


if __name__ == "__main__":
    main()
