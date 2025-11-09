import * as THREE from 'three'

export class TextureFactory {
	/**
	 * Creates a linear gradient texture with RGBA support
	 * @param size Texture size (width and height)
	 * @param colorStops Array of color stops [position, color] where position is 0-1 and color is rgba string
	 * @param colorSpace Color space for the texture (default: SRGBColorSpace)
	 * @returns THREE.CanvasTexture with the gradient
	 */
	public static createLinearGradientTexture(
		size: number,
		colorStops: Array<[number, string]>,
		colorSpace: THREE.ColorSpace = THREE.SRGBColorSpace
	): THREE.CanvasTexture {
		const canvas = document.createElement('canvas')
		canvas.width = size
		canvas.height = size
		const context = canvas.getContext('2d')!

		const gradient = context.createLinearGradient(0, 0, 0, size)
		colorStops.forEach(([position, color]) => {
			gradient.addColorStop(position, color)
		})

		context.fillStyle = gradient
		context.fillRect(0, 0, size, size)

		const texture = new THREE.CanvasTexture(canvas)
		texture.needsUpdate = true
		texture.colorSpace = colorSpace

		return texture
	}

	/**
	 * Creates a radial gradient texture
	 * @param size Texture size (width and height)
	 * @param colorStops Array of color stops [position, color] where position is 0-1 and color is rgba string
	 * @param colorSpace Color space for the texture (default: SRGBColorSpace)
	 * @returns THREE.CanvasTexture with the radial gradient
	 */
	public static createRadialGradientTexture(
		size: number,
		colorStops: Array<[number, string]>,
		colorSpace: THREE.ColorSpace = THREE.SRGBColorSpace
	): THREE.CanvasTexture {
		const canvas = document.createElement('canvas')
		canvas.width = size
		canvas.height = size
		const context = canvas.getContext('2d')!

		const centerX = size / 2
		const centerY = size / 2
		const radius = size / 2
		const gradient = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius)

		colorStops.forEach(([position, color]) => {
			gradient.addColorStop(position, color)
		})

		context.fillStyle = gradient
		context.fillRect(0, 0, size, size)

		const texture = new THREE.CanvasTexture(canvas)
		texture.needsUpdate = true
		texture.colorSpace = colorSpace

		return texture
	}

	/**
	 * Creates a tree trunk RGBA texture (transparent at top, opaque at bottom)
	 * @param size Texture size (default: 256)
	 * @returns THREE.CanvasTexture with blue gradient
	 */
	public static createTreeTrunkTexture(size: number = 256): THREE.CanvasTexture {
		// Desaturate colors by 20%: blend 80% original with 20% grayscale
		// Top color: rgba(235, 202, 193) -> grayscale = 211, desaturated = rgba(230, 204, 197)
		// Bottom color: rgba(236, 183, 169) -> grayscale = 197, desaturated = rgba(228, 186, 175)
		return this.createLinearGradientTexture(
			size,
			[
				[0, 'rgba(230, 204, 197, 0)'], // Transparent at top (desaturated by 20%)
				[0.75, 'rgba(228, 186, 175, 1)'], // Opaque at bottom (desaturated by 20%)
			],
			THREE.SRGBColorSpace
		)
	}

	/**
	 * Creates a thickness texture for subsurface scattering (white = thick, darker = thinner)
	 * @param size Texture size (default: 256)
	 * @returns THREE.CanvasTexture with thickness gradient
	 */
	public static createThicknessTexture(size: number = 256): THREE.CanvasTexture {
		return this.createLinearGradientTexture(
			size,
			[
				[0, 'rgba(255, 255, 255, 1)'], // Thick at top
				[1, 'rgba(200, 200, 200, 1)'], // Slightly thinner at bottom
			]
		)
	}

	/**
	 * Creates a particle texture with radial gradient (opaque center, transparent edges)
	 * @param size Texture size (default: 64)
	 * @returns THREE.CanvasTexture with radial gradient
	 */
	public static createParticleTexture(size: number = 64): THREE.CanvasTexture {
		return this.createRadialGradientTexture(
			size,
			[
				[0, 'rgba(255, 255, 255, 1.0)'], // Opaque white center
				[0.5, 'rgba(255, 255, 255, 0.5)'], // Semi-transparent middle
				[1, 'rgba(255, 255, 255, 0.0)'], // Transparent edges
			]
		)
	}

	/**
	 * Creates a grayscale gradient alpha map texture (white = opaque, black = transparent)
	 * @param size Texture size (default: 256)
	 * @param colorStops Array of grayscale color stops [position, grayscale] where position is 0-1 and grayscale is 0-255
	 * @returns THREE.CanvasTexture with grayscale gradient for alpha mapping
	 */
	public static createGrayscaleAlphaMap(size: number = 256, colorStops: Array<[number, number]> = [[0, 0], [0.75, 255]]): THREE.CanvasTexture {
		const canvas = document.createElement('canvas')
		canvas.width = size
		canvas.height = size
		const context = canvas.getContext('2d')!

		const gradient = context.createLinearGradient(0, 0, 0, size)
		colorStops.forEach(([position, grayscale]) => {
			const gray = Math.max(0, Math.min(255, grayscale))
			gradient.addColorStop(position, `rgb(${gray}, ${gray}, ${gray})`)
		})

		context.fillStyle = gradient
		context.fillRect(0, 0, size, size)

		const texture = new THREE.CanvasTexture(canvas)
		texture.needsUpdate = true

		return texture
	}

	/**
	 * Creates a floor texture with radial gradient (opaque center, transparent edges)
	 * @param size Texture size (default: 512)
	 * @returns THREE.CanvasTexture with radial gradient for floor transparency
	 */
	public static createFloorTexture(size: number = 512): THREE.CanvasTexture {
		return this.createRadialGradientTexture(
			size,
			[
				[0, 'rgba(139, 115, 85, 1.0)'], // Opaque warm brown center
				[0.7, 'rgba(139, 115, 85, 0.5)'], // Semi-transparent warm brown middle
				[1, 'rgba(139, 115, 85, 0.0)'], // Transparent warm brown edges
			],
			THREE.SRGBColorSpace
		)
	}
}

