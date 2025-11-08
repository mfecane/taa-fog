import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import * as dat from 'dat.gui'
import Stats from 'stats.js'
import { ResourceLoader } from './loaders/ResourceLoader'
import { Scene } from './Scene'
import { Pipeline } from './Pipeline'

export class Renderer {
	private canvas: HTMLCanvasElement
	private camera: THREE.PerspectiveCamera
	private renderer: THREE.WebGLRenderer
	private resourceLoader: ResourceLoader
	private controls: OrbitControls | null = null
	private animationFrameId: number | null = null
	private sceneBuilder: Scene | null = null
	private pipeline: Pipeline
	private gui: dat.GUI | null = null
	private stats: Stats | null = null

	constructor(canvas: HTMLCanvasElement, resourceLoader: ResourceLoader) {
		this.canvas = canvas
		this.resourceLoader = resourceLoader

		// Initialize Three.js core components
		this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)

		this.renderer = new THREE.WebGLRenderer({
			canvas: this.canvas,
			antialias: true,
		})
		this.renderer.setSize(window.innerWidth, window.innerHeight)
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

		// Enable shadows
		this.renderer.shadowMap.enabled = true
		this.renderer.shadowMap.type = THREE.PCFSoftShadowMap

		// Initialize pipeline with downsampling factor of 2
		this.pipeline = new Pipeline(this.renderer, this.camera, 2)

		// Handle window resize
		window.addEventListener('resize', () => this.onResize())
	}

	public init(): void {
		// Build scene using SceneBuilder
		this.sceneBuilder = new Scene()
		this.sceneBuilder.build()

		// Camera position
		this.camera.position.set(2, 2, 2)

		// Orbit controls
		this.controls = new OrbitControls(this.camera, this.canvas)
		this.controls.enableDamping = true
		this.controls.dampingFactor = 0.05
		this.controls.target.set(0, 1, 0)

		// Set scene in pipeline
		this.pipeline.setScene(this.sceneBuilder)

		// Update pipeline targets after scene is built
		this.pipeline.updateTargets()

		// Setup dat.gui controls
		this.setupGUI()

		// Setup Stats.js FPS counter
		this.setupStats()
	}

	private setupStats(): void {
		this.stats = new Stats()
		this.stats.showPanel(0) // 0: fps, 1: ms, 2: mb
		document.body.appendChild(this.stats.dom)
	}

	private setupGUI(): void {
		this.gui = new dat.GUI()

		const cubeFolder = this.gui.addFolder('Cube')
		const opacityController = cubeFolder.add(
			{ opacity: this.getCubeOpacity() },
			'opacity',
			0.0,
			1.0,
			0.01
		)
		opacityController.onChange((value: number) => {
			this.setCubeOpacity(value)
		})
		cubeFolder.open()

		const fogFolder = this.gui.addFolder('Fog')
		const fogMaterial = this.pipeline.getFogMaterial()
		if (fogMaterial) {
			const lightMultiplierController = fogFolder.add(
				{ lightMultiplier: fogMaterial.uniforms.lightMultiplier.value },
				'lightMultiplier',
				0.0,
				10.0,
				0.1
			)
			lightMultiplierController.onChange((value: number) => {
				if (fogMaterial.uniforms.lightMultiplier) {
					fogMaterial.uniforms.lightMultiplier.value = value
				}
			})

			const warpSpeedController = fogFolder.add(
				{ warpSpeed: fogMaterial.uniforms.animSpeed.value },
				'warpSpeed',
				0.0,
				2.0,
				0.01
			)
			warpSpeedController.onChange((value: number) => {
				if (fogMaterial.uniforms.animSpeed) {
					fogMaterial.uniforms.animSpeed.value = value
				}
			})
		}

		const fogBlendMaterial = this.pipeline.getFogBlendMaterial()
		if (fogBlendMaterial) {
			const blendFactorController = fogFolder.add(
				{ blendFactor: this.pipeline.getFogBlendFactor() },
				'blendFactor',
				0.0,
				1.0,
				0.01
			)
			blendFactorController.onChange((value: number) => {
				this.pipeline.setFogBlendFactor(value)
			})
		}

		const composeMaterial = this.pipeline.getComposeMaterial()
		if (composeMaterial) {
			const fogBlurController = fogFolder.add(
				{ fogBlur: this.pipeline.getFogBlurRadius() },
				'fogBlur',
				0.0,
				10.0,
				0.1
			)
			fogBlurController.onChange((value: number) => {
				this.pipeline.setFogBlurRadius(value)
			})
		}
		fogFolder.open()
	}

	private getCubeOpacity(): number {
		if (!this.sceneBuilder?.cube?.material) return 0.5
		const material = this.sceneBuilder.cube.material
		if (material instanceof THREE.MeshPhysicalMaterial) {
			return material.opacity
		}
		return 0.5
	}

	private setCubeOpacity(value: number): void {
		if (!this.sceneBuilder?.cube?.material) return
		const material = this.sceneBuilder.cube.material
		if (material instanceof THREE.MeshPhysicalMaterial) {
			material.opacity = value
		}
	}

	public start(): void {
		const animate = (): void => {
			this.animationFrameId = requestAnimationFrame(animate)
			this.render()
		}
		animate()
	}

	public render(): void {
		// Update Stats.js
		if (this.stats) {
			this.stats.begin()
		}

		// Update controls (required when damping is enabled)
		if (this.controls) {
			this.controls.update()
		}

		// Render through pipeline
		this.pipeline.render()

		// End Stats.js measurement
		if (this.stats) {
			this.stats.end()
		}
	}

	private onResize(): void {
		this.camera.aspect = window.innerWidth / window.innerHeight
		this.camera.updateProjectionMatrix()
		this.pipeline.updateProjectionMatrix()
		this.renderer.setSize(window.innerWidth, window.innerHeight)
		this.pipeline.updateTargets()
	}

	public toggleHelpers(): void {
		if (!this.sceneBuilder) return

		const visible = !this.sceneBuilder.axesHelper?.visible
		if (this.sceneBuilder.axesHelper) this.sceneBuilder.axesHelper.visible = visible
		if (this.sceneBuilder.gridHelper) this.sceneBuilder.gridHelper.visible = visible
		if (this.sceneBuilder.lightHelper) this.sceneBuilder.lightHelper.visible = visible
		if (this.sceneBuilder.shadowHelper) this.sceneBuilder.shadowHelper.visible = visible
	}

	public dispose(): void {
		if (this.animationFrameId !== null) {
			cancelAnimationFrame(this.animationFrameId)
		}

		// Clean up helpers and scene resources
		this.sceneBuilder?.dispose()

		// Clean up pipeline
		this.pipeline.dispose()

		// Clean up controls
		if (this.controls) {
			this.controls.dispose()
		}

		// Clean up GUI
		if (this.gui) {
			this.gui.destroy()
		}

		this.renderer.dispose()
		window.removeEventListener('resize', () => this.onResize())
	}
}
