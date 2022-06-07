/**
 * Enum for which elements to display.
 * @readonly
 * @enum {number}
 */
const Display = Object.freeze({
	VERTICES: 1 << 0,
	EDGES: 1 << 1,
	FACES: 1 << 2,
	VERTICES_EDGES: (1 << 0) | (1 << 1),
	VERTICES_FACES: (1 << 0) | (1 << 2),
	EDGES_FACES: (1 << 1) | (1 << 2),
	VERTICES_EDGES_FACES: (1 << 0) | (1 << 1) | (1 << 2),
	has: (d) => (Global.DISPLAY & d) > 0,
});

/**
 * Enum for projection type.
 * @readonly
 * @enum {number}
 */
const Projection = Object.freeze({
	PERSPECTIVE: 0,
	ORTHOGRAPHIC: 1,
});

/**
 * @typedef {Object} Global
 * @property {number} DIMENSION - The number of dimensions.
 * @property {Projection} PROJECTION - The projection type.
 * @property {Display} DISPLAY - The display type.
 * @property {string} COLOR - The color of the renderer.
 * @property {Color} BACKGROUND_COLOR - The background color of the canvas.
 * @property {number} BACKGROUND_ALPHA - The opacity of the canvas background.
 * @property {number} LINE_WIDTH - The width of the renderer's line.
 * @property {number} SPEED - The degrees per second of the rotation.
 * @property {number} SIZE - The size of the cube.
 * @property {number} ROTATION_OFFSET - The differential between the dimensions' rotational speed.
 * @property {number} FAR_CLIPPING_PLANE - The distance of the clipping plane from the camera. Will affect the field of view.
 */
const Global = Object.freeze({
	DIMENSIONS: 5,
	PROJECTION: Projection.PERSPECTIVE,
	DISPLAY: Display.FACES,
	COLOR: null,
	BACKGROUND_COLOR: "black",
	BACKGROUND_ALPHA: 1,
	LINE_WIDTH: 3,
	SPEED: 30,
	SIZE: 300,
	ROTATION_OFFSET: 1,
	FAR_CLIPPING_PLANE: 1000
});

const hash = function(data, seed = 0) {
	data = `${data}`;
	let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
	for (let i = 0, ch; i < data.length; i++) {
		ch = data.charCodeAt(i);
		h1 = Math.imul(h1 ^ ch, 2654435761);
		h2 = Math.imul(h2 ^ ch, 1597334677);
	}
	
	h1 = Math.imul(h1 ^ (h1>>>16), 2246822507) ^ Math.imul(h2 ^ (h2>>>13), 3266489909);
	h2 = Math.imul(h2 ^ (h2>>>16), 2246822507) ^ Math.imul(h1 ^ (h1>>>13), 3266489909);

	const output = 4294967296 * (2097151 & h2) + (h1>>>0);
	return Math.abs(parseInt(output % 256)).toString(16);
};

export default Global;
export { Global, Display, Projection, hash };