/* eslint-disable react/no-unknown-property */
import { Component, Suspense, useRef, useState, useEffect, type ReactNode } from 'react'
import { Canvas, useLoader } from '@react-three/fiber'
import { OrbitControls, Center, PerspectiveCamera, Bounds } from '@react-three/drei'
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
      {/* STL files are Z-up; three.js is Y-up, so stand the part upright */}
      <mesh ref={meshRef} geometry={geometry} rotation={[-Math.PI / 2, 0, 0]}>
        <meshStandardMaterial color="#2f7d8b" flatShading={false} metalness={0.1} roughness={0.6} />
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

/** A file the loader cannot parse must not take the page down with it. */
class PreviewBoundary extends Component<{ fallback: ReactNode; children: ReactNode }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

interface StlViewerProps {
  url: string
  className?: string
}

export default function StlViewer({ url, className = '' }: StlViewerProps) {
  const { t } = useT()

  const [error, setError] = useState<string | null>(null)
  const [reduceMotion] = useState(
    () =>
      typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )

  const failed = (
    <div
      className={`flex items-center justify-center rounded-lg border border-line bg-paper-sunken text-sm text-ink-600 ${className}`}
    >
      {t('Failed to load 3D preview')}
    </div>
  )
  if (error) return failed

  return (
    <PreviewBoundary key={url} fallback={failed}>
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
            <PerspectiveCamera makeDefault position={[90, 70, 120]} fov={40} />
            <ambientLight intensity={0.5} />
            <directionalLight position={[10, 10, 10]} intensity={1} />
            <directionalLight position={[-10, -10, -5]} intensity={0.3} />
            <Suspense fallback={<LoadingFallback />}>
              <Bounds fit clip observe margin={1.3}>
                <StlModel url={url} />
              </Bounds>
            </Suspense>
            <OrbitControls
              makeDefault
              enablePan
              enableZoom
              enableRotate
              autoRotate={!reduceMotion}
              autoRotateSpeed={1.2}
            />
          </Canvas>
        </Suspense>
        <div className="pointer-events-none absolute bottom-2 right-2 rounded bg-black/50 px-2 py-1 text-xs text-white">
          {t('Drag to rotate')}
        </div>
      </div>
    </PreviewBoundary>
  )
}
