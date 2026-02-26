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

// Mapeamento fixo de nomes para índices
const MORPH_INDEX_MAP: Record<string, number> = {
  'Weight': 0,
  'AbdomenGirth': 1,
  'MuscleMass': 2,
  'Posture': 3,
  'DiabetesEffect': 4,
  'HypertensionEffect': 5,
  'HeartDiseaseEffect': 6,
};

function Avatar({ morphTargets, sex, heightCm, position = [0, 0, 0] }: AvatarProps) {
  const modelPath = sex === 'F' ? '/models/avatar_female.glb' : '/models/avatar_morphable.glb';
  const gltf = useGLTF(modelPath);
  const meshRef = useRef<THREE.Mesh | null>(null);
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
    
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const geometry = mesh.geometry;
        
        // Criar novo material
        const skinColor = sex === 'F' ? 0xeee0db : 0xe8d5c8;
        const newMaterial = new THREE.MeshStandardMaterial({
          color: skinColor,
          roughness: 0.5,
          metalness: 0.0,
          flatShading: false,
          side: THREE.DoubleSide,
        });
        
        mesh.material = newMaterial;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        
        // Verificar e configurar morph targets
        const morphPositions = geometry.morphAttributes?.position;
        if (morphPositions && morphPositions.length > 0) {
          mesh.morphTargetInfluences = new Array(morphPositions.length).fill(0);
          meshRef.current = mesh;
          console.log(`[Avatar] Modelo ${sex} com ${morphPositions.length} morph targets`);
        } else if (mesh.morphTargetInfluences && mesh.morphTargetInfluences.length > 0) {
          const numTargets = mesh.morphTargetInfluences.length;
          mesh.morphTargetInfluences = new Array(numTargets).fill(0);
          meshRef.current = mesh;
          console.log(`[Avatar] Modelo ${sex} com ${numTargets} morph targets (via influences)`);
        } else {
          // Modelo sem morph targets - ainda assim usar como referência
          meshRef.current = mesh;
          console.log(`[Avatar] Modelo ${sex} carregado (sem morph targets)`);
        }
      }
    });
    
    return clone;
  }, [gltf.scene, sex]);

  // Aplicar morph targets a cada frame com interpolação suave
  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh?.morphTargetInfluences) return;

    const influences = mesh.morphTargetInfluences;
    const targets = targetValuesRef.current;
    const lerpFactor = 0.1;

    Object.entries(targets).forEach(([key, value]) => {
      const index = MORPH_INDEX_MAP[key];
      if (index !== undefined && index < influences.length) {
        const targetValue = typeof value === 'number' ? Math.max(0, Math.min(1, value)) : 0;
        const currentValue = influences[index];
        influences[index] = currentValue + (targetValue - currentValue) * lerpFactor;
      }
    });
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
        intensity={1.5} 
        color="#ffffff" 
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0001}
      />
      <directionalLight position={[-4, 3, 2]} intensity={0.8} color="#f0f5ff" />
      <directionalLight position={[4, 3, 2]} intensity={0.8} color="#fff5f0" />
      <directionalLight position={[0, 3, -4]} intensity={0.6} color="#ffffff" />
      <directionalLight position={[0, 8, 0]} intensity={0.4} color="#ffffff" />
      <ambientLight intensity={0.7} color="#f8f8f8" />
      <hemisphereLight args={['#ffffff', '#c0c0c0', 0.5]} />
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
  const cameraTargetY = (heightCm / 100) * 0.5; // Metade da altura em metros
  
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
