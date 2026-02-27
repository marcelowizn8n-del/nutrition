'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';

interface MetabolicHeatmapOverlayProps {
  riskProbability: number;
  waistRisk: boolean;
  componentStatus: {
    waist: boolean;
    triglycerides: boolean;
    hdl: boolean;
    bloodPressure: boolean;
    glucose: boolean;
  };
  heightCm: number;
  sex: 'M' | 'F';
}

// Posições anatômicas relativas (0-1) baseadas na altura do modelo
const ANATOMY_ZONES = {
  abdomen: { yStart: 0.45, yEnd: 0.58, radius: 0.12 },
  liver: { yStart: 0.52, yEnd: 0.58, xOffset: 0.05, radius: 0.06 },
  heart: { yStart: 0.62, yEnd: 0.70, xOffset: 0, radius: 0.05 },
  pancreas: { yStart: 0.48, yEnd: 0.52, xOffset: -0.02, radius: 0.04 },
};

function HeatZone({ 
  position, 
  scale, 
  intensity, 
  color,
  pulseSpeed = 1,
}: { 
  position: [number, number, number]; 
  scale: number;
  intensity: number;
  color: string;
  pulseSpeed?: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);
  
  useFrame((state) => {
    if (meshRef.current && materialRef.current) {
      // Pulsação suave
      const pulse = Math.sin(state.clock.elapsedTime * pulseSpeed) * 0.1 + 0.9;
      meshRef.current.scale.setScalar(scale * pulse);
      materialRef.current.opacity = intensity * (0.3 + pulse * 0.2);
    }
  });
  
  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[1, 32, 32]} />
      <meshBasicMaterial
        ref={materialRef}
        color={color}
        transparent
        opacity={intensity * 0.4}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

export default function MetabolicHeatmapOverlay({
  riskProbability,
  waistRisk,
  componentStatus,
  heightCm,
  sex,
}: MetabolicHeatmapOverlayProps) {
  // Escala baseada na altura do paciente
  const MODEL_HEIGHT = sex === 'M' ? 173.2 : 171.2;
  const heightScale = heightCm / MODEL_HEIGHT;
  
  // Calcular zonas de risco
  const zones = useMemo(() => {
    const result: Array<{
      key: string;
      position: [number, number, number];
      scale: number;
      intensity: number;
      color: string;
      pulseSpeed: number;
    }> = [];
    
    // Zona abdominal - sempre presente se risco de cintura
    if (waistRisk || componentStatus.waist) {
      const abdomenY = (ANATOMY_ZONES.abdomen.yStart + ANATOMY_ZONES.abdomen.yEnd) / 2 * heightCm / 100;
      result.push({
        key: 'abdomen',
        position: [0, abdomenY, 0.08],
        scale: ANATOMY_ZONES.abdomen.radius * heightScale,
        intensity: Math.min(1, riskProbability * 1.5),
        color: riskProbability >= 0.35 ? '#ef4444' : riskProbability >= 0.2 ? '#f97316' : '#eab308',
        pulseSpeed: 1.5,
      });
    }
    
    // Zona hepática - triglicerídeos/HDL (esteatose)
    if (componentStatus.triglycerides || componentStatus.hdl) {
      const liverY = (ANATOMY_ZONES.liver.yStart + ANATOMY_ZONES.liver.yEnd) / 2 * heightCm / 100;
      result.push({
        key: 'liver',
        position: [ANATOMY_ZONES.liver.xOffset * heightScale, liverY, 0.06],
        scale: ANATOMY_ZONES.liver.radius * heightScale,
        intensity: (componentStatus.triglycerides && componentStatus.hdl) ? 0.9 : 0.6,
        color: '#a855f7', // purple
        pulseSpeed: 1.2,
      });
    }
    
    // Zona cardíaca - pressão arterial
    if (componentStatus.bloodPressure) {
      const heartY = (ANATOMY_ZONES.heart.yStart + ANATOMY_ZONES.heart.yEnd) / 2 * heightCm / 100;
      result.push({
        key: 'heart',
        position: [0, heartY, 0.05],
        scale: ANATOMY_ZONES.heart.radius * heightScale,
        intensity: 0.8,
        color: '#dc2626', // red
        pulseSpeed: 2.0, // batimento cardíaco mais rápido
      });
    }
    
    // Zona pancreática - glicemia
    if (componentStatus.glucose) {
      const pancreasY = (ANATOMY_ZONES.pancreas.yStart + ANATOMY_ZONES.pancreas.yEnd) / 2 * heightCm / 100;
      result.push({
        key: 'pancreas',
        position: [ANATOMY_ZONES.pancreas.xOffset * heightScale, pancreasY, 0.07],
        scale: ANATOMY_ZONES.pancreas.radius * heightScale,
        intensity: 0.7,
        color: '#3b82f6', // blue
        pulseSpeed: 0.8,
      });
    }
    
    return result;
  }, [riskProbability, waistRisk, componentStatus, heightCm, heightScale, sex]);
  
  if (zones.length === 0) return null;
  
  return (
    <group>
      {zones.map((zone) => (
        <HeatZone
          key={zone.key}
          position={zone.position}
          scale={zone.scale}
          intensity={zone.intensity}
          color={zone.color}
          pulseSpeed={zone.pulseSpeed}
        />
      ))}
    </group>
  );
}
