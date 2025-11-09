import * as dat from 'dat.gui'
import { Pipeline } from '../Pipeline'
import { Scene } from '../Scene'
import { SettingsStorage } from './SettingsStorage'

export interface SettingsData {
	render: {
		downsampling: number
	}
	fog: {
		lightMultiplier: number
		warpSpeed: number
		blendFactor: number
		fogBlur: number
		fogSteps: number
		rayNoiseScale: number
	}
	particles: {
		brightness: number
	}
	postProcessing: {
		vignetteIntensity: number
		vignetteRadius: number
		exposure: number
		contrast: number
		saturation: number
		brightness: number
	}
}

export class Settings {
	private data: SettingsData
	private gui: dat.GUI | null = null

	constructor() {
		this.data = Settings.getDefaults()
	}

	static getDefaults(): SettingsData {
		return {
			render: {
				downsampling: 2,
			},
			fog: {
				lightMultiplier: 0.9,
				warpSpeed: 0.4,
				blendFactor: 0.75,
				fogBlur: 2.0,
				fogSteps: 55,
				rayNoiseScale: 0.012,
			},
			particles: {
				brightness: 0.3,
			},
			postProcessing: {
				vignetteIntensity: 0.61,
				vignetteRadius: 0.85,
				exposure: 1.46,
				contrast: 1.11,
				saturation: 0.65,
				brightness: 1.07,
			},
		}
	}

	getData(): SettingsData {
		return this.data
	}

	setData(data: Partial<SettingsData>): void {
		this.data = { ...this.data, ...data }
		if (data.render) {
			const defaultRender = Settings.getDefaults().render
			this.data.render = { ...defaultRender, ...this.data.render, ...data.render }
		}
		if (data.fog) {
			const defaultFog = Settings.getDefaults().fog
			this.data.fog = { ...defaultFog, ...this.data.fog, ...data.fog }
		}
		if (data.particles) {
			this.data.particles = { ...this.data.particles, ...data.particles }
		}
		if (data.postProcessing) {
			const defaultPostProcessing = Settings.getDefaults().postProcessing
			this.data.postProcessing = { ...defaultPostProcessing, ...this.data.postProcessing, ...data.postProcessing }
		}
	}

	// Render
	getDownsampling(): number {
		return this.data.render.downsampling
	}

	setDownsampling(value: number): void {
		this.data.render.downsampling = value
	}

	// Fog
	getFogLightMultiplier(): number {
		return this.data.fog.lightMultiplier
	}

	setFogLightMultiplier(value: number): void {
		this.data.fog.lightMultiplier = value
	}

	getFogWarpSpeed(): number {
		return this.data.fog.warpSpeed
	}

	setFogWarpSpeed(value: number): void {
		this.data.fog.warpSpeed = value
	}

	getFogBlendFactor(): number {
		return this.data.fog.blendFactor
	}

	setFogBlendFactor(value: number): void {
		this.data.fog.blendFactor = value
	}

	getFogBlur(): number {
		return this.data.fog.fogBlur
	}

	setFogBlur(value: number): void {
		this.data.fog.fogBlur = value
	}

	getFogSteps(): number {
		return this.data.fog.fogSteps
	}

	setFogSteps(value: number): void {
		this.data.fog.fogSteps = value
	}

	getRayNoiseScale(): number {
		return this.data.fog.rayNoiseScale
	}

	setRayNoiseScale(value: number): void {
		this.data.fog.rayNoiseScale = value
	}

	// Particles
	getParticleBrightness(): number {
		return this.data.particles.brightness
	}

	setParticleBrightness(value: number): void {
		this.data.particles.brightness = value
	}

	// Post Processing
	getVignetteIntensity(): number {
		return this.data.postProcessing.vignetteIntensity
	}

	setVignetteIntensity(value: number): void {
		this.data.postProcessing.vignetteIntensity = value
	}

	getVignetteRadius(): number {
		return this.data.postProcessing.vignetteRadius
	}

	setVignetteRadius(value: number): void {
		this.data.postProcessing.vignetteRadius = value
	}

	getExposure(): number {
		return this.data.postProcessing.exposure
	}

	setExposure(value: number): void {
		this.data.postProcessing.exposure = value
	}

	getContrast(): number {
		return this.data.postProcessing.contrast
	}

	setContrast(value: number): void {
		this.data.postProcessing.contrast = value
	}

	getSaturation(): number {
		return this.data.postProcessing.saturation
	}

	setSaturation(value: number): void {
		this.data.postProcessing.saturation = value
	}

	getPostProcessingBrightness(): number {
		return this.data.postProcessing.brightness
	}

	setPostProcessingBrightness(value: number): void {
		this.data.postProcessing.brightness = value
	}

