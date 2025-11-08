import * as THREE from 'three'
import { Scene } from './Scene'
import { TAABlendSimpleMaterial } from './materials/TAABlendSimpleMaterial'
import { TAAVelocityMaterial } from './materials/TAAVelocityMaterial'
import { DepthPassMaterial } from './materials/DepthPassMaterial'
import { FogMaterial } from './materials/FogMaterial'
import { ComposeMaterial } from './materials/ComposeMaterial'

export class Pipeline {
	private renderer: THREE.WebGLRenderer
	private camera: THREE.PerspectiveCamera
	private sceneBuilder: Scene | null = null

	// TAA (Temporal Anti-Aliasing) properties
	private taaEnabled: boolean = true
	private taaCurrentTarget: THREE.WebGLRenderTarget | null = null
	private taaPreviousTarget: THREE.WebGLRenderTarget | null = null
	private taaAccumulatedTarget: THREE.WebGLRenderTarget | null = null
	private taaDepthTarget: THREE.WebGLRenderTarget | null = null
	private taaHistoryDepthTarget: THREE.WebGLRenderTarget | null = null
	private taaVelocityTarget: THREE.WebGLRenderTarget | null = null
	private taaBlendMaterial: TAABlendSimpleMaterial | null = null
	private taaBlendQuad: THREE.Mesh | null = null
	private taaScene: THREE.Scene | null = null
	private taaCamera: THREE.OrthographicCamera | null = null
	private taaVelocityMaterial: TAAVelocityMaterial | null = null
	private taaVelocityQuad: THREE.Mesh | null = null
	private taaVelocityScene: THREE.Scene | null = null
	private taaJitterIndex: number = 0
	private stochasticJitterIndex: number = 0
	private frameCounter: number = 0
	private taaJitterOffset: THREE.Vector2 = new THREE.Vector2()
	private taaPreviousJitterOffset: THREE.Vector2 = new THREE.Vector2()
	private originalProjectionMatrix: THREE.Matrix4 = new THREE.Matrix4()
	private previousViewMatrix: THREE.Matrix4 = new THREE.Matrix4()
	private previousProjectionMatrix: THREE.Matrix4 = new THREE.Matrix4()
	private taaFirstFrame: boolean = true
	private startTime: number = Date.now()

	// Depth pass properties
	private depthTarget: THREE.WebGLRenderTarget | null = null
	private depthPassMaterial: DepthPassMaterial | null = null
	private depthPassQuad: THREE.Mesh | null = null
	private depthPassScene: THREE.Scene | null = null
	private depthPassCamera: THREE.OrthographicCamera | null = null

	// Fog properties
	private fogTarget: THREE.WebGLRenderTarget | null = null
	private fogMaterial: FogMaterial | null = null
	private fogQuad: THREE.Mesh | null = null
	private fogScene: THREE.Scene | null = null
	private fogCamera: THREE.OrthographicCamera | null = null

	// Composition properties
	private composeMaterial: ComposeMaterial | null = null
	private composeQuad: THREE.Mesh | null = null
	private composeScene: THREE.Scene | null = null
	private composeCamera: THREE.OrthographicCamera | null = null

	constructor(renderer: THREE.WebGLRenderer, camera: THREE.PerspectiveCamera) {
		this.renderer = renderer
		this.camera = camera

		// Store original projection matrix for TAA jittering
		this.originalProjectionMatrix.copy(this.camera.projectionMatrix)

		// Initialize previous matrices
		this.previousViewMatrix.copy(this.camera.matrixWorldInverse)
		this.previousProjectionMatrix.copy(this.camera.projectionMatrix)

		// Initialize TAA
		this.initTAA()

		// Initialize depth pass (keep it available for future use)
		this.initDepthPass()

		// Initialize fog
		this.initFog()

		// Initialize composition
		this.initComposition()
	}

	public setScene(sceneBuilder: Scene): void {
		this.sceneBuilder = sceneBuilder
	}

