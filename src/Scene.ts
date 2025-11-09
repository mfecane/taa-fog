import * as THREE from 'three'
import { TreeTrunkGeometry } from './geometries/TreeTrunkGeometry'
import { TextureFactory } from './utils/TextureFactory'

export class Scene {
	public scene: THREE.Scene
	public cube: THREE.Mesh | null = null
	public floor: THREE.Mesh | null = null
	public directionalLight: THREE.DirectionalLight | null = null
	public axesHelper: THREE.AxesHelper | null = null
	public gridHelper: THREE.GridHelper | null = null
	public lightHelper: THREE.DirectionalLightHelper | null = null
	public shadowHelper: THREE.CameraHelper | null = null
	// Replace particles array with instanced mesh
	public particleInstancedMesh: THREE.InstancedMesh | null = null
	private particleVelocities: THREE.Vector3[] = []
	private particlePositions: THREE.Vector3[] = []
	private particleCount: number = 200
	private particleBrightness: number = 0.3
	private showHelpers: boolean = false

	// Size variables - 4x smaller than screen
	// @ts-ignore - Reserved for future use
	private readonly _renderWidth: number = window.innerWidth / 4
	// @ts-ignore - Reserved for future use
	private readonly _renderHeight: number = window.innerHeight / 4
	private readonly cubeSize: number = 1 // 1.0 / 4
	private readonly cubePositionY: number = 0.01 // 2.0 / 4
	// @ts-ignore - Reserved for future use
	private readonly _bayerMatrixSize: number = 4.0

	public constructor() {
		this.scene = new THREE.Scene()
	}

