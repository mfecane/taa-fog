import * as THREE from 'three'

export class TreeTrunkGeometry extends THREE.BufferGeometry {
	constructor(
		baseRadius: number = 0.3,
		topRadius: number = 0.5,
		height: number = 1.5,
		segments: number = 8,
		nGonSides: number = 8,
		shiftAmount: number = 0.05
	) {
		super()

		const vertices: number[] = []
		const normals: number[] = []
		const uvs: number[] = []
		const indices: number[] = []

		// Generate base n-gon vertices on xz plane (y = 0)
		const baseVertices: THREE.Vector3[] = []
		for (let i = 0; i < nGonSides; i++) {
			const angle = (i / nGonSides) * Math.PI * 2
			const x = Math.cos(angle) * baseRadius
			const z = Math.sin(angle) * baseRadius
			baseVertices.push(new THREE.Vector3(x, 0, z))
		}

		// Generate vertices for each segment
		const segmentHeight = height / segments
		let currentShiftX = 0
		let currentShiftZ = 0

		for (let seg = 0; seg <= segments; seg++) {
			const y = seg * segmentHeight
			const t = seg / segments // 0 to 1
			
			// Interpolate radius from base to top (taper)
			const currentRadius = THREE.MathUtils.lerp(baseRadius, topRadius, t)
			
			// Apply shift in xz plane (rotating shift direction)
			const shiftAngle = t * Math.PI * 2 * 0.5 // Rotate shift direction
			currentShiftX = Math.cos(shiftAngle) * shiftAmount * seg
			currentShiftZ = Math.sin(shiftAngle) * shiftAmount * seg

			// Create vertices for this segment level
			for (let i = 0; i < nGonSides; i++) {
				const baseVertex = baseVertices[i]
				// Scale vertex by current radius ratio
				const radiusScale = currentRadius / baseRadius
				const x = (baseVertex.x * radiusScale) + currentShiftX
				const z = (baseVertex.z * radiusScale) + currentShiftZ
				
				vertices.push(x, y, z)

				// Initial normal (will be recalculated by computeVertexNormals)
				// Pointing outward from shifted center
				const centerX = currentShiftX
				const centerZ = currentShiftZ
				const normalX = x - centerX
				const normalZ = z - centerZ
				const normalLength = Math.sqrt(normalX * normalX + normalZ * normalZ)
				normals.push(
					normalLength > 0.001 ? normalX / normalLength : 1,
					0,
					normalLength > 0.001 ? normalZ / normalLength : 0
				)

				// UV coordinates: u wraps around the polygon, v goes up
				const u = i / nGonSides
				const v = t
				uvs.push(u, v)
			}
		}

		// Generate indices for side faces
		for (let seg = 0; seg < segments; seg++) {
			for (let i = 0; i < nGonSides; i++) {
				const current = seg * nGonSides + i
				const next = seg * nGonSides + ((i + 1) % nGonSides)
				const currentNext = (seg + 1) * nGonSides + i
				const nextNext = (seg + 1) * nGonSides + ((i + 1) % nGonSides)

				// First triangle
				indices.push(current, currentNext, next)
				// Second triangle
				indices.push(next, currentNext, nextNext)
			}
		}

		// Set geometry attributes
		this.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
		this.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
		this.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
		this.setIndex(indices)

		this.computeVertexNormals()
	}
}

