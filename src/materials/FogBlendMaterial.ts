import * as THREE from 'three'
import taaBlendSimpleVert from '../shaders/taaBlendSimple.vert.glsl?raw'
import taaBlendSimpleFrag from '../shaders/taaBlendSimple.frag.glsl?raw'

export class FogBlendMaterial extends THREE.ShaderMaterial {
	public constructor() {
		// Simple fog blending - blend history and current frame
		super({
			uniforms: {
				tCurrent: { value: null },
				tHistory: { value: null },
				blendFactor: { value: 0.9 }, // 0.7 = mostly history, 0.3 = mostly current
			},
			vertexShader: taaBlendSimpleVert,
			fragmentShader: taaBlendSimpleFrag,
			transparent: true,
			depthWrite: false,
		})
	}
}

