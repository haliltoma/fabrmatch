/* eslint-disable react/no-unknown-property */
import { Suspense, useRef, useState, useEffect } from 'react'
import { Canvas, useLoader } from '@react-three/fiber'
import { OrbitControls, Center, PerspectiveCamera } from '@react-three/drei'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import type * as THREE from 'three'
import { Loader2 } from 'lucide-react'
import { useT } from '~/lib/i18n'

function StlModel({ url }: { url: string }) {
  const geometry = useLoader(STLLoader, url)
  const meshRef = useRef<THREE.Mesh>(null)

  useEffect(() => {
    if (geometry) {
      geometry.computeVertexNormals()
    }
  }, [geometry])

  return (
    <Center>
      <mesh ref={meshRef} geometry={geometry}>
        <meshStandardMaterial color="#6366f1" flatShading={false} metalness={0.1} roughness={0.6} />
      </mesh>
    </Center>
  )
}

function LoadingFallback() {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#e2e8f0" wireframe />
    </mesh>
  )
}

interface StlViewerProps {
  url: string
  className?: string
}

export default function StlViewer({ url, className = '' }: StlViewerProps) {
  const { t } = useT()

  const [error, setError] = useState<string | null>(null)

  if (error) {
    return (
      <div
        className={`flex items-center justify-center rounded-lg border border-line bg-paper-sunken text-sm text-ink-600 ${className}`}
      >
        {t('Failed to load 3D preview')}
      </div>
    )
  }

  return (
    <div
      className={`relative overflow-hidden rounded-lg border border-line bg-paper-sunken ${className}`}
    >
      <Suspense
        fallback={
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-ink-600" />
          </div>
        }
      >
        <Canvas onError={() => setError(t('Failed to render'))}>
          <PerspectiveCamera makeDefault position={[0, 0, 150]} fov={45} />
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 10]} intensity={1} />
          <directionalLight position={[-10, -10, -5]} intensity={0.3} />
          <Suspense fallback={<LoadingFallback />}>
            <StlModel url={url} />
          </Suspense>
          <OrbitControls enablePan enableZoom enableRotate />
        </Canvas>
      </Suspense>
      <div className="pointer-events-none absolute bottom-2 right-2 rounded bg-black/50 px-2 py-1 text-xs text-white">
        {t('Drag to rotate')}
      </div>
    </div>
  )
}
