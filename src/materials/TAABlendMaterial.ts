import * as THREE from 'three'
import taaBlendVert from '../shaders/taaBlend.vert.glsl?raw'
import taaBlendFrag from '../shaders/taaBlend.frag.glsl?raw'

export class TAABlendMaterial extends THREE.ShaderMaterial {
	public constructor(width: number, height: number) {
		super({
			uniforms: {
				tCurrent: { value: null },
				tHistory: { value: null },
				tVelocity: { value: null },
				tDepth: { value: null },
				tHistoryDepth: { value: null },
				baseBlend: { value: 0.01 },
				maxHistoryWeight: { value: 0.9 },
				depthThreshold: { value: 0.01 },
				texelSize: { value: new THREE.Vector2(1.0 / width, 1.0 / height) },
			},
			vertexShader: taaBlendVert,
			fragmentShader: taaBlendFrag,
			transparent: true,
			depthWrite: false,
		})
	}

	public updateTexelSize(width: number, height: number): void {
		if (this.uniforms.texelSize) {
			this.uniforms.texelSize.value.set(1.0 / width, 1.0 / height)
		}
	}
}