	public render(): void {
		// Update stochastic transparency jitter for dither pattern
		this.updateStochasticTransparency()

		// TAA rendering
		if (this.taaEnabled && this.taaCurrentTarget && this.taaPreviousTarget && this.taaAccumulatedTarget &&
		    this.taaDepthTarget && this.taaHistoryDepthTarget && this.taaVelocityTarget) {
			this.renderTAA()
		} else {
			this.renderer.render(this.sceneBuilder!.scene, this.camera)
		}
	}

	private renderDepthPass(): void {
		// Render scene to depth target (with depth texture)
		this.renderer.setRenderTarget(this.depthTarget!)
		this.renderer.render(this.sceneBuilder!.scene, this.camera)

		// Update depth pass material with depth texture
		if (this.depthPassMaterial && this.depthTarget!.depthTexture) {
			this.depthPassMaterial.uniforms['tDepth'].value = this.depthTarget!.depthTexture
		}

		// Render depth pass to screen
		this.renderer.setRenderTarget(null)
		this.renderer.render(this.depthPassScene!, this.depthPassCamera!)
	}

	private renderTAA(): void {
		// Update stochastic transparency material with current jitter index
		this.updateStochasticTransparency()

		// Store previous jitter before applying new one
		this.taaPreviousJitterOffset.copy(this.taaJitterOffset)

		// Apply camera jitter for TAA (increments taaJitterIndex)
		this.applyCameraJitter()

		// Render scene to current target (color + depth)
		// Three.js automatically writes depth when rendering
		this.renderer.setRenderTarget(this.taaCurrentTarget!)
		this.renderer.render(this.sceneBuilder!.scene, this.camera)

		// Copy depth to separate target for history comparison
		// We'll use the depth texture from current target
		this.renderer.setRenderTarget(this.taaDepthTarget!)
		this.renderer.render(this.sceneBuilder!.scene, this.camera)

		// Generate velocity buffer accounting for camera movement
		if (this.taaVelocityMaterial) {
			// Store current matrices before jitter is applied
			const currentViewMatrix = this.camera.matrixWorldInverse.clone()
			const currentProjectionMatrix = this.camera.projectionMatrix.clone()

			// Update velocity material uniforms
			this.taaVelocityMaterial.uniforms['currentViewMatrix'].value.copy(currentViewMatrix)
			this.taaVelocityMaterial.uniforms['currentProjectionMatrix'].value.copy(currentProjectionMatrix)
			this.taaVelocityMaterial.uniforms['previousViewMatrix'].value.copy(this.previousViewMatrix)
			this.taaVelocityMaterial.uniforms['previousProjectionMatrix'].value.copy(this.previousProjectionMatrix)
			this.taaVelocityMaterial.uniforms['currentJitter'].value.copy(this.taaJitterOffset)
			this.taaVelocityMaterial.uniforms['previousJitter'].value.copy(this.taaPreviousJitterOffset)
			this.taaVelocityMaterial.updateResolution(window.innerWidth, window.innerHeight)
			this.taaVelocityMaterial.uniforms['tDepth'].value = this.taaDepthTarget!.depthTexture || this.taaDepthTarget!.texture

			// Render velocity buffer
			this.renderer.setRenderTarget(this.taaVelocityTarget!)
			this.renderer.render(this.taaVelocityScene!, this.taaCamera!)

			// Store current matrices as previous for next frame
			this.previousViewMatrix.copy(currentViewMatrix)
			this.previousProjectionMatrix.copy(currentProjectionMatrix)
		}

		// On first frame, copy current to accumulated and depth to history depth
		if (this.taaFirstFrame) {
			this.renderer.setRenderTarget(this.taaAccumulatedTarget!)
			this.renderer.render(this.sceneBuilder!.scene, this.camera)

			// Copy depth
			this.renderer.setRenderTarget(this.taaHistoryDepthTarget!)
			this.renderer.render(this.sceneBuilder!.scene, this.camera)

			this.taaFirstFrame = false
		}

		// Update blend material uniforms
		// Blend accumulated (previous) with current frame, write to previous target (ping-pong)
		if (this.taaBlendMaterial) {
			// Simple TAA blending - only need current and history
			this.taaBlendMaterial.uniforms['tCurrent'].value = this.taaCurrentTarget!.texture
			this.taaBlendMaterial.uniforms['tHistory'].value = this.taaAccumulatedTarget!.texture

			// Original complex implementation (commented out)
			// this.taaBlendMaterial.uniforms['tVelocity'].value = this.taaVelocityTarget!.texture
			// this.taaBlendMaterial.uniforms['tDepth'].value = this.taaDepthTarget!.depthTexture || this.taaDepthTarget!.texture
			// this.taaBlendMaterial.uniforms['tHistoryDepth'].value = this.taaHistoryDepthTarget!.depthTexture || this.taaHistoryDepthTarget!.texture
			// this.taaBlendMaterial.uniforms['texelSize'].value.set(
			// 	1.0 / window.innerWidth,
			// 	1.0 / window.innerHeight
			// )
		}

		// Blend accumulated and current frames, store result in previous target (ping-pong buffer)
		// This avoids feedback loop: we read from accumulated, write to previous
		this.renderer.setRenderTarget(this.taaPreviousTarget!)
		this.renderer.render(this.taaScene!, this.taaCamera!)

		// Update uniforms to display the newly accumulated result
		if (this.taaBlendMaterial) {
			// Simple TAA blending - only need current and history
			this.taaBlendMaterial.uniforms['tCurrent'].value = this.taaPreviousTarget!.texture
			this.taaBlendMaterial.uniforms['tHistory'].value = this.taaPreviousTarget!.texture

			// Original complex implementation (commented out)
			// // Set velocity to zero for display (no motion)
			// this.taaBlendMaterial.uniforms['tVelocity'].value = this.taaVelocityTarget!.texture
			// this.taaBlendMaterial.uniforms['tDepth'].value = this.taaDepthTarget!.depthTexture || this.taaDepthTarget!.texture
			// this.taaBlendMaterial.uniforms['tHistoryDepth'].value = this.taaDepthTarget!.depthTexture || this.taaDepthTarget!.texture
		}

		// Render fog using depth texture
		if (this.fogMaterial && this.taaDepthTarget && this.sceneBuilder) {
			// Update depth texture
			this.fogMaterial.uniforms['tDepth'].value = this.taaDepthTarget.depthTexture || this.taaDepthTarget.texture

			// Update camera (includes all camera-related uniforms)
			this.fogMaterial.updateCamera(this.camera)

			// Update time
			const currentTime = (Date.now() - this.startTime) / 1000.0
			this.fogMaterial.updateTime(currentTime)

			// Update light data if directional light exists
			if (this.sceneBuilder.directionalLight) {
				this.fogMaterial.updateLight(this.sceneBuilder.directionalLight)
			}

			// Clear fog target with transparent black (alpha = 0) before rendering
			this.renderer.setRenderTarget(this.fogTarget!)
			this.renderer.setClearColor(0x000000, 0.0) // Clear with alpha = 0
			this.renderer.clear()
			this.renderer.render(this.fogScene!, this.fogCamera!)
		}

		// Compose fog over TAA result
		if (this.composeMaterial) {
			this.composeMaterial.uniforms['tColor'].value = this.taaPreviousTarget!.texture
			this.composeMaterial.uniforms['tFog'].value = this.fogTarget!.texture
			this.renderer.setRenderTarget(null)
			this.renderer.render(this.composeScene!, this.composeCamera!)
		} else {
			// Fallback: render accumulated result to screen
			this.renderer.setRenderTarget(null)
			this.renderer.render(this.taaScene!, this.taaCamera!)
		}

		// Swap accumulated and previous targets for next frame (ping-pong)
		const temp = this.taaAccumulatedTarget
		this.taaAccumulatedTarget = this.taaPreviousTarget
		this.taaPreviousTarget = temp

		// Swap depth targets
		const tempDepth = this.taaHistoryDepthTarget
		this.taaHistoryDepthTarget = this.taaDepthTarget
		this.taaDepthTarget = tempDepth

		// Restore original projection matrix
		this.camera.projectionMatrix.copy(this.originalProjectionMatrix)
		this.camera.projectionMatrixInverse.copy(this.originalProjectionMatrix).invert()
	}

