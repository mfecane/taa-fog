import * as THREE from 'three'
import { Scene } from './Scene'
import { FogMaterial } from './materials/FogMaterial'
import { ComposeMaterial } from './materials/ComposeMaterial'
import { StochasticDepthMaterial } from './materials/StochasticDepthMaterial'
import { FogBlendMaterial } from './materials/FogBlendMaterial'
import { DepthPassMaterial } from './materials/DepthPassMaterial'

export class Pipeline {
	private renderer: THREE.WebGLRenderer
	private camera: THREE.PerspectiveCamera
	private sceneBuilder: Scene | null = null

	// Color buffer (full resolution)
	private colorTarget: THREE.WebGLRenderTarget | null = null

	// Depth buffer (downsampled) with stochastic depth for transparent objects
	private depthTarget: THREE.WebGLRenderTarget | null = null
	private stochasticDepthMaterial: StochasticDepthMaterial | null = null
	private stochasticJitterIndex: number = 0
	private transparentMeshes: THREE.Mesh[] = []

	// Fog buffers (downsampled)
	private fogCurrentTarget: THREE.WebGLRenderTarget | null = null
	private fogHistoryTarget: THREE.WebGLRenderTarget | null = null
	private fogBlendedTarget: THREE.WebGLRenderTarget | null = null
	private fogMaterial: FogMaterial | null = null
	private fogBlendMaterial: FogBlendMaterial | null = null
	private fogQuad: THREE.Mesh | null = null
	private fogCamera: THREE.OrthographicCamera | null = null
	private fogBlendQuad: THREE.Mesh | null = null
	private fogBlendCamera: THREE.OrthographicCamera | null = null
	private fogFirstFrame: boolean = true

	// Composition (full resolution)
	private composeMaterial: ComposeMaterial | null = null
	private composeQuad: THREE.Mesh | null = null
	private composeCamera: THREE.OrthographicCamera | null = null

	// Debug depth display
	private depthPassMaterial: DepthPassMaterial | null = null
	// @ts-ignore - Reserved for future debug depth rendering
	private _depthPassQuad: THREE.Mesh | null = null

	// Shared fullscreen triangle geometry
	private fullscreenTriangle: THREE.BufferGeometry

	private startTime: number = Date.now()

