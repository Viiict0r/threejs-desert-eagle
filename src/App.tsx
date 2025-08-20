/* eslint-disable @typescript-eslint/no-explicit-any */
import { OrbitControls, useTexture, type OrbitControlsProps } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useLoader } from '@react-three/fiber'
import { Suspense, useEffect, useMemo, useRef } from 'react'
import { GLTFLoader, RGBELoader } from 'three/examples/jsm/Addons.js'
import { EffectComposer, BrightnessContrast } from '@react-three/postprocessing'
import * as THREE from 'three'

function Scene(props: any) {
  const { scene } = useLoader(GLTFLoader, "/mesh.glb")
  const ref = useRef<THREE.Group>(null)

  const [baseColor, normal, roughness, metalness] = useTexture([
    "/textures/base.webp",   // cor
    "/textures/normalmap.webp",    // normal map
    "/textures/roughness.webp",   // roughness
    "/textures/metalness.webp",    // metalness
  ])

  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 0.5
    }
  })

  // Ajuste das texturas (UVs e repeat)
  useMemo(() => {
    [baseColor, normal, roughness, metalness].forEach((tex) => {
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping
      tex.repeat.set(1, 1)
      tex.offset.set(0, 0)
      tex.flipY = false
    })
  }, [baseColor, normal, roughness, metalness])

  useEffect(() => {
    // Posiciona o modelo
    scene.position.set(0, -0.04, -0.01)
    ref.current?.position.set(0, 0.01, -0.01)
    scene.rotateOnAxis(new THREE.Vector3(-0.47, 0, 0), Math.PI / 2)

    // Aplica materiais a todos os meshes
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as any
       
        mesh.material = new THREE.MeshPhysicalMaterial({
          map: baseColor,
          normalMap: normal,
          normalScale: new THREE.Vector2(0.3, 0.1),
          roughnessMap: roughness,
          metalnessMap: metalness,
          aoMap: baseColor, // certo
          aoMapIntensity: 1.2,
          metalness: 0.6,
          clearcoat: 1,
          clearcoatRoughness: 1,
          roughness: 0.6,
          lightMap: normal,
          lightMapIntensity: 1,
        })

        // Garantir UV2 para AO
        if (mesh.geometry.attributes.uv) {
          mesh.geometry.setAttribute(
            "uv2",
            new THREE.BufferAttribute(mesh.geometry.attributes.uv.array, 2)
          )
        }
      }
    })
    
  }, [scene, baseColor, normal, roughness, metalness])

  return (
    <group ref={ref} {...props}>
      <primitive object={scene} />
    </group>
  )
}

function Ground() {
  return (
    <>
      {/* Chão */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="lightgray" />
      </mesh>

      {/* Grade (grid helper) */}
      <gridHelper args={[100, 100, "blue", "gray"]} position={[0, 0, 0]} />
    </>
  )
}

function SceneSettings() {
  const texture = useLoader(RGBELoader, '/textures/map/venice_sunset_1k.hdr')

  const { gl, scene } = useThree()
  
  gl.toneMapping = THREE.ACESFilmicToneMapping
  gl.toneMappingExposure = 0.9

  scene.environment = texture
  scene.environment.mapping = THREE.EquirectangularReflectionMapping;
  scene.environmentIntensity = 1

  return null
}

function Camera() {
  const doReset = useRef(false)
  const ref = useRef<any>(null)
  const timer = useRef(0)

  function onMoveStart() {
    const controls = ref.current as OrbitControlsProps
    controls.minAzimuthAngle = -Infinity
    controls.maxAzimuthAngle = Infinity
    controls.minPolarAngle = 0
    controls.maxPolarAngle = Math.PI

    doReset.current = false;

    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = 0
    }
  }

  function onMoveEnd() {
    timer.current = window.setTimeout(() => {
      doReset.current = true;
      console.log('[3D] Reseting position...')
    }, 2500)
  }

  function smoothReset() {
    if (!ref.current) return

    const controls = ref.current as OrbitControlsProps
    // @ts-expect-error ...
    const beta = controls.getPolarAngle()

    const targetBeta = Math.PI / 2

    const newBeta = THREE.MathUtils.lerp(beta, targetBeta, 0.03)

    controls.minPolarAngle = newBeta
    controls.maxPolarAngle = newBeta

    if (
      Math.abs(newBeta - targetBeta) < 0.001
    ) {
      console.log('[3D] Position reseted.')
      onMoveStart()
    }
  }

  useFrame(() => {
    if (doReset.current) {
      smoothReset()
    }
  })

  return <OrbitControls ref={ref} onStart={onMoveStart} onEnd={onMoveEnd} enableDamping enablePan={false} enableZoom={false} />
}

function App() {
  return (
    <div id="canvas-container">
      <Canvas camera={{ position: [-0.7, 0.01, 0], fov: 50 }}>
        <SceneSettings />
        {/* Luzes */}
        <ambientLight intensity={1} />

        <Ground />

        <directionalLight color={"#ffffff"} position={[0.5, 1, 0]} intensity={0.05} />
        <directionalLight color={"#ffffff"} position={[-0.5, 1, 0]} intensity={0.05} />

        {/* Suspense para esperar o load */}
        <Suspense fallback={null}>
          <Scene scale={1.5} />
        </Suspense>

        {/* Controles de câmera */}
        <Camera />

        <EffectComposer>
          <BrightnessContrast
            brightness={0} // brightness. min: -1, max: 1
            contrast={0.2} // contrast: min -1, max: 1
          />
        </EffectComposer>
      </Canvas>
    </div>
  )
}

export default App