	public setupGUI(
		pipeline: Pipeline,
		scene: Scene,
		settingsStorage: SettingsStorage | null
	): void {
		this.gui = new dat.GUI()

		const renderFolder = this.gui.addFolder('Render')
		const downsamplingController = renderFolder.add(
			{ downsampling: this.getDownsampling() },
			'downsampling',
			[1, 2, 4]
		)
		downsamplingController.onChange((value: number) => {
			this.setDownsampling(value)
			pipeline.setDownsamplingFactor(value)
			this.saveSettings(settingsStorage)
		})
		renderFolder.open()

		const fogFolder = this.gui.addFolder('Fog')
		const fogMaterial = pipeline.getFogMaterial()
		if (fogMaterial) {
			const lightMultiplierController = fogFolder.add(
				{ lightMultiplier: this.getFogLightMultiplier() },
				'lightMultiplier',
				0.0,
				2.0,
				0.1
			)
			lightMultiplierController.onChange((value: number) => {
				this.setFogLightMultiplier(value)
				if (fogMaterial.uniforms.lightMultiplier) {
					fogMaterial.uniforms.lightMultiplier.value = value
				}
				this.saveSettings(settingsStorage)
			})

			const warpSpeedController = fogFolder.add(
				{ warpSpeed: this.getFogWarpSpeed() },
				'warpSpeed',
				0.0,
				1.0,
				0.01
			)
			warpSpeedController.onChange((value: number) => {
				this.setFogWarpSpeed(value)
				if (fogMaterial.uniforms.animSpeed) {
					fogMaterial.uniforms.animSpeed.value = value
				}
				this.saveSettings(settingsStorage)
			})

			const fogStepsController = fogFolder.add(
				{ fogSteps: this.getFogSteps() },
				'fogSteps',
				16,
				128,
				1
			)
			fogStepsController.onChange((value: number) => {
				this.setFogSteps(value)
				if (fogMaterial.uniforms.fogSteps) {
					fogMaterial.uniforms.fogSteps.value = value
				}
				this.saveSettings(settingsStorage)
			})

			const rayNoiseScaleController = fogFolder.add(
				{ rayNoiseScale: this.getRayNoiseScale() },
				'rayNoiseScale',
				0.001,
				0.03,
				0.001
			)
			rayNoiseScaleController.onChange((value: number) => {
				this.setRayNoiseScale(value)
				if (fogMaterial.uniforms.rayNoiseScale) {
					fogMaterial.uniforms.rayNoiseScale.value = value
				}
				this.saveSettings(settingsStorage)
			})
		}

		const fogBlendMaterial = pipeline.getFogBlendMaterial()
		if (fogBlendMaterial) {
			const blendFactorController = fogFolder.add(
				{ blendFactor: this.getFogBlendFactor() },
				'blendFactor',
				0.0,
				1.0,
				0.01
			)
			blendFactorController.onChange((value: number) => {
				this.setFogBlendFactor(value)
				pipeline.setFogBlendFactor(value)
				this.saveSettings(settingsStorage)
			})
		}

		const composeMaterial = pipeline.getComposeMaterial()
		if (composeMaterial) {
			const fogBlurController = fogFolder.add(
				{ fogBlur: this.getFogBlur() },
				'fogBlur',
				0.0,
				5.0,
				0.1
			)
			fogBlurController.onChange((value: number) => {
				this.setFogBlur(value)
				pipeline.setFogBlurRadius(value)
				this.saveSettings(settingsStorage)
			})
		}
		fogFolder.open()

		const particlesFolder = this.gui.addFolder('Particles')
		const brightnessController = particlesFolder.add(
			{ brightness: this.getParticleBrightness() },
			'brightness',
			0.0,
			0.2,
			0.01
		)
		brightnessController.onChange((value: number) => {
			this.setParticleBrightness(value)
			scene.setParticleBrightness(value)
			this.saveSettings(settingsStorage)
		})
		particlesFolder.open()

		const postProcessingFolder = this.gui.addFolder('Post Processing')
		if (composeMaterial) {
			// Vignette
			const vignetteIntensityController = postProcessingFolder.add(
				{ vignetteIntensity: this.getVignetteIntensity() },
				'vignetteIntensity',
				0.0,
				1.0,
				0.01
			)
			vignetteIntensityController.onChange((value: number) => {
				this.setVignetteIntensity(value)
				pipeline.setVignetteIntensity(value)
				this.saveSettings(settingsStorage)
			})

			const vignetteRadiusController = postProcessingFolder.add(
				{ vignetteRadius: this.getVignetteRadius() },
				'vignetteRadius',
				0.0,
				1.0,
				0.01
			)
			vignetteRadiusController.onChange((value: number) => {
				this.setVignetteRadius(value)
				pipeline.setVignetteRadius(value)
				this.saveSettings(settingsStorage)
			})

			// Color Correction
			const exposureController = postProcessingFolder.add(
				{ exposure: this.getExposure() },
				'exposure',
				0.0,
				2.0,
				0.01
			)
			exposureController.onChange((value: number) => {
				this.setExposure(value)
				pipeline.setExposure(value)
				this.saveSettings(settingsStorage)
			})

			const contrastController = postProcessingFolder.add(
				{ contrast: this.getContrast() },
				'contrast',
				0.0,
				2.0,
				0.01
			)
			contrastController.onChange((value: number) => {
				this.setContrast(value)
				pipeline.setContrast(value)
				this.saveSettings(settingsStorage)
			})

			const saturationController = postProcessingFolder.add(
				{ saturation: this.getSaturation() },
				'saturation',
				0.0,
				2.0,
				0.01
			)
			saturationController.onChange((value: number) => {
				this.setSaturation(value)
				pipeline.setSaturation(value)
				this.saveSettings(settingsStorage)
			})

			const brightnessController = postProcessingFolder.add(
				{ brightness: this.getPostProcessingBrightness() },
				'brightness',
				0.0,
				2.0,
				0.01
			)
			brightnessController.onChange((value: number) => {
				this.setPostProcessingBrightness(value)
				pipeline.setPostProcessingBrightness(value)
				this.saveSettings(settingsStorage)
			})
		}
		postProcessingFolder.open()
	}

	private async saveSettings(settingsStorage: SettingsStorage | null): Promise<void> {
		if (settingsStorage) {
			try {
				await settingsStorage.save(this)
			} catch (error) {
				console.warn('Failed to save settings to IndexedDB:', error)
			}
		}
	}

	public dispose(): void {
		if (this.gui) {
			this.gui.destroy()
			this.gui = null
		}
	}
}