	public build(): void {
		// Set background color for areas without geometry
		this.scene.background = new THREE.Color(0x1a1a26) // Dark blue-gray

		// Floor plane with radial gradient texture (opaque center, transparent edges)
		const floorTexture = TextureFactory.createFloorTexture(512)
		const floorGeometry = new THREE.PlaneGeometry(20, 20)
		const floorMaterial = new THREE.MeshPhysicalMaterial({
			color: 0x8b7355, // Warm brown to match texture
			roughness: 0.8,
			metalness: 0.2,
			opacity: 1.0,
			transparent: true,
			map: floorTexture, // Radial gradient texture with alpha channel
		})
		this.floor = new THREE.Mesh(floorGeometry, floorMaterial)
		this.floor.rotation.x = -Math.PI / 2 // Rotate to be horizontal
		this.floor.receiveShadow = true
		this.scene.add(this.floor)

		// Create textures using TextureFactory
		const rgbaTexture = TextureFactory.createTreeTrunkTexture(256)

		// Tree trunk geometry (wider at base, narrower at top)
		const baseRadius = this.cubeSize * 0.4 // Base radius (thinner than original cylinder)
		const topRadius = this.cubeSize * 0.25 // Narrower top
		const height = this.cubeSize * 2.5
		const segments = 16 // More segments for smoother trunk
		const nGonSides = 32 // Number of sides for the base polygon
		const shiftAmount = 0.02 // Amount of shift in xz plane per segment
		const customGeometry = new TreeTrunkGeometry(baseRadius, topRadius, height, segments, nGonSides, shiftAmount)

		// Create physical material with RGBA texture
		const cylinderMaterial = new THREE.MeshPhysicalMaterial({
			opacity: 1.0, // Use full opacity since texture alpha channel controls it
			transparent: true,
			map: rgbaTexture, // Use map with alpha channel instead of alphaMap

			// Albedo: keep it soft & unsaturated, push variation via maps, not pure color
			color: 0xe3bfa3, // placeholder, will be overridden by map

			metalness: 0.0, // always 0 for skin
			roughness: 0.45, // 0.35–0.6, use a map for pores / T-zone / etc

			// Soft specular / oiliness
			specularIntensity: 0.25, // 0.15–0.35
			specularColor: new THREE.Color(0xffe8d8),

			// Tiny micro-oily layer
			sheen: 1.0,
			sheenRoughness: 0.7, // higher = softer
			sheenColor: new THREE.Color(0xfff3e4),

			// Don’t go crazy with clearcoat; if you use it, keep it ultra subtle
			clearcoat: 0.0,

			transmission: 0.1, // tiny, we just want softness
			thickness: 0.05, // 0.02–0.2 depending on scale
			attenuationColor: new THREE.Color(0xff7a5c), // warm red
			attenuationDistance: 0.6,
		})
		this.cube = new THREE.Mesh(customGeometry, cylinderMaterial)
		this.cube.position.set(0, this.cubePositionY, 0)
		this.cube.castShadow = true
		this.cube.receiveShadow = true
		this.scene.add(this.cube)

		// Directional light
		this.directionalLight = new THREE.DirectionalLight(0xffffff, 1)
		this.directionalLight.position.set(1, 2, 1)
		this.directionalLight.lookAt(0, 0, 0)
		this.directionalLight.castShadow = true
		this.directionalLight.shadow.mapSize.width = 2048
		this.directionalLight.shadow.mapSize.height = 2048
		this.directionalLight.shadow.camera.near = 0.5
		this.directionalLight.shadow.camera.far = 5
		// Set orthographic camera bounds for directional light shadow
		const shadowCamera = this.directionalLight.shadow.camera as THREE.OrthographicCamera
		shadowCamera.left = -2
		shadowCamera.right = 2
		shadowCamera.top = 2
		shadowCamera.bottom = -2
		this.scene.add(this.directionalLight)

		// Ambient light for overall illumination
		const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
		this.scene.add(ambientLight)

		// Create particle cloud
		this.createParticleCloud()

		// Setup helpers
		this.axesHelper = new THREE.AxesHelper(5)
		this.axesHelper.visible = this.showHelpers
		this.scene.add(this.axesHelper)

		this.gridHelper = new THREE.GridHelper(20, 20)
		this.gridHelper.visible = this.showHelpers
		this.scene.add(this.gridHelper)

		this.lightHelper = new THREE.DirectionalLightHelper(this.directionalLight, 0.5)
		this.lightHelper.visible = this.showHelpers
		this.scene.add(this.lightHelper)

		this.shadowHelper = new THREE.CameraHelper(this.directionalLight.shadow.camera)
		this.shadowHelper.visible = this.showHelpers
		this.scene.add(this.shadowHelper)
	}

	private createParticleCloud(): void {
		// Create particle texture using TextureFactory
		const particleTexture = TextureFactory.createParticleTexture(64)

		// Create particle material with transparency and bright emissive
		const particleMaterial = new THREE.MeshPhysicalMaterial({
			color: 0xffffff,
			emissive: 0xffffff,
			emissiveIntensity: this.particleBrightness,
			opacity: 1.0,
			transparent: true,
			map: particleTexture,
			depthWrite: false,
			side: THREE.DoubleSide,
		})

		// Create sprite geometry (small quad plane for billboarding)
		const particleSize = 0.01
		const particleGeometry = new THREE.PlaneGeometry(particleSize, particleSize)

		// Create instanced mesh
		this.particleInstancedMesh = new THREE.InstancedMesh(particleGeometry, particleMaterial, this.particleCount)

		// Initialize positions and velocities
		const matrix = new THREE.Matrix4()
		const position = new THREE.Vector3()

		for (let i = 0; i < this.particleCount; i++) {
			// Random position in a sphere around the scene
			const radius = 2 + Math.random() * 3
			const theta = Math.random() * Math.PI * 2
			const phi = Math.acos(2 * Math.random() - 1)

			position.set(
				radius * Math.sin(phi) * Math.cos(theta),
				0.5 + Math.random() * 2,
				radius * Math.sin(phi) * Math.sin(theta)
			)

			// Store position and velocity
			this.particlePositions.push(position.clone())
			this.particleVelocities.push(
				new THREE.Vector3(
					(Math.random() - 0.5) * 0.001,
					(Math.random() - 0.5) * 0.001,
					(Math.random() - 0.5) * 0.001
				)
			)

			// Set initial matrix (identity for now, will be updated in updateParticles)
			matrix.identity()
			this.particleInstancedMesh.setMatrixAt(i, matrix)
		}

		// Mark instance matrix as needing update
		this.particleInstancedMesh.instanceMatrix.needsUpdate = true

		this.scene.add(this.particleInstancedMesh)
	}

