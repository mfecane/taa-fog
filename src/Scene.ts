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
	private showHelpers: boolean = false

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
		gradient.addColorStop(0, 'rgba(100, 150, 200, 0)') // Transparent blue at top
		gradient.addColorStop(1, 'rgba(100, 150, 200, 1)') // Opaque blue at bottom
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


	public dispose(): void {
		if (this.axesHelper) this.scene.remove(this.axesHelper)
		if (this.gridHelper) this.scene.remove(this.gridHelper)
		if (this.lightHelper) this.scene.remove(this.lightHelper)
		if (this.shadowHelper) this.scene.remove(this.shadowHelper)

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