	public updateTargets(): void {
		// Update depth pass target (keep it available)
		if (this.depthTarget) {
			this.depthTarget.setSize(window.innerWidth, window.innerHeight)
		}

		// TAA target updates
		if (!this.taaCurrentTarget || !this.taaPreviousTarget || !this.taaAccumulatedTarget) return

		this.taaCurrentTarget.setSize(window.innerWidth, window.innerHeight)
		this.taaPreviousTarget.setSize(window.innerWidth, window.innerHeight)
		this.taaAccumulatedTarget.setSize(window.innerWidth, window.innerHeight)

		if (this.taaDepthTarget) {
			this.taaDepthTarget.setSize(window.innerWidth, window.innerHeight)
		}
		if (this.taaHistoryDepthTarget) {
			this.taaHistoryDepthTarget.setSize(window.innerWidth, window.innerHeight)
		}
		if (this.taaVelocityTarget) {
			this.taaVelocityTarget.setSize(window.innerWidth, window.innerHeight)
		}

		// Update fog target
		if (this.fogTarget) {
			this.fogTarget.setSize(window.innerWidth, window.innerHeight)
		}
		if (this.fogMaterial) {
			this.fogMaterial.updateResolution(window.innerWidth, window.innerHeight)
		}

		// Simple material doesn't need texelSize update
		// if (this.taaBlendMaterial) {
		// 	this.taaBlendMaterial.updateTexelSize(window.innerWidth, window.innerHeight)
		// }

		// Reset jitter index and first frame flag on resize
		this.taaJitterIndex = 0
		this.stochasticJitterIndex = 0
		this.taaJitterOffset.set(0, 0)
		this.taaPreviousJitterOffset.set(0, 0)
		this.previousViewMatrix.copy(this.camera.matrixWorldInverse)
		this.previousProjectionMatrix.copy(this.camera.projectionMatrix)
		this.taaFirstFrame = true
	}

