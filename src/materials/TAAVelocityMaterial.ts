import * as THREE from 'three'
import taaVelocityVert from '../shaders/taaVelocity.vert.glsl?raw'
import taaVelocityFrag from '../shaders/taaVelocity.frag.glsl?raw'

export class TAAVelocityMaterial extends THREE.ShaderMaterial {
	public constructor(width: number, height: number) {
		super({
			uniforms: {
				currentViewMatrix: { value: new THREE.Matrix4() },
				currentProjectionMatrix: { value: new THREE.Matrix4() },
				previousViewMatrix: { value: new THREE.Matrix4() },
				previousProjectionMatrix: { value: new THREE.Matrix4() },
				currentJitter: { value: new THREE.Vector2(0, 0) },
				previousJitter: { value: new THREE.Vector2(0, 0) },
				resolution: { value: new THREE.Vector2(width, height) },
				tDepth: { value: null },
			},
			vertexShader: taaVelocityVert,
			fragmentShader: taaVelocityFrag,
		})
	}

	public updateResolution(width: number, height: number): void {
		if (this.uniforms.resolution) {
			this.uniforms.resolution.value.set(width, height)
		}
	}
}

