import * as THREE from 'three'
import stochasticTransparencyVert from '../shaders/stochasticTransparency.vert.glsl?raw'
import stochasticTransparencyFrag from '../shaders/stochasticTransparency.frag.glsl?raw'

export class StochasticTransparencyMaterial extends THREE.ShaderMaterial {
	public constructor(
		renderWidth: number,
		renderHeight: number,
		bayerMatrixSize: number = 4.0
	) {
		super({
			uniforms: {
				opacity: { value: 0.5 }, // Target opacity (achieved through TAA)
				jitterIndex: { value: 0 },
				resolution: { value: new THREE.Vector2(renderWidth, renderHeight) },
				bayerMatrixSize: { value: bayerMatrixSize },
			},
			vertexShader: stochasticTransparencyVert,
			fragmentShader: stochasticTransparencyFrag,
			transparent: false, // No traditional transparency
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
}

