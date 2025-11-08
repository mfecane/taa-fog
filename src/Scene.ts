import * as THREE from 'three'

export class Scene {
	public scene: THREE.Scene
	public cube: THREE.Mesh | null = null
	public floor: THREE.Mesh | null = null
	public directionalLight: THREE.DirectionalLight | null = null
	public axesHelper: THREE.AxesHelper | null = null
	public gridHelper: THREE.GridHelper | null = null
	public lightHelper: THREE.DirectionalLightHelper | null = null
	public shadowHelper: THREE.CameraHelper | null = null
	public particles: THREE.Mesh[] = []
	private showHelpers: boolean = false
	private particleBrightness: number = 1.5

	// Size variables - 4x smaller than screen
	private readonly renderWidth: number = window.innerWidth / 4
	private readonly renderHeight: number = window.innerHeight / 4
	private readonly cubeSize: number = 1 // 1.0 / 4
	private readonly cubePositionY: number = 1 // 2.0 / 4
	private readonly bayerMatrixSize: number = 4.0

	public constructor() {
		this.scene = new THREE.Scene()
	}

	public build(): void {
		// Set background color for areas without geometry
		this.scene.background = new THREE.Color(0x1a1a26) // Dark blue-gray

		// Floor plane
		const floorGeometry = new THREE.PlaneGeometry(20, 20)
		const floorMaterial = new THREE.MeshStandardMaterial({
			color: 0x808080,
			roughness: 0.8,
			metalness: 0.2,
		})
		this.floor = new THREE.Mesh(floorGeometry, floorMaterial)
		this.floor.rotation.x = -Math.PI / 2 // Rotate to be horizontal
		this.floor.position.y = -0.1
		this.floor.receiveShadow = true
		this.scene.add(this.floor)

		// Create RGBA texture with alpha channel (transparent on top, opaque on bottom)
		const textureSize = 256
		const textureCanvas = document.createElement('canvas')
		textureCanvas.width = textureSize
		textureCanvas.height = textureSize
		const textureContext = textureCanvas.getContext('2d')!

		// Create RGBA gradient from transparent (top) to opaque (bottom)
		// Using a simple color gradient with alpha channel
		const gradient = textureContext.createLinearGradient(0, 0, 0, textureSize)
		gradient.addColorStop(0, 'rgba(150, 150, 180, 0)') // Transparent blue at top
		gradient.addColorStop(1, 'rgba(150, 150, 180, 1)') // Opaque blue at bottom
		textureContext.fillStyle = gradient
		textureContext.fillRect(0, 0, textureSize, textureSize)

		const rgbaTexture = new THREE.CanvasTexture(textureCanvas)
		rgbaTexture.needsUpdate = true

		// Cylinder with MeshPhysicalMaterial (stretched 50% along Y axis)
		const cylinderRadius = this.cubeSize / 2
		const cylinderHeight = this.cubeSize * 1.5 // 50% stretch
		const cylinderGeometry = new THREE.CylinderGeometry(cylinderRadius, cylinderRadius, cylinderHeight, 32)
		const cylinderMaterial = new THREE.MeshPhysicalMaterial({
			opacity: 1.0, // Use full opacity since texture alpha channel controls it
			transparent: true,
			map: rgbaTexture, // Use map with alpha channel instead of alphaMap
		})
		this.cube = new THREE.Mesh(cylinderGeometry, cylinderMaterial)
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
		// Create radial gradient texture for particles
		const textureSize = 64
		const textureCanvas = document.createElement('canvas')
		textureCanvas.width = textureSize
		textureCanvas.height = textureSize
		const textureContext = textureCanvas.getContext('2d')!

		// Create radial gradient (opaque center, transparent edges)
		const centerX = textureSize / 2
		const centerY = textureSize / 2
		const radius = textureSize / 2
		const gradient = textureContext.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius)
		gradient.addColorStop(0, 'rgba(255, 255, 255, 1.0)') // Opaque white center
		gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.5)') // Semi-transparent middle
		gradient.addColorStop(1, 'rgba(255, 255, 255, 0.0)') // Transparent edges
		textureContext.fillStyle = gradient
		textureContext.fillRect(0, 0, textureSize, textureSize)

		const particleTexture = new THREE.CanvasTexture(textureCanvas)
		particleTexture.needsUpdate = true

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

		// Create particle cloud (200 particles)
		const particleCount = 200
		for (let i = 0; i < particleCount; i++) {
			const particle = new THREE.Mesh(particleGeometry, particleMaterial.clone())

			// Random position in a sphere around the scene
			const radius = 2 + Math.random() * 3
			const theta = Math.random() * Math.PI * 2
			const phi = Math.acos(2 * Math.random() - 1)
			particle.position.set(
				radius * Math.sin(phi) * Math.cos(theta),
				0.5 + Math.random() * 2,
				radius * Math.sin(phi) * Math.sin(theta)
			)

			// Store random velocity for movement (very slow)
			;(particle as any).velocity = new THREE.Vector3(
				(Math.random() - 0.5) * 0.002,
				(Math.random() - 0.5) * 0.002,
				(Math.random() - 0.5) * 0.002
			)

			this.particles.push(particle)
			this.scene.add(particle)
		}
	}

	public updateParticles(camera?: THREE.Camera): void {
		const time = Date.now() * 0.001
		this.particles.forEach((particle) => {
			const velocity = (particle as any).velocity
			if (velocity) {
				// Update position with random movement
				particle.position.add(velocity)

				// Add some noise for more organic movement (very slow)
				particle.position.x += Math.sin(time + particle.position.y * 10) * 0.0001
				particle.position.y += Math.cos(time + particle.position.x * 10) * 0.0001
				particle.position.z += Math.sin(time + particle.position.x * 10) * 0.0001

				// Wrap around bounds
				if (particle.position.x > 5) particle.position.x = -5
				if (particle.position.x < -5) particle.position.x = 5
				if (particle.position.y > 4) particle.position.y = 0
				if (particle.position.y < 0) particle.position.y = 4
				if (particle.position.z > 5) particle.position.z = -5
				if (particle.position.z < -5) particle.position.z = 5
			}

			// Billboard: make sprite always face the camera
			if (camera) {
				particle.lookAt(camera.position)
			}
		})
	}

	public getParticleBrightness(): number {
		return this.particleBrightness
	}

	public setParticleBrightness(value: number): void {
		this.particleBrightness = value
		// Update all particle materials
		this.particles.forEach((particle) => {
			if (particle.material instanceof THREE.MeshPhysicalMaterial) {
				particle.material.emissiveIntensity = value
			}
		})
	}

	public dispose(): void {
		if (this.axesHelper) this.scene.remove(this.axesHelper)
		if (this.gridHelper) this.scene.remove(this.gridHelper)
		if (this.lightHelper) this.scene.remove(this.lightHelper)
		if (this.shadowHelper) this.scene.remove(this.shadowHelper)

		// Clean up particles
		this.particles.forEach((particle) => {
			this.scene.remove(particle)
			particle.geometry.dispose()
			if (particle.material instanceof THREE.Material) {
				particle.material.dispose()
			}
		})
		this.particles = []

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
