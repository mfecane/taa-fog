import * as THREE from 'three'

export class Scene {
	public scene: THREE.Scene
	public cube: THREE.Mesh | null = null
	public floor: THREE.Mesh | null = null
	public pointLight: THREE.PointLight | null = null
	public axesHelper: THREE.AxesHelper | null = null
	public gridHelper: THREE.GridHelper | null = null
	public lightHelper: THREE.PointLightHelper | null = null
	public shadowHelper: THREE.CameraHelper | null = null
	private showHelpers: boolean = true

	public constructor() {
		this.scene = new THREE.Scene()
	}

	public build(): void {
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

		// Cube
		const cubeGeometry = new THREE.BoxGeometry(1, 1, 1)
		const cubeMaterial = new THREE.MeshStandardMaterial({
			color: 0x999999,
			roughness: 0.7,
			metalness: 0.3,
			transparent: true,
			opacity: 0.5,
		})
		this.cube = new THREE.Mesh(cubeGeometry, cubeMaterial)
		this.cube.position.set(0, 2, 0)
		this.cube.castShadow = true
		this.cube.receiveShadow = true
		this.scene.add(this.cube)

		// Point light
		this.pointLight = new THREE.PointLight(0xffffff, 10, 100)
		this.pointLight.position.set(1, 4, 1)
		this.pointLight.castShadow = true
		this.pointLight.shadow.mapSize.width = 2048
		this.pointLight.shadow.mapSize.height = 2048
		this.pointLight.shadow.camera.near = 0.5
		this.pointLight.shadow.camera.far = 50
		this.scene.add(this.pointLight)

		// Ambient light for overall illumination
		const ambientLight = new THREE.AmbientLight(0x404040, 0.4)
		this.scene.add(ambientLight)

		// Setup helpers
		this.axesHelper = new THREE.AxesHelper(5)
		this.axesHelper.visible = this.showHelpers
		this.scene.add(this.axesHelper)

		this.gridHelper = new THREE.GridHelper(20, 20)
		this.gridHelper.visible = this.showHelpers
		this.scene.add(this.gridHelper)

		this.lightHelper = new THREE.PointLightHelper(this.pointLight, 0.5)
		this.lightHelper.visible = this.showHelpers
		this.scene.add(this.lightHelper)

		this.shadowHelper = new THREE.CameraHelper(this.pointLight.shadow.camera)
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