	public updateProjectionMatrix(): void {
		this.originalProjectionMatrix.copy(this.camera.projectionMatrix)
	}

	public getFogMaterial(): FogMaterial | null {
		return this.fogMaterial
	}

	public getTAABlendFactor(): number {
		return this.taaBlendMaterial?.uniforms['blendFactor']?.value ?? 0.7
	}

	public setTAABlendFactor(value: number): void {
		if (this.taaBlendMaterial?.uniforms['blendFactor']) {
			this.taaBlendMaterial.uniforms['blendFactor'].value = value
		}
	}

	private initDepthPass(): void {
		// Create depth render target with depth texture enabled
		this.depthTarget = new THREE.WebGLRenderTarget(
			window.innerWidth,
			window.innerHeight,
			{
				minFilter: THREE.NearestFilter,
				magFilter: THREE.NearestFilter,
				format: THREE.RGBAFormat,
				type: THREE.UnsignedByteType,
				depthTexture: new THREE.DepthTexture(window.innerWidth, window.innerHeight),
			}
		)

		// Create fullscreen quad for depth visualization
		const geometry = new THREE.PlaneGeometry(2, 2)
		this.depthPassMaterial = new DepthPassMaterial(window.innerWidth, window.innerHeight)

		this.depthPassQuad = new THREE.Mesh(geometry, this.depthPassMaterial)

		// Create scene and camera for fullscreen quad
		this.depthPassScene = new THREE.Scene()
		this.depthPassScene.add(this.depthPassQuad)

		this.depthPassCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
	}