	constructor(renderer: THREE.WebGLRenderer, camera: THREE.PerspectiveCamera, private downsamplingFactor: number = 2) {
		this.renderer = renderer
		this.camera = camera

		// Create shared fullscreen triangle geometry
		// Triangle vertices extend beyond [-1, 1] to cover entire screen
		const positions = new Float32Array([
			-1, -1, 0,  // bottom-left
			3, -1, 0,   // extends far right
			-1, 3, 0    // extends far up
		])
		const uvs = new Float32Array([
			0, 0,  // bottom-left
			2, 0,  // right
			0, 2   // top
		])
		this.fullscreenTriangle = new THREE.BufferGeometry()
		this.fullscreenTriangle.setAttribute('position', new THREE.BufferAttribute(positions, 3))
		this.fullscreenTriangle.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))

		// Initialize buffers
		this.initColorBuffer()
		this.initDepthBuffer()
		this.initFog()
		this.initComposition()
		this.initDebugDepth()
	}

	public setScene(sceneBuilder: Scene): void {
		this.sceneBuilder = sceneBuilder
		this.updateTransparentMeshesCache()
	}

	public render(): void {
		if (!this.sceneBuilder) return

		// 1. Render color buffer (full resolution) with default materials
		this.renderColorBuffer()

		// 2. Render depth buffer (downsampled) with stochastic depth for transparent objects
		this.renderDepthBuffer()

		// 3. Render fog (downsampled) using depth buffer
		this.renderFog()

		// 4. Blend fog buffer with history
		this.blendFog()

		// 5. Compose color buffer with upsampled fog buffer (full resolution)
		this.compose()
	}

	private renderColorBuffer(): void {
		// Render scene to color buffer (full resolution)
		this.renderer.setRenderTarget(this.colorTarget!)
		this.renderer.render(this.sceneBuilder!.scene, this.camera)
	}

	private renderDepthBuffer(): void {
		const downsampledWidth = Math.floor(window.innerWidth / this.downsamplingFactor)
		const downsampledHeight = Math.floor(window.innerHeight / this.downsamplingFactor)

		// Initialize stochastic depth material if needed
		if (!this.stochasticDepthMaterial) {
			this.stochasticDepthMaterial = new StochasticDepthMaterial(downsampledWidth, downsampledHeight)
		}

		// Update stochastic depth material jitter
		this.updateStochasticDepth()

		// Store original materials and replace transparent materials with stochastic depth
		const originalMaterials = new Map<THREE.Mesh, THREE.Material>()
		const clonedMaterials: THREE.ShaderMaterial[] = []

		// Use cached transparent meshes instead of traversing the scene
		for (const mesh of this.transparentMeshes) {
			const material = mesh.material
			if (material instanceof THREE.MeshPhysicalMaterial && material.transparent) {
				// Store original material
				originalMaterials.set(mesh, material)

				// Create a new stochastic depth material instance for each object with its own opacity map
				const objectStochasticMaterial = this.stochasticDepthMaterial!.clone()
				objectStochasticMaterial.updateOpacity(material.opacity)
				objectStochasticMaterial.updateOpacityMap(material.map || null)
				objectStochasticMaterial.updateJitterIndex(this.stochasticJitterIndex)
				clonedMaterials.push(objectStochasticMaterial)

				// Replace with stochastic depth material
				mesh.material = objectStochasticMaterial
			}
		}

		// Render to downsampled depth buffer
		this.renderer.setRenderTarget(this.depthTarget!)
		this.renderer.render(this.sceneBuilder!.scene, this.camera)

		// Restore original materials and dispose cloned materials
		originalMaterials.forEach((material, mesh) => {
			mesh.material = material
		})
		clonedMaterials.forEach((material) => {
			material.dispose()
		})
	}

	private renderFog(): void {
		if (!this.fogMaterial || !this.depthTarget || !this.sceneBuilder) return

		// Update fog material with depth texture
		this.fogMaterial.uniforms['tDepth'].value = this.depthTarget.depthTexture || this.depthTarget.texture

		// Update camera
		this.fogMaterial.updateCamera(this.camera)

		// Update time
		const currentTime = (Date.now() - this.startTime) / 1000.0
		this.fogMaterial.updateTime(currentTime)

		// Update light data if directional light exists
		if (this.sceneBuilder.directionalLight) {
			this.fogMaterial.updateLight(this.sceneBuilder.directionalLight)
		}

		// Clear fog target with transparent black (alpha = 0) before rendering
		this.renderer.setRenderTarget(this.fogCurrentTarget!)
		this.renderer.setClearColor(0x000000, 0.0)
		this.renderer.clear()
		this.renderer.render(this.fogQuad!, this.fogCamera!)
	}

	private blendFog(): void {
		if (!this.fogBlendMaterial) return

		// On first frame, use current as history (no blending needed)
		if (this.fogFirstFrame) {
			this.fogFirstFrame = false
			// Swap current and history so history has the current fog
			const temp = this.fogHistoryTarget
			this.fogHistoryTarget = this.fogCurrentTarget
			this.fogCurrentTarget = temp
			return
		}

		// Update blend material uniforms
		this.fogBlendMaterial.uniforms['tCurrent'].value = this.fogCurrentTarget!.texture
		this.fogBlendMaterial.uniforms['tHistory'].value = this.fogHistoryTarget!.texture

		// Blend current and history, write to blended target
		this.renderer.setRenderTarget(this.fogBlendedTarget!)
		this.renderer.render(this.fogBlendQuad!, this.fogBlendCamera!)

		// Swap history and blended for next frame (ping-pong)
		const temp = this.fogHistoryTarget
		this.fogHistoryTarget = this.fogBlendedTarget
		this.fogBlendedTarget = temp
	}

	private compose(): void {
		if (!this.composeMaterial) return

		// Update compose material uniforms
		this.composeMaterial.uniforms['tColor'].value = this.colorTarget!.texture
		this.composeMaterial.uniforms['tFog'].value = this.fogHistoryTarget!.texture // Use history (which is now the blended result)

		// Render to screen (full resolution)
		this.renderer.setRenderTarget(null)
		this.renderer.render(this.composeQuad!, this.composeCamera!)
	}

	private updateStochasticDepth(): void {
		if (!this.stochasticDepthMaterial) return

		// Update jitter index for stochastic depth dithering (cycles 0-16)
		this.stochasticDepthMaterial.updateJitterIndex(this.stochasticJitterIndex)

		// Increment and cycle stochastic jitter index each frame (0-15)
		this.stochasticJitterIndex = (this.stochasticJitterIndex + 1) % 16
	}

	private updateTransparentMeshesCache(): void {
		if (!this.sceneBuilder) {
			this.transparentMeshes = []
			return
		}

		// Clear existing cache
		this.transparentMeshes = []

		// Traverse scene once to find all transparent meshes
		this.sceneBuilder.scene.traverse((object) => {
			if (object instanceof THREE.Mesh) {
				const material = object.material
				if (material instanceof THREE.MeshPhysicalMaterial && material.transparent) {
					this.transparentMeshes.push(object)
				}
			}
		})
	}

	public updateTargets(): void {
		const downsampledWidth = Math.floor(window.innerWidth / this.downsamplingFactor)
		const downsampledHeight = Math.floor(window.innerHeight / this.downsamplingFactor)

		// Update color buffer (full resolution)
		if (this.colorTarget) {
			this.colorTarget.setSize(window.innerWidth, window.innerHeight)
		}

		// Update depth buffer (downsampled)
		if (this.depthTarget) {
			this.depthTarget.setSize(downsampledWidth, downsampledHeight)
		}
		if (this.stochasticDepthMaterial) {
			this.stochasticDepthMaterial.updateResolution(downsampledWidth, downsampledHeight)
		}

		// Update fog buffers (downsampled)
		if (this.fogCurrentTarget) {
			this.fogCurrentTarget.setSize(downsampledWidth, downsampledHeight)
		}
		if (this.fogHistoryTarget) {
			this.fogHistoryTarget.setSize(downsampledWidth, downsampledHeight)
		}
		if (this.fogBlendedTarget) {
			this.fogBlendedTarget.setSize(downsampledWidth, downsampledHeight)
		}
		if (this.fogMaterial) {
			this.fogMaterial.updateResolution(downsampledWidth, downsampledHeight)
		}

		// Update composition resolution
		if (this.composeMaterial) {
			this.composeMaterial.updateResolution(window.innerWidth, window.innerHeight)
		}

		// Update debug depth resolution
		if (this.depthPassMaterial) {
			this.depthPassMaterial.updateResolution(downsampledWidth, downsampledHeight)
		}

		// Reset fog first frame flag on resize
		this.fogFirstFrame = true
		this.stochasticJitterIndex = 0
	}

	public updateProjectionMatrix(): void {
		// No-op for now, kept for compatibility
	}

	public getFogMaterial(): FogMaterial | null {
		return this.fogMaterial
	}

	public getFogBlendMaterial(): FogBlendMaterial | null {
		return this.fogBlendMaterial
	}

	public getFogBlendFactor(): number {
		return this.fogBlendMaterial?.uniforms['blendFactor']?.value ?? 0.7
	}

	public setFogBlendFactor(value: number): void {
		if (this.fogBlendMaterial?.uniforms['blendFactor']) {
			this.fogBlendMaterial.uniforms['blendFactor'].value = value
		}
	}

	public getDownsamplingFactor(): number {
		return this.downsamplingFactor
	}

	public setDownsamplingFactor(value: number): void {
		this.downsamplingFactor = value
		this.updateTargets()
	}

	public getComposeMaterial(): ComposeMaterial | null {
		return this.composeMaterial
	}

	public getFogBlurRadius(): number {
		return this.composeMaterial?.getFogBlurRadius() ?? 0.0
	}

	public setFogBlurRadius(value: number): void {
		if (this.composeMaterial) {
			this.composeMaterial.setFogBlurRadius(value)
		}
	}

	private initColorBuffer(): void {
		// Create color render target (full resolution)
		this.colorTarget = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, {
			minFilter: THREE.LinearFilter,
			magFilter: THREE.LinearFilter,
			format: THREE.RGBAFormat,
		})
	}

	private initDepthBuffer(): void {
		const downsampledWidth = Math.floor(window.innerWidth / this.downsamplingFactor)
		const downsampledHeight = Math.floor(window.innerHeight / this.downsamplingFactor)

		// Create depth render target (downsampled) with depth texture enabled
		this.depthTarget = new THREE.WebGLRenderTarget(downsampledWidth, downsampledHeight, {
			minFilter: THREE.NearestFilter,
			magFilter: THREE.NearestFilter,
			format: THREE.RGBAFormat,
			type: THREE.UnsignedByteType,
			depthTexture: new THREE.DepthTexture(downsampledWidth, downsampledHeight),
		})
	}

	private initFog(): void {
		const downsampledWidth = Math.floor(window.innerWidth / this.downsamplingFactor)
		const downsampledHeight = Math.floor(window.innerHeight / this.downsamplingFactor)

		// Create fog render targets (downsampled) with alpha support
		this.fogCurrentTarget = new THREE.WebGLRenderTarget(downsampledWidth, downsampledHeight, {
			minFilter: THREE.LinearFilter,
			magFilter: THREE.LinearFilter,
			format: THREE.RGBAFormat,
			type: THREE.UnsignedByteType,
		})

		this.fogHistoryTarget = new THREE.WebGLRenderTarget(downsampledWidth, downsampledHeight, {
			minFilter: THREE.LinearFilter,
			magFilter: THREE.LinearFilter,
			format: THREE.RGBAFormat,
			type: THREE.UnsignedByteType,
		})

		this.fogBlendedTarget = new THREE.WebGLRenderTarget(downsampledWidth, downsampledHeight, {
			minFilter: THREE.LinearFilter,
			magFilter: THREE.LinearFilter,
			format: THREE.RGBAFormat,
			type: THREE.UnsignedByteType,
		})

		// Create fullscreen triangle for fog
		this.fogMaterial = new FogMaterial(downsampledWidth, downsampledHeight, this.camera)

		this.fogQuad = new THREE.Mesh(this.fullscreenTriangle, this.fogMaterial)

		// Create camera for fullscreen quad
		this.fogCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)

		// Create fog blend material and triangle
		this.fogBlendMaterial = new FogBlendMaterial()
		this.fogBlendQuad = new THREE.Mesh(this.fullscreenTriangle, this.fogBlendMaterial)

		this.fogBlendCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
	}

	private initComposition(): void {
		// Create fullscreen triangle for composition
		this.composeMaterial = new ComposeMaterial(window.innerWidth, window.innerHeight)

		this.composeQuad = new THREE.Mesh(this.fullscreenTriangle, this.composeMaterial)

		// Create camera for fullscreen quad
		this.composeCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
	}

	private initDebugDepth(): void {
		// Create fullscreen triangle for depth visualization
		const downsampledWidth = Math.floor(window.innerWidth / this.downsamplingFactor)
		const downsampledHeight = Math.floor(window.innerHeight / this.downsamplingFactor)
		this.depthPassMaterial = new DepthPassMaterial(downsampledWidth, downsampledHeight)

		// Reserved for future debug depth rendering
		this._depthPassQuad = new THREE.Mesh(this.fullscreenTriangle, this.depthPassMaterial)

		// Camera created but not currently used - reserved for future debug depth rendering
		// this._depthPassCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
	}

	public dispose(): void {
		// Clean up color buffer
		this.colorTarget?.dispose()

		// Clean up depth buffer
		this.depthTarget?.dispose()
		this.stochasticDepthMaterial?.dispose()

		// Clean up fog
		this.fogCurrentTarget?.dispose()
		this.fogHistoryTarget?.dispose()
		this.fogBlendedTarget?.dispose()
		this.fogMaterial?.dispose()
		this.fogBlendMaterial?.dispose()

		// Clean up composition
		this.composeMaterial?.dispose()

		// Clean up debug depth
		this.depthPassMaterial?.dispose()

		// Clean up shared fullscreen triangle geometry
		this.fullscreenTriangle.dispose()
	}
}
