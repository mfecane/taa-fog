import * as THREE from 'three'
import fogVert from '../shaders/fog.vert.glsl?raw'
import fogFrag from '../shaders/fog.frag.glsl?raw'

export class FogMaterial extends THREE.ShaderMaterial {
	public constructor(width: number, height: number, camera: THREE.PerspectiveCamera) {
		super({
			defines: {
				DEPTH_PACKING: 1,
				PERSPECTIVE_CAMERA: 1,
				USE_SHADOWMAP: 1,
			},
			uniforms: {
				tDepth: { value: null },
				tColor: { value: null },
				tShadow: { value: null },
				directionalShadowMatrix: { value: new THREE.Matrix4() },
				cameraProjectionMatrixInverse: { value: camera.projectionMatrixInverse.clone() },
				viewMatrixInverse: { value: camera.matrixWorld.clone() }, // view to world (camera.matrixWorld)
				cameraWorldMatrix: { value: camera.matrixWorld.clone() }, // same as viewMatrixInverse
				cameraNearFar: { value: new THREE.Vector2(camera.near, camera.far) },
				cameraNear: { value: camera.near },
				cameraFar: { value: camera.far },
				cameraPosition: { value: camera.position.clone() },
				resolution: { value: new THREE.Vector2(width, height) },
				fogColor: { value: new THREE.Vector3(0.8, 0.8, 0.9) },
				fogDensity: { value: 0.5 },
				maxFogDistance: { value: 9.0 },
				fogSphereCenter: { value: new THREE.Vector3(0, 1, 0) }, // Sphere center
				fogSphereRadius: { value: 3.5 }, // Sphere radius
				time: { value: 0.0 },
				animSpeed: { value: 0.4 }, // Animation speed (warp speed)
				lightDirection: { value: new THREE.Vector3(0, -1, 0) }, // normalized direction FROM light TO scene
				lightColor: { value: new THREE.Vector3(1, 1, 1) },
				lightIntensity: { value: 3.0 }, // Increased default intensity for more visible fog
				lightMultiplier: { value: 0.9 }, // Additional multiplier for fine-tuning
				// Three.js shadow mapping uniforms (from shadowmap_pars_fragment)
				shadowMap: { value: null },
				shadowMapSize: { value: new THREE.Vector2(2048, 2048) },
				shadowIntensity: { value: 1.0 },
				shadowBias: { value: 0.0 },
				shadowRadius: { value: 1.0 },
				fogSteps: { value: 55.0 },
				rayNoiseScale: { value: 0.012 },
			},
			vertexShader: fogVert,
			fragmentShader: fogFrag,
			transparent: true,
			depthWrite: false,
		})
	}

	public updateResolution(width: number, height: number): void {
		if (this.uniforms.resolution) {
			this.uniforms.resolution.value.set(width, height)
		}
	}

	public updateCamera(camera: THREE.PerspectiveCamera): void {
		if (this.uniforms.cameraProjectionMatrixInverse) {
			this.uniforms.cameraProjectionMatrixInverse.value.copy(camera.projectionMatrixInverse)
		}
		if (this.uniforms.viewMatrixInverse) {
			this.uniforms.viewMatrixInverse.value.copy(camera.matrixWorld)
		}
		if (this.uniforms.cameraWorldMatrix) {
			this.uniforms.cameraWorldMatrix.value.copy(camera.matrixWorld)
		}
		if (this.uniforms.cameraNearFar) {
			this.uniforms.cameraNearFar.value.set(camera.near, camera.far)
		}
		if (this.uniforms.cameraNear) {
			this.uniforms.cameraNear.value = camera.near
		}
		if (this.uniforms.cameraFar) {
			this.uniforms.cameraFar.value = camera.far
		}
		if (this.uniforms.cameraPosition) {
			this.uniforms.cameraPosition.value.copy(camera.position)
		}
	}

	public updateLight(light: THREE.DirectionalLight): void {
		// Extract light direction from the directional light
		// For volumetric scattering, we need the direction FROM light TO scene
		// Ensure light's world matrices are updated
		light.updateMatrixWorld()

		if (this.uniforms.lightDirection) {
			const direction = new THREE.Vector3()
			// getWorldDirection() returns normalized direction FROM light position TO light target
			// This is the direction the light rays travel (from light toward scene)
			light.getWorldDirection(direction)
			// Ensure it's normalized (should already be, but be safe)
			this.uniforms.lightDirection.value.copy(direction)
		}
		if (this.uniforms.lightColor) {
			this.uniforms.lightColor.value.set(light.color.r, light.color.g, light.color.b)
		}
		if (this.uniforms.lightIntensity) {
			// Boost light intensity for better fog visibility
			this.uniforms.lightIntensity.value = light.intensity * 3.0
		}

		// Update shadow map and related uniforms
		if (light.shadow.map) {
			const shadowMap = light.shadow.map
			// DirectionalLight uses 2D shadow maps (not cube maps)
			if (this.uniforms.shadowMap) {
				this.uniforms.shadowMap.value = shadowMap.texture || shadowMap
			}
			// Also update tShadow for backward compatibility
			if (this.uniforms.tShadow) {
				this.uniforms.tShadow.value = shadowMap.texture || shadowMap
			}

			// Update shadow map size
			if (this.uniforms.shadowMapSize) {
				this.uniforms.shadowMapSize.value.set(light.shadow.mapSize.width, light.shadow.mapSize.height)
			}
		}

		// Update shadow parameters
		if (this.uniforms.shadowIntensity !== undefined) {
			this.uniforms.shadowIntensity.value = light.shadow.intensity
		}
		if (this.uniforms.shadowBias !== undefined) {
			this.uniforms.shadowBias.value = light.shadow.bias
		}
		if (this.uniforms.shadowRadius !== undefined) {
			this.uniforms.shadowRadius.value = light.shadow.radius
		}

		// Update light matrix using Three.js shadow matrix
		if (this.uniforms.directionalShadowMatrix && light.shadow.camera) {
			// Update shadow camera matrices to ensure shadow.matrix is current
			light.shadow.camera.updateMatrixWorld()
			light.shadow.camera.updateProjectionMatrix()

			// Use Three.js directionalShadowMatrix (light.shadow.matrix)
			this.uniforms.directionalShadowMatrix.value.copy(light.shadow.matrix)
		}
	}

	public updateTime(time: number): void {
		if (this.uniforms.time) {
			this.uniforms.time.value = time
		}
	}
}