	private initFog(): void {
		// Create fog render target with alpha support
		this.fogTarget = new THREE.WebGLRenderTarget(
			window.innerWidth,
			window.innerHeight,
			{
				minFilter: THREE.LinearFilter,
				magFilter: THREE.LinearFilter,
				format: THREE.RGBAFormat,
				type: THREE.UnsignedByteType,
			}
		)

		// Create fullscreen quad for fog
		const geometry = new THREE.PlaneGeometry(2, 2)
		this.fogMaterial = new FogMaterial(window.innerWidth, window.innerHeight, this.camera)

		this.fogQuad = new THREE.Mesh(geometry, this.fogMaterial)

		// Create scene and camera for fullscreen quad
		this.fogScene = new THREE.Scene()
		this.fogScene.add(this.fogQuad)

		this.fogCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
	}

	private initComposition(): void {
		// Create fullscreen quad for composition
		const geometry = new THREE.PlaneGeometry(2, 2)
		this.composeMaterial = new ComposeMaterial()

		this.composeQuad = new THREE.Mesh(geometry, this.composeMaterial)

		// Create scene and camera for fullscreen quad
		this.composeScene = new THREE.Scene()
		this.composeScene.add(this.composeQuad)

		this.composeCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
	}

	private initTAA(): void {
		// Create render targets for current and previous frames
		this.taaCurrentTarget = new THREE.WebGLRenderTarget(
			window.innerWidth,
			window.innerHeight,
			{
				minFilter: THREE.LinearFilter,
				magFilter: THREE.LinearFilter,
				format: THREE.RGBAFormat,
			}
		)

		this.taaPreviousTarget = new THREE.WebGLRenderTarget(
			window.innerWidth,
			window.innerHeight,
			{
				minFilter: THREE.LinearFilter,
				magFilter: THREE.LinearFilter,
				format: THREE.RGBAFormat,
			}
		)

		// Create accumulated target to store blended result over time
		this.taaAccumulatedTarget = new THREE.WebGLRenderTarget(
			window.innerWidth,
			window.innerHeight,
			{
				minFilter: THREE.LinearFilter,
				magFilter: THREE.LinearFilter,
				format: THREE.RGBAFormat,
			}
		)

		// Create depth render targets with depth texture enabled
		this.taaDepthTarget = new THREE.WebGLRenderTarget(
			window.innerWidth,
			window.innerHeight,
			{
				minFilter: THREE.NearestFilter,
				magFilter: THREE.NearestFilter,
				format: THREE.RGBAFormat,
				type: THREE.UnsignedByteType,
				depthTexture: new THREE.DepthTexture(window.innerWidth, window.innerHeight),
			}
		)

		this.taaHistoryDepthTarget = new THREE.WebGLRenderTarget(
			window.innerWidth,
			window.innerHeight,
			{
				minFilter: THREE.NearestFilter,
				magFilter: THREE.NearestFilter,
				format: THREE.RGBAFormat,
				type: THREE.UnsignedByteType,
				depthTexture: new THREE.DepthTexture(window.innerWidth, window.innerHeight),
			}
		)

		// Create velocity render target (RG format for 2D motion vectors)
		this.taaVelocityTarget = new THREE.WebGLRenderTarget(
			window.innerWidth,
			window.innerHeight,
			{
				minFilter: THREE.LinearFilter,
				magFilter: THREE.LinearFilter,
				format: THREE.RGFormat,
			}
		)

		// Create fullscreen quad for blending
		const geometry = new THREE.PlaneGeometry(2, 2)
		this.taaBlendMaterial = new TAABlendSimpleMaterial(window.innerWidth, window.innerHeight)

		this.taaBlendQuad = new THREE.Mesh(geometry, this.taaBlendMaterial)

		// Create scene and camera for fullscreen quad
		this.taaScene = new THREE.Scene()
		this.taaScene.add(this.taaBlendQuad)

		this.taaCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)

		// Create velocity buffer generation material
		const velocityGeometry = new THREE.PlaneGeometry(2, 2)
		this.taaVelocityMaterial = new TAAVelocityMaterial(window.innerWidth, window.innerHeight)

