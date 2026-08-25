import { useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Float, Edges } from '@react-three/drei';
import * as THREE from 'three';

function Shape({ geometry, color, rotationSpeed = 0.5, positionOffset, flatShading = false }: any) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const { viewport } = useThree();
  
  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta * rotationSpeed;
      meshRef.current.rotation.y += delta * rotationSpeed;
    }
  });

  // Calculate position dynamically based on viewport so it stays in the corners
  const x = (viewport.width / 2) * positionOffset[0];
  const y = (viewport.height / 2) * positionOffset[1];

  return (
    <Float speed={0.8} rotationIntensity={0.5} floatIntensity={1.5} position={[x, y, 0]}>
      <mesh ref={meshRef} geometry={geometry}>
        <meshStandardMaterial color={color} roughness={0.4} flatShading={flatShading} />
        {/* Edges adds the internal wireframe lines */}
        <Edges color="black" threshold={15} />
        {/* Inverted hull for a guaranteed thick outer silhouette outline */}
        <mesh geometry={geometry} scale={1.01}>
          <meshBasicMaterial color="black" side={THREE.BackSide} />
        </mesh>
      </mesh>
    </Float>
  );
}

export default function HeroShapes() {
  return (
    <div className="absolute inset-0 pointer-events-none z-0" aria-hidden="true">
      <Canvas camera={{ position: [0, 0, 10], fov: 45 }}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[10, 10, 10]} intensity={1.5} />
        
        {/* Top Left: Pink Torus */}
        <Shape 
          positionOffset={[-0.75, 0.6]} 
          geometry={new THREE.TorusGeometry(1.2, 0.45, 16, 32)} 
          color="#FF33A1" 
          rotationSpeed={0.12} 
          flatShading={false}
        />
        
        {/* Top Right: Cyan Icosahedron */}
        <Shape 
          positionOffset={[0.75, 0.6]} 
          geometry={new THREE.IcosahedronGeometry(1.2, 0)} 
          color="#00E5FF" 
          rotationSpeed={0.16} 
          flatShading={true}
        />
        
        {/* Bottom Left: Green Cube */}
        <Shape 
          positionOffset={[-0.75, -0.6]} 
          geometry={new THREE.BoxGeometry(1.6, 1.6, 1.6)} 
          color="#00E676" 
          rotationSpeed={0.08} 
          flatShading={true}
        />
        
        {/* Bottom Right: Yellow Pyramid */}
        <Shape 
          positionOffset={[0.75, -0.6]} 
          geometry={new THREE.ConeGeometry(1.4, 2.0, 4)} 
          color="#FFEA00" 
          rotationSpeed={0.2} 
          flatShading={true}
        />
      </Canvas>
    </div>
  );
}
