import * as THREE from 'three'
import composeVert from '../shaders/compose.vert.glsl?raw'
import composeFrag from '../shaders/compose.frag.glsl?raw'

export class ComposeMaterial extends THREE.ShaderMaterial {
	public constructor() {
		super({
			uniforms: {
				tColor: { value: null },
				tFog: { value: null },
				backgroundColor: { value: new THREE.Vector3(0.1, 0.1, 0.15) }, // Dark blue-gray background
			},
			vertexShader: composeVert,
			fragmentShader: composeFrag,
			transparent: true,
			depthWrite: false,
		})
	}
}

