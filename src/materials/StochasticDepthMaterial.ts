import * as THREE from 'three'
import stochasticDepthVert from '../shaders/stochasticDepth.vert.glsl?raw'
import stochasticDepthFrag from '../shaders/stochasticDepth.frag.glsl?raw'

export class StochasticDepthMaterial extends THREE.ShaderMaterial {
	public constructor(
		renderWidth: number,
		renderHeight: number,
		bayerMatrixSize: number = 4.0
	) {
		super({
			uniforms: {
				opacity: { value: 0.5 },
				jitterIndex: { value: 0 },
				resolution: { value: new THREE.Vector2(renderWidth, renderHeight) },
				bayerMatrixSize: { value: bayerMatrixSize },
				opacityMap: { value: null },
				hasOpacityMap: { value: false },
			},
			vertexShader: stochasticDepthVert,
			fragmentShader: stochasticDepthFrag,
			transparent: false,
			depthWrite: true,
			depthTest: true,
		})
	}

	public updateResolution(width: number, height: number): void {
		if (this.uniforms.resolution) {
			this.uniforms.resolution.value.set(width, height)
		}
	}

	public updateJitterIndex(index: number): void {
		if (this.uniforms.jitterIndex) {
			this.uniforms.jitterIndex.value = index
		}
	}

	public updateOpacity(value: number): void {
		if (this.uniforms.opacity) {
			this.uniforms.opacity.value = value
		}
	}

	public updateOpacityMap(texture: THREE.Texture | null): void {
		if (this.uniforms.opacityMap) {
			this.uniforms.opacityMap.value = texture
		}
		if (this.uniforms.hasOpacityMap) {
			this.uniforms.hasOpacityMap.value = texture !== null
		}
	}
}

