import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import * as dat from 'dat.gui'
import Stats from 'stats.js'
import { ResourceLoader } from './loaders/ResourceLoader'
import { Scene } from './Scene'
import { Pipeline } from './Pipeline'
import { Settings } from './utils/Settings'
import { SettingsStorage } from './utils/SettingsStorage'

export class Renderer {
	private canvas: HTMLCanvasElement
	private camera: THREE.PerspectiveCamera
	private renderer: THREE.WebGLRenderer
	// @ts-ignore - Reserved for future use
	private _resourceLoader: ResourceLoader
	private controls: OrbitControls | null = null
	private animationFrameId: number | null = null
	private sceneBuilder: Scene | null = null
	private pipeline: Pipeline
	private gui: dat.GUI | null = null
	private stats: Stats | null = null
	private settings: Settings
	private settingsStorage: SettingsStorage | null = null

	constructor(canvas: HTMLCanvasElement, resourceLoader: ResourceLoader) {
		this.canvas = canvas
		this._resourceLoader = resourceLoader

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
		this.pipeline = new Pipeline(this.renderer, this.camera)

		// Initialize settings
		this.settings = new Settings()

		// Handle window resize
		window.addEventListener('resize', () => this.onResize())
	}

	public async init(): Promise<void> {
		// Load settings from IndexedDB
		try {
			this.settingsStorage = await SettingsStorage.getInstance()
			const savedSettings = await this.settingsStorage.load()
			if (savedSettings) {
				this.settings.setData(savedSettings)
			}
		} catch (error) {
			console.warn('Failed to load settings from IndexedDB:', error)
		}

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

		// Apply loaded settings
		this.applySettings()

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
			{ opacity: this.settings.getCubeOpacity() },
			'opacity',
			0.0,
			1.0,
			0.01
		)
		opacityController.onChange((value: number) => {
			this.settings.setCubeOpacity(value)
			this.setCubeOpacity(value)
			this.saveSettings()
		})
		cubeFolder.open()

		const fogFolder = this.gui.addFolder('Fog')
		const fogMaterial = this.pipeline.getFogMaterial()
		if (fogMaterial) {
			const lightMultiplierController = fogFolder.add(
				{ lightMultiplier: this.settings.getFogLightMultiplier() },
				'lightMultiplier',
				0.0,
				10.0,
				0.1
			)
			lightMultiplierController.onChange((value: number) => {
				this.settings.setFogLightMultiplier(value)
				if (fogMaterial.uniforms.lightMultiplier) {
					fogMaterial.uniforms.lightMultiplier.value = value
				}
				this.saveSettings()
			})

			const warpSpeedController = fogFolder.add(
				{ warpSpeed: this.settings.getFogWarpSpeed() },
				'warpSpeed',
				0.0,
				2.0,
				0.01
			)
			warpSpeedController.onChange((value: number) => {
				this.settings.setFogWarpSpeed(value)
				if (fogMaterial.uniforms.animSpeed) {
					fogMaterial.uniforms.animSpeed.value = value
				}
				this.saveSettings()
			})
		}

		const fogBlendMaterial = this.pipeline.getFogBlendMaterial()
		if (fogBlendMaterial) {
			const blendFactorController = fogFolder.add(
				{ blendFactor: this.settings.getFogBlendFactor() },
				'blendFactor',
				0.0,
				1.0,
				0.01
			)
			blendFactorController.onChange((value: number) => {
				this.settings.setFogBlendFactor(value)
				this.pipeline.setFogBlendFactor(value)
				this.saveSettings()
			})
		}

		const composeMaterial = this.pipeline.getComposeMaterial()
		if (composeMaterial) {
			const fogBlurController = fogFolder.add(
				{ fogBlur: this.settings.getFogBlur() },
				'fogBlur',
				0.0,
				10.0,
				0.1
			)
			fogBlurController.onChange((value: number) => {
				this.settings.setFogBlur(value)
				this.pipeline.setFogBlurRadius(value)
				this.saveSettings()
			})
		}
		fogFolder.open()

		const particlesFolder = this.gui.addFolder('Particles')
		const brightnessController = particlesFolder.add(
			{ brightness: this.settings.getParticleBrightness() },
			'brightness',
			0.0,
			5.0,
			0.1
		)
		brightnessController.onChange((value: number) => {
			this.settings.setParticleBrightness(value)
			this.setParticleBrightness(value)
			this.saveSettings()
		})
		particlesFolder.open()
	}

	private applySettings(): void {
		// Apply cube opacity
		this.setCubeOpacity(this.settings.getCubeOpacity())

		// Apply fog settings
		const fogMaterial = this.pipeline.getFogMaterial()
		if (fogMaterial) {
			if (fogMaterial.uniforms.lightMultiplier) {
				fogMaterial.uniforms.lightMultiplier.value = this.settings.getFogLightMultiplier()
			}
			if (fogMaterial.uniforms.animSpeed) {
				fogMaterial.uniforms.animSpeed.value = this.settings.getFogWarpSpeed()
			}
		}

		this.pipeline.setFogBlendFactor(this.settings.getFogBlendFactor())
		this.pipeline.setFogBlurRadius(this.settings.getFogBlur())

		// Apply particle brightness
		this.setParticleBrightness(this.settings.getParticleBrightness())
	}

	private async saveSettings(): Promise<void> {
		if (this.settingsStorage) {
			try {
				await this.settingsStorage.save(this.settings)
			} catch (error) {
				console.warn('Failed to save settings to IndexedDB:', error)
			}
		}
	}

	private setCubeOpacity(value: number): void {
		if (!this.sceneBuilder?.cube?.material) return
		const material = this.sceneBuilder.cube.material
		if (material instanceof THREE.MeshPhysicalMaterial) {
			material.opacity = value
		}
	}

	private setParticleBrightness(value: number): void {
		if (this.sceneBuilder) {
			this.sceneBuilder.setParticleBrightness(value)
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

		// Update particle positions and billboard them to face camera
		if (this.sceneBuilder) {
			this.sceneBuilder.updateParticles(this.camera)
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
