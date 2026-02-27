'use client';

import { Suspense, useRef, useEffect, useState, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, useGLTF, Clone } from '@react-three/drei';
import * as THREE from 'three';
import { SkeletonUtils } from 'three-stdlib';
import { MorphTargets } from '@/lib/clinical-mapper';

// Preload both models
useGLTF.preload('/models/avatar_morphable.glb');
useGLTF.preload('/models/avatar_female.glb');

// Alturas dos modelos 3D em cm
const MODEL_HEIGHT_MALE = 173.2; // cm - altura do modelo GLB masculino
const MODEL_HEIGHT_FEMALE = 177.2; // cm - altura do modelo GLB feminino

interface AvatarProps {
  morphTargets: MorphTargets;
  sex: 'M' | 'F';
  heightCm: number; // Altura do paciente em cm
  position?: [number, number, number];
}

// Mapeamento fixo removido em favor de mesh.morphTargetDictionary dinâmico
// Isso evita quebras se a ordem dos morph targets mudar no arquivo GLB

function Avatar({ morphTargets, sex, heightCm, position = [0, 0, 0] }: AvatarProps) {
  const modelPath = sex === 'F' ? '/models/avatar_female.glb' : '/models/avatar_morphable.glb';
  const gltf = useGLTF(modelPath);
  const morphMeshesRef = useRef<THREE.Mesh[]>([]);
  const targetValuesRef = useRef<MorphTargets>(morphTargets);

  // Atualizar ref quando morphTargets mudar
  useEffect(() => {
    targetValuesRef.current = morphTargets;
  }, [morphTargets]);

  // Calcular escala baseada na altura do paciente
  const modelHeight = sex === 'F' ? MODEL_HEIGHT_FEMALE : MODEL_HEIGHT_MALE;
  const scale = heightCm / modelHeight;

  // CRÍTICO: Clonar a cena para ter uma instância independente
  const clonedScene = useMemo(() => {
    const clone = SkeletonUtils.clone(gltf.scene);

    morphMeshesRef.current = [];

    clone.traverse((child) => {
      // DEBUG: Log mesh names to find head/face components
      // console.log('DEBUG MESH:', child.name, child.type);

      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const geometry = mesh.geometry;

        // Log mesh details
        console.log(`[Avatar] Mesh Found: ${mesh.name}`);

        // Criar novo material
        const skinColor = sex === 'F' ? 0xeee0db : 0xe8d5c8;

        // Aplicar material de alta qualidade em TODO o modelo
        // MeshPhysicalMaterial com Clearcoat dá um aspecto de "boneco de alta tecnologia" ou porcelana
        // que ajuda a destacar curvas mesmo em modelos com menos detalhes geométricos.
        const newMaterial = new THREE.MeshPhysicalMaterial({
          color: skinColor,
          roughness: 0.5, // Pele suave
          metalness: 0.1, // Leve toque metálico para "tech feel"
          clearcoat: 0.3, // Camada de verniz suave
          clearcoatRoughness: 0.2, // Reflexos nítidos
          reflectivity: 0.5,
          flatShading: false,
          side: THREE.DoubleSide,
        });
        newMaterial.morphTargets = true;
        newMaterial.morphNormals = true;

        mesh.material = newMaterial;
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        // Verificar e configurar morph targets
        const morphPositions = geometry.morphAttributes?.position;
        const hasMorphTargets = Boolean(
          (morphPositions && morphPositions.length > 0) ||
            (mesh.morphTargetInfluences && mesh.morphTargetInfluences.length > 0)
        );

        if (hasMorphTargets) {
          const numTargets = morphPositions?.length ?? mesh.morphTargetInfluences?.length ?? 0;
          if (numTargets > 0) {
            mesh.morphTargetInfluences = new Array(numTargets).fill(0);
            mesh.updateMorphTargets();
            morphMeshesRef.current.push(mesh);
          }
        }
      }
    });

    return clone;
  }, [gltf.scene, sex]);

  // Aplicar morph targets a cada frame com interpolação suave
  useFrame(() => {
    const meshes = morphMeshesRef.current;
    if (!meshes.length) return;

    const targets = targetValuesRef.current;
    const lerpFactor = 0.1;

    for (const mesh of meshes) {
      const influences = mesh.morphTargetInfluences;
      const dictionary = mesh.morphTargetDictionary;
      if (!influences || !dictionary) continue;

      Object.entries(targets).forEach(([key, value]) => {
        // Nota: Os nomes no GLB devem corresponder às chaves em MorphTargets (Weight, AbdomenGirth, etc)
        const index = dictionary[key];

        if (index !== undefined && index < influences.length) {
          const targetValue = typeof value === 'number' ? Math.max(0, Math.min(1, value)) : 0;
          const currentValue = influences[index] ?? 0;
          influences[index] = currentValue + (targetValue - currentValue) * lerpFactor;
        }
      });
    }
  });

  return (
    <group position={position}>
      <primitive object={clonedScene} scale={scale} />
    </group>
  );
}

