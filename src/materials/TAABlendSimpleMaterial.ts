import * as THREE from 'three'
import taaBlendSimpleVert from '../shaders/taaBlendSimple.vert.glsl?raw'
import taaBlendSimpleFrag from '../shaders/taaBlendSimple.frag.glsl?raw'

export class TAABlendSimpleMaterial extends THREE.ShaderMaterial {
	public constructor(width: number, height: number) {
		// Simple TAA blending - just blend history and current frame
		super({
			uniforms: {
				tCurrent: { value: null },
				tHistory: { value: null },
				blendFactor: { value: 0.7 }, // 0.9 = mostly history, 0.1 = mostly current
			},
			vertexShader: taaBlendSimpleVert,
			fragmentShader: taaBlendSimpleFrag,
			transparent: true,
			depthWrite: false,
		})
	}
}