		this.taaVelocityQuad = new THREE.Mesh(velocityGeometry, this.taaVelocityMaterial)
		this.taaVelocityScene = new THREE.Scene()
		this.taaVelocityScene.add(this.taaVelocityQuad)
	}

	private applyCameraJitter(): void {
		// Halton sequence for jittering (2,3)
		const haltonX = this.halton(this.taaJitterIndex, 2)
		const haltonY = this.halton(this.taaJitterIndex, 3)

		// Calculate jitter offset in pixel space
		const jitterScale = 0.5
		this.taaJitterOffset.set(
			((haltonX - 0.5) * 2.0 * jitterScale) / window.innerWidth,
			((haltonY - 0.5) * 2.0 * jitterScale) / window.innerHeight
		)

		// Apply jitter to projection matrix
		this.camera.projectionMatrix.copy(this.originalProjectionMatrix)
		this.camera.projectionMatrix.elements[8] += this.taaJitterOffset.x
		this.camera.projectionMatrix.elements[9] += this.taaJitterOffset.y
		this.camera.projectionMatrixInverse.copy(this.camera.projectionMatrix).invert()

		// Increment jitter index (cycle through pattern)
		this.taaJitterIndex = (this.taaJitterIndex + 1) % 8
	}

	private halton(index: number, base: number): number {
		let result = 0.0
		let f = 1.0 / base
		let i = index
		while (i > 0) {
			result += f * (i % base)
			i = Math.floor(i / base)
			f /= base
		}
		return result
	}

	private updateStochasticTransparency(): void {
		if (!this.sceneBuilder?.cube) return

		const material = this.sceneBuilder.cube.material
		if (material instanceof THREE.ShaderMaterial) {
			// Update jitter index for stochastic transparency dithering (cycles 0-16)
			if ('updateJitterIndex' in material && typeof material.updateJitterIndex === 'function') {
				material.updateJitterIndex(this.stochasticJitterIndex)
			} else if (material.uniforms && material.uniforms['jitterIndex']) {
				material.uniforms['jitterIndex'].value = this.stochasticJitterIndex
			}

			// Update resolution in case of resize (4x smaller than screen)
			if ('updateResolution' in material && typeof material.updateResolution === 'function') {
				material.updateResolution(window.innerWidth / 4, window.innerHeight / 4)
			} else if (material.uniforms && material.uniforms['resolution']) {
				material.uniforms['resolution'].value.set(window.innerWidth / 4, window.innerHeight / 4)
			}

			// Increment and cycle stochastic jitter index each frame (0-15)
			this.stochasticJitterIndex = (this.stochasticJitterIndex + 1) % 16
		}
	}

	public dispose(): void {
		// Clean up depth pass (keep it available)
		this.depthTarget?.dispose()
		this.depthPassMaterial?.dispose()
		if (this.depthPassQuad) {
			this.depthPassQuad.geometry.dispose()
		}

		// Clean up fog
		this.fogTarget?.dispose()
		this.fogMaterial?.dispose()
		if (this.fogQuad) {
			this.fogQuad.geometry.dispose()
		}

		// Clean up composition
		this.composeMaterial?.dispose()
		if (this.composeQuad) {
			this.composeQuad.geometry.dispose()
		}

		// Clean up TAA
		this.taaCurrentTarget?.dispose()
		this.taaPreviousTarget?.dispose()
		this.taaAccumulatedTarget?.dispose()
		this.taaDepthTarget?.dispose()
		this.taaHistoryDepthTarget?.dispose()
		this.taaVelocityTarget?.dispose()
		this.taaBlendMaterial?.dispose()
		this.taaVelocityMaterial?.dispose()
		if (this.taaBlendQuad) {
			this.taaBlendQuad.geometry.dispose()
		}
		if (this.taaVelocityQuad) {
			this.taaVelocityQuad.geometry.dispose()
		}
	}
}

