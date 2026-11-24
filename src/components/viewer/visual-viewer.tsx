import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { Box, Eye, Image as ImageIcon, Maximize2, RotateCcw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { ModeloVisualTipo } from '@/lib/db'

interface VisualViewerProps {
  tipo: ModeloVisualTipo
  url?: string | null
  titulo?: string
  altRenders?: string[]
}

export function VisualViewer({
  tipo,
  url,
  titulo = 'Diseño del Proyecto',
  altRenders = [],
}: VisualViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [cargando, setCargando] = useState(true)
  const [, setError] = useState<string | null>(null)
  const [indiceRender, setIndiceRender] = useState(0)
  const [modoPantallaCompleta, setModoPantallaCompleta] = useState(false)

  // --------------------------------------------------------------------------
  // RENDERIZADO 3D (GLB / GLTF) o PANORÁMICA 360° con Three.js
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (tipo !== '3d_glb' && tipo !== 'render_360') {
      setCargando(false)
      return
    }

    const container = containerRef.current
    if (!container) return

    setCargando(true)
    setError(null)

    // 1. Escena, Cámara y Renderizador
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xf3f4f6) // Fondo neutro profesional

    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      1000,
    )

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(container.clientWidth, container.clientHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.0

    // Limpiar canvas anterior si existe
    container.innerHTML = ''
    container.appendChild(renderer.domElement)

    // 2. Controles de Órbita
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.maxPolarAngle = Math.PI // Permitir rotación completa

    let animationFrameId: number

    // 3. Caso A: Panorámica Render 360°
    if (tipo === 'render_360') {
      camera.position.set(0, 0, 0.1)
      controls.enableZoom = true
      controls.zoomSpeed = 1.2
      controls.rotateSpeed = -0.5 // Invertir para sensación inmersiva interior

      // Esfera invertida para proyectar el render 360°
      const geometry = new THREE.SphereGeometry(500, 60, 40)
      geometry.scale(-1, 1, 1)

      const textureLoader = new THREE.TextureLoader()
      const textureUrl =
        url ||
        'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=2000&auto=format&fit=crop'

      textureLoader.load(
        textureUrl,
        (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace
          const material = new THREE.MeshBasicMaterial({ map: texture })
          const mesh = new THREE.Mesh(geometry, material)
          scene.add(mesh)
          setCargando(false)
        },
        undefined,
        () => {
          setError('No se pudo cargar la imagen panorámica 360°.')
          setCargando(false)
        },
      )
    }

    // 4. Caso B: Modelo 3D Interactivo (.GLB / .GLTF)
    if (tipo === '3d_glb') {
      camera.position.set(5, 5, 5)

      // Iluminación ambiental y direccional de estudio
      const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.2)
      hemiLight.position.set(0, 20, 0)
      scene.add(hemiLight)

      const dirLight = new THREE.DirectionalLight(0xffffff, 1.5)
      dirLight.position.set(5, 10, 7)
      scene.add(dirLight)

      if (url) {
        const loader = new GLTFLoader()
        loader.load(
          url,
          (gltf) => {
            const model = gltf.scene
            // Centrar el modelo automáticamente
            const box = new THREE.Box3().setFromObject(model)
            const center = box.getCenter(new THREE.Vector3())
            const size = box.getSize(new THREE.Vector3())
            model.position.sub(center)

            scene.add(model)

            // Ajustar cámara a la escala del modelo
            const maxDim = Math.max(size.x, size.y, size.z)
            camera.position.set(maxDim * 1.5, maxDim * 1.2, maxDim * 1.5)
            controls.target.set(0, 0, 0)
            controls.update()

            setCargando(false)
          },
          undefined,
          () => {
            // Fallback elegante si el archivo .glb falla o es una maqueta
            crearModeloMaqueta(scene)
            setCargando(false)
          },
        )
      } else {
        // Modelo 3D maqueta conceptual de obra para demostración
        crearModeloMaqueta(scene)
        setCargando(false)
      }
    }

    // Bucle de animación
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    // Redimensionamiento
    const handleResize = () => {
      if (!container) return
      camera.aspect = container.clientWidth / container.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(container.clientWidth, container.clientHeight)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(animationFrameId)
      renderer.dispose()
      if (container) container.innerHTML = ''
    }
  }, [tipo, url])

  // Maqueta 3D conceptual de arquitectura por defecto si no hay archivo subido aún
  function crearModeloMaqueta(scene: THREE.Scene) {
    const group = new THREE.Group()

    // Losa de piso
    const floorGeo = new THREE.BoxGeometry(8, 0.3, 6)
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.8 })
    const floor = new THREE.Mesh(floorGeo, floorMat)
    group.add(floor)

    // Muros perimetrales
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x0b2d5b, roughness: 0.5 })
    const wall1 = new THREE.Mesh(new THREE.BoxGeometry(8, 2.5, 0.2), wallMat)
    wall1.position.set(0, 1.3, -2.9)
    group.add(wall1)

    const wall2 = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.5, 6), wallMat)
    wall2.position.set(-3.9, 1.3, 0)
    group.add(wall2)

    // Columnas de concreto
    const colMat = new THREE.MeshStandardMaterial({ color: 0xff6600, roughness: 0.6 })
    for (const [x, z] of [
      [3.8, 2.8],
      [3.8, -2.8],
      [-3.8, 2.8],
      [-3.8, -2.8],
    ]) {
      const col = new THREE.Mesh(new THREE.BoxGeometry(0.4, 2.6, 0.4), colMat)
      col.position.set(x, 1.3, z)
      group.add(col)
    }

    scene.add(group)
  }

  // Si el tipo es 'renders_planos' o no hay 3D
  const todosLosRenders = url ? [url, ...altRenders] : altRenders

  return (
    <div
      className={`relative overflow-hidden rounded-md border border-gray-200 bg-gray-900 shadow-sm transition-all ${
        modoPantallaCompleta ? 'fixed inset-0 z-50 rounded-none' : 'h-80 w-full md:h-96'
      }`}
    >
      {/* Barra superior del visor */}
      <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent p-3 text-white">
        <div className="flex items-center gap-2">
          {tipo === '3d_glb' && (
            <Badge variant="blue" className="bg-orange text-white">
              <Box className="mr-1 size-3" /> Modelo 3D
            </Badge>
          )}
          {tipo === 'render_360' && (
            <Badge variant="blue" className="bg-navy text-white">
              <Eye className="mr-1 size-3" /> Render 360°
            </Badge>
          )}
          {tipo === 'renders_planos' && (
            <Badge variant="blue" className="bg-gray-700 text-white">
              <ImageIcon className="mr-1 size-3" /> Render HD
            </Badge>
          )}
          <span className="truncate text-xs font-bold text-gray-200">{titulo}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            className="size-8 p-0 text-white hover:bg-white/20"
            onClick={() => setModoPantallaCompleta(!modoPantallaCompleta)}
            title="Pantalla completa"
          >
            <Maximize2 className="size-4" />
          </Button>
        </div>
      </div>

      {/* Contenedor Three.js para 3D / 360 */}
      {tipo === '3d_glb' || tipo === 'render_360' ? (
        <>
          <div ref={containerRef} className="size-full cursor-grab active:cursor-grabbing" />
          {cargando && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/60 text-white backdrop-blur-xs">
              <RotateCcw className="size-8 animate-spin text-orange" />
              <p className="mt-2 text-xs font-semibold">Cargando visualización...</p>
            </div>
          )}
          <div className="absolute inset-x-0 bottom-2 text-center pointer-events-none">
            <span className="rounded-full bg-black/60 px-3 py-1 text-[11px] text-gray-300 backdrop-blur-xs">
              {tipo === '3d_glb'
                ? 'Arrastra para rotar · Pellizca o rueda para zoom'
                : 'Arrastra con el dedo para mirar 360°'}
            </span>
          </div>
        </>
      ) : (
        /* Modo Galería de Renders Planos */
        <div className="relative flex size-full items-center justify-center bg-gray-950">
          {todosLosRenders.length > 0 ? (
            <img
              src={todosLosRenders[indiceRender]}
              alt={`Render ${indiceRender + 1}`}
              className="max-h-full max-w-full object-contain"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-gray-400">
              <ImageIcon className="size-12 opacity-40" />
              <p className="mt-2 text-xs">Sin renders cargados aún</p>
            </div>
          )}

          {todosLosRenders.length > 1 && (
            <div className="absolute bottom-3 flex gap-1.5">
              {todosLosRenders.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIndiceRender(i)}
                  className={`size-2.5 rounded-full transition-all ${
                    i === indiceRender ? 'w-6 bg-orange' : 'bg-white/40'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
