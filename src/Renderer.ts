import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
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

		// Initialize pipeline
		this.pipeline = new Pipeline(this.renderer, this.camera)

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
	}

	public start(): void {
		const animate = (): void => {
			this.animationFrameId = requestAnimationFrame(animate)
			this.render()
		}
		animate()
	}

	public render(): void {
		// Update controls (required when damping is enabled)
		if (this.controls) {
			this.controls.update()
		}

		// Render through pipeline
		this.pipeline.render()
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

		this.renderer.dispose()
		window.removeEventListener('resize', () => this.onResize())
	}
}
