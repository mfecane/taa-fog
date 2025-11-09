import * as THREE from 'three'
import composeVert from '../shaders/compose.vert.glsl?raw'
import composeFrag from '../shaders/compose.frag.glsl?raw'

export class ComposeMaterial extends THREE.ShaderMaterial {
	public constructor(width: number, height: number) {
		super({
			uniforms: {
				tColor: { value: null },
				tFog: { value: null },
				backgroundColor: { value: new THREE.Vector3(0.1, 0.1, 0.15) }, // Dark blue-gray background
				texelSize: { value: new THREE.Vector2(1.0 / width, 1.0 / height) },
				fogBlurRadius: { value: 2.0 }, // Blur radius for fog (0 = no blur)
				// Vignette
				vignetteIntensity: { value: 0.61 },
				vignetteRadius: { value: 0.85 },
				// Color correction
				exposure: { value: 1.46 },
				contrast: { value: 1.11 },
				saturation: { value: 0.65 },
				brightness: { value: 1.07 },
			},
			vertexShader: composeVert,
			fragmentShader: composeFrag,
			transparent: true,
			depthWrite: false,
		})
	}

	public updateResolution(width: number, height: number): void {
		if (this.uniforms.texelSize) {
			this.uniforms.texelSize.value.set(1.0 / width, 1.0 / height)
		}
	}

	public setFogBlurRadius(value: number): void {
		if (this.uniforms.fogBlurRadius) {
			this.uniforms.fogBlurRadius.value = value
		}
	}

	public getFogBlurRadius(): number {
		return this.uniforms.fogBlurRadius?.value ?? 0.0
	}

	public setVignetteIntensity(value: number): void {
		if (this.uniforms.vignetteIntensity) {
			this.uniforms.vignetteIntensity.value = value
		}
	}

	public setVignetteRadius(value: number): void {
		if (this.uniforms.vignetteRadius) {
			this.uniforms.vignetteRadius.value = value
		}
	}

	public setExposure(value: number): void {
		if (this.uniforms.exposure) {
			this.uniforms.exposure.value = value
		}
	}

	public setContrast(value: number): void {
		if (this.uniforms.contrast) {
			this.uniforms.contrast.value = value
		}
	}

	public setSaturation(value: number): void {
		if (this.uniforms.saturation) {
			this.uniforms.saturation.value = value
		}
	}

	public setBrightness(value: number): void {
		if (this.uniforms.brightness) {
			this.uniforms.brightness.value = value
		}
	}
}

