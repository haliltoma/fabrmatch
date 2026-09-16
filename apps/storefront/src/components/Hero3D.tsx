/**
 * Hero3D — Fabrmatch anasayfa 3D floating nesneler
 * React Three Fiber + @react-three/drei
 * Tasarım sistemi renkleri: sage green + honey
 */
import { Suspense, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Float, Environment } from '@react-three/drei'
import type { Group } from 'three'

// Fabrmatch design system token renkleri
const C = {
  sage:    '#5b7a4f',
  sageDk:  '#33472b',
  sageMd:  '#4e5f45',
  sageLt:  '#b8ccaa',
  honey:   '#c99a45',
  honeyDk: '#7a6640',
}

type ShapeProps = {
  pos: [number, number, number]
  color: string
  speed?: number
  ri?: number
  fi?: number
  s?: number
}

/** Dikdörtgen kutu — baskı bloğu */
function Cube({ pos, color, speed = 1.5, ri = 0.6, fi = 0.8, s = 1 }: ShapeProps) {
  return (
    <Float speed={speed} rotationIntensity={ri} floatIntensity={fi}>
      <mesh position={pos} scale={s}>
        <boxGeometry args={[1, 1.3, 0.9]} />
        <meshStandardMaterial color={color} roughness={0.35} metalness={0.1} />
      </mesh>
    </Float>
  )
}

/** Torus — dekoratif halka */
function Ring({ pos, color, speed = 2, ri = 1, fi = 1, s = 1 }: ShapeProps) {
  return (
    <Float speed={speed} rotationIntensity={ri} floatIntensity={fi}>
      <mesh position={pos} scale={s}>
        <torusGeometry args={[0.55, 0.18, 16, 48]} />
        <meshStandardMaterial color={color} roughness={0.2} metalness={0.15} />
      </mesh>
    </Float>
  )
}

/** Oktahedron — geometrik elmas */
function Diamond({ pos, color, speed = 1.8, ri = 1.2, fi = 1.1, s = 1 }: ShapeProps) {
  return (
    <Float speed={speed} rotationIntensity={ri} floatIntensity={fi}>
      <mesh position={pos} scale={s}>
        <octahedronGeometry args={[0.65]} />
        <meshStandardMaterial color={color} roughness={0.4} metalness={0.05} />
      </mesh>
    </Float>
  )
}

/** Silindir — vazo / kap */
function Vase({ pos, color, speed = 1.2, ri = 0.5, fi = 0.7, s = 1 }: ShapeProps) {
  return (
    <Float speed={speed} rotationIntensity={ri} floatIntensity={fi}>
      <mesh position={pos} scale={s}>
        <cylinderGeometry args={[0.35, 0.55, 1.4, 32]} />
        <meshStandardMaterial color={color} roughness={0.5} metalness={0.03} />
      </mesh>
    </Float>
  )
}

/** Küre — yuvarlak nesne */
function Sphere({ pos, color, speed = 2.2, ri = 0.3, fi = 1.3, s = 1 }: ShapeProps) {
  return (
    <Float speed={speed} rotationIntensity={ri} floatIntensity={fi}>
      <mesh position={pos} scale={s}>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshStandardMaterial color={color} roughness={0.15} metalness={0.2} />
      </mesh>
    </Float>
  )
}

/** Tüm nesneleri tutan grup — yavaşça döner */
function Scene() {
  const g = useRef<Group>(null)
  useFrame((_, dt) => {
    if (g.current) g.current.rotation.y += dt * 0.08
  })
  return (
    <group ref={g}>
      {/* Ön katman */}
      <Cube    pos={[-1.8,  0.3,  0.0]} color={C.sage}   speed={1.4} s={1.05} ri={0.5} fi={0.8} />
      <Ring    pos={[ 1.7,  0.5,  0.3]} color={C.honey}  speed={2.1} s={1.15} ri={0.9} fi={1.0} />
      <Diamond pos={[ 0.2, -0.8,  0.7]} color={C.sageMd} speed={1.9} s={0.90} ri={1.2} fi={1.1} />
      {/* Arka katman */}
      <Vase    pos={[-0.3,  1.4, -1.0]} color={C.sageLt} speed={1.2} s={0.70} ri={0.4} fi={0.7} />
      <Cube    pos={[ 2.4, -1.0, -0.8]} color={C.sageDk} speed={1.7} s={0.65} ri={0.6} fi={0.8} />
      <Ring    pos={[-2.3, -0.8, -0.4]} color={C.honeyDk}speed={2.3} s={0.75} ri={1.0} fi={0.9} />
      <Sphere  pos={[ 0.8,  2.0, -1.5]} color={C.sageLt} speed={2.5} s={0.55} ri={0.3} fi={1.2} />
    </group>
  )
}

export default function Hero3D() {
  return (
    <Canvas
      camera={{ position: [0, 0, 6.5], fov: 50 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      style={{ width: '100%', height: '100%' }}
    >
      <Suspense fallback={null}>
        <ambientLight intensity={0.8} />
        <directionalLight position={[5, 8, 5]} intensity={2.5} />
        <directionalLight position={[-4, -2, -4]} intensity={0.5} color="#eef2e4" />
        <Scene />
        <Environment preset="studio" />
      </Suspense>
    </Canvas>
  )
}