	public updateParticles(camera?: THREE.Camera): void {
		if (!this.particleInstancedMesh || !camera) return

		const time = Date.now() * 0.001
		const matrix = new THREE.Matrix4()
		const up = new THREE.Vector3(0, 1, 0)
		const cameraPosition = camera.position

		// Update each particle
		for (let i = 0; i < this.particleCount; i++) {
			const position = this.particlePositions[i]
			const velocity = this.particleVelocities[i]

			// Update position with random movement
			position.add(velocity)

			// Add some noise for more organic movement (very slow)
			position.x += Math.sin(time + position.y * 10) * 0.00005
			position.y += Math.cos(time + position.x * 10) * 0.00005
			position.z += Math.sin(time + position.x * 10) * 0.00005

			// Wrap around bounds
			if (position.x > 5) position.x = -5
			if (position.x < -5) position.x = 5
			if (position.y > 4) position.y = 0
			if (position.y < 0) position.y = 4
			if (position.z > 5) position.z = -5
			if (position.z < -5) position.z = 5

			// Billboard: compute rotation to face camera
			// Create look-at matrix for billboarding
			const direction = new THREE.Vector3()
			direction.subVectors(cameraPosition, position).normalize()

			// Compute right and up vectors for billboard
			const right = new THREE.Vector3()
			right.crossVectors(up, direction).normalize()

			const billboardUp = new THREE.Vector3()
			billboardUp.crossVectors(direction, right).normalize()

			// Build transformation matrix: position + billboard rotation
			matrix.makeBasis(right, billboardUp, direction)
			matrix.setPosition(position)

			// Update instance matrix
			this.particleInstancedMesh.setMatrixAt(i, matrix)
		}

		// Mark instance matrix as needing update
		this.particleInstancedMesh.instanceMatrix.needsUpdate = true
	}

	public getParticleBrightness(): number {
		return this.particleBrightness
	}

	public setParticleBrightness(value: number): void {
		this.particleBrightness = value
		// Update instanced mesh material
		if (this.particleInstancedMesh && this.particleInstancedMesh.material instanceof THREE.MeshPhysicalMaterial) {
			this.particleInstancedMesh.material.emissiveIntensity = value
		}
	}

	public dispose(): void {
		if (this.axesHelper) this.scene.remove(this.axesHelper)
		if (this.gridHelper) this.scene.remove(this.gridHelper)
		if (this.lightHelper) this.scene.remove(this.lightHelper)
		if (this.shadowHelper) this.scene.remove(this.shadowHelper)

		// Clean up instanced mesh
		if (this.particleInstancedMesh) {
			this.scene.remove(this.particleInstancedMesh)
			this.particleInstancedMesh.geometry.dispose()
			if (this.particleInstancedMesh.material instanceof THREE.Material) {
				this.particleInstancedMesh.material.dispose()
			}
			this.particleInstancedMesh.dispose()
			this.particleInstancedMesh = null
		}
		this.particleVelocities = []
		this.particlePositions = []

		// Clean up Three.js resources
		this.scene.traverse((object) => {
			if (object instanceof THREE.Mesh) {
				object.geometry.dispose()
				if (Array.isArray(object.material)) {
					object.material.forEach((material) => material.dispose())
				} else {
					object.material.dispose()
				}
			}
		})
	}
}
