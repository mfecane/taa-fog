import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { ResourceLoader } from '../loaders/ResourceLoader'
import { Scene } from './Scene'

export class Renderer {
	private canvas: HTMLCanvasElement
	private camera: THREE.PerspectiveCamera
	private renderer: THREE.WebGLRenderer
	private resourceLoader: ResourceLoader
	private controls: OrbitControls | null = null
	private animationFrameId: number | null = null
	private sceneBuilder: Scene | null = null

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

		// Handle window resize
		window.addEventListener('resize', () => this.onResize())
	}

	public init(): void {
		// Build scene using SceneBuilder
		this.sceneBuilder = new Scene()
		this.sceneBuilder.build()

		// Camera position
		this.camera.position.set(5, 5, 5)
		this.camera.lookAt(0, 0, 0)

		// Orbit controls
		this.controls = new OrbitControls(this.camera, this.canvas)
		this.controls.enableDamping = true
		this.controls.dampingFactor = 0.05
		this.controls.target.set(0, 0, 0)
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

		this.renderer.render(this.sceneBuilder!.scene, this.camera)
	}

	private onResize(): void {
		this.camera.aspect = window.innerWidth / window.innerHeight
		this.camera.updateProjectionMatrix()
		this.renderer.setSize(window.innerWidth, window.innerHeight)
	}

	public dispose(): void {
		if (this.animationFrameId !== null) {
			cancelAnimationFrame(this.animationFrameId)
		}

		// Clean up helpers and scene resources

		this.sceneBuilder?.dispose()

		// Clean up controls
		if (this.controls) {
			this.controls.dispose()
		}

		this.renderer.dispose()
		window.removeEventListener('resize', () => this.onResize())
	}
}