function StudioLighting() {
  return (
    <>
      <directionalLight
        position={[2, 4, 4]}
        intensity={1.2}
        color="#ffffff"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0001}
      />
      <directionalLight position={[-4, 3, 2]} intensity={0.8} color="#e6f0ff" />
      <directionalLight position={[4, 3, 2]} intensity={0.8} color="#fff0e6" />

      {/* Luz de Contorno (Rim Light) Azulada Forte para destacar silhueta */}
      <spotLight
        position={[0, 4, -4]}
        intensity={3.0}
        angle={0.6}
        penumbra={0.5}
        color="#00ffff"
        castShadow
      />
      {/* Luz Superior para destacar topo da cabeça */}
      <spotLight
        position={[0, 6, 0]}
        intensity={1.0}
        angle={0.5}
        penumbra={1}
        color="#ffffff"
      />

      <ambientLight intensity={0.5} color="#ececec" />
      <hemisphereLight args={['#ffffff', '#333333', 0.4]} />
    </>
  );
}

function CameraSetup() {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(0, 0.9, 3.0);
    camera.lookAt(0, 0.85, 0);
  }, [camera]);
  return null;
}

interface ThreeViewerProps {
  morphTargets: MorphTargets;
  sex: 'M' | 'F';
  heightCm: number; // Altura do paciente em cm
}

function Floor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[20, 20]} />
      <meshStandardMaterial color="#b8b8b8" roughness={0.95} metalness={0} />
    </mesh>
  );
}

function BackWall() {
  return (
    <mesh position={[0, 3, -3]} receiveShadow>
      <planeGeometry args={[20, 12]} />
      <meshStandardMaterial color="#c8c8c8" roughness={1.0} metalness={0} />
    </mesh>
  );
}

export default function ThreeViewer({ morphTargets, sex, heightCm }: ThreeViewerProps) {
  // Usar key para forçar re-render quando sexo ou altura mudar
  const avatarKey = `avatar-${sex}-${heightCm}`;

  // Ajustar câmera target baseado na altura do paciente
  // Ajustar câmera target baseado na altura do paciente (com fallback)
  const safeHeight = (heightCm && !isNaN(heightCm) && heightCm > 0) ? heightCm : 170;
  const cameraTargetY = (safeHeight / 100) * 0.5;

  return (
    <div className="w-full h-full min-h-[500px] bg-gradient-to-b from-gray-300 to-gray-400 rounded-lg overflow-hidden">
      <Canvas
        shadows
        camera={{ fov: 40, near: 0.1, far: 100 }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.2,
        }}
      >
        <color attach="background" args={['#c5c5c5']} />
        <fog attach="fog" args={['#c5c5c5', 6, 15]} />
        <CameraSetup />
        <StudioLighting />
        <Suspense fallback={null}>
          <Avatar key={avatarKey} morphTargets={morphTargets} sex={sex} heightCm={heightCm} />
          <Floor />
          <BackWall />
        </Suspense>
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          minDistance={1.5}
          maxDistance={8}
          target={[0, cameraTargetY, 0]}
          maxPolarAngle={Math.PI * 0.85}
          minPolarAngle={Math.PI * 0.1}
        />
      </Canvas>
    </div>
  );
}
