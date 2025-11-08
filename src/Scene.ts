import * as THREE from 'three'
import { StochasticTransparencyMaterial } from './materials/StochasticTransparencyMaterial'

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

		// Cube with stochastic transparency (TAA-based, not Three.js default)
		const cubeGeometry = new THREE.BoxGeometry(this.cubeSize, this.cubeSize, this.cubeSize)
		const cubeMaterial = this.createStochasticTransparencyMaterial()
		this.cube = new THREE.Mesh(cubeGeometry, cubeMaterial)
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

	private createStochasticTransparencyMaterial(): StochasticTransparencyMaterial {
		// Material that uses alpha testing for stochastic transparency
		// Transparency is achieved through TAA accumulation, not traditional alpha blending
		return new StochasticTransparencyMaterial(
			this.renderWidth,
			this.renderHeight,
			this.bayerMatrixSize
		)
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
