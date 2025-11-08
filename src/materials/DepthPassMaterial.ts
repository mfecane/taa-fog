import * as THREE from 'three'
import depthPassVert from '../shaders/depthPass.vert.glsl?raw'
import depthPassFrag from '../shaders/depthPass.frag.glsl?raw'

export class DepthPassMaterial extends THREE.ShaderMaterial {
	public constructor(
		renderWidth: number,
		renderHeight: number
	) {
		super({
			uniforms: {
				tDepth: { value: null },
				jitterIndex: { value: 0 },
				resolution: { value: new THREE.Vector2(renderWidth, renderHeight) },
			},
			vertexShader: depthPassVert,
			fragmentShader: depthPassFrag,
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

