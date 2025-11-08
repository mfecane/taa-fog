export interface SettingsData {
	cube: {
		opacity: number
	}
	fog: {
		lightMultiplier: number
		warpSpeed: number
		blendFactor: number
		fogBlur: number
	}
	particles: {
		brightness: number
	}
}

export class Settings {
	private data: SettingsData

	constructor() {
		this.data = Settings.getDefaults()
	}

	static getDefaults(): SettingsData {
		return {
			cube: {
				opacity: 0.5,
			},
			fog: {
				lightMultiplier: 2.0,
				warpSpeed: 0.4,
				blendFactor: 0.7,
				fogBlur: 2.0,
			},
			particles: {
				brightness: 1.5,
			},
		}
	}

	getData(): SettingsData {
		return this.data
	}

	setData(data: Partial<SettingsData>): void {
		this.data = { ...this.data, ...data }
		if (data.cube) {
			this.data.cube = { ...this.data.cube, ...data.cube }
		}
		if (data.fog) {
			this.data.fog = { ...this.data.fog, ...data.fog }
		}
		if (data.particles) {
			this.data.particles = { ...this.data.particles, ...data.particles }
		}
	}

	// Cube
	getCubeOpacity(): number {
		return this.data.cube.opacity
	}

	setCubeOpacity(value: number): void {
		this.data.cube.opacity = value
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

	// Particles
	getParticleBrightness(): number {
		return this.data.particles.brightness
	}

	setParticleBrightness(value: number): void {
		this.data.particles.brightness = value
	}
}

