const Display = Object.freeze({
	VERTICES: "VERTICES",
	EDGES: "EDGES",
	VERTICES_EDGES: "VERTICES_EDGES"
});

const Projection = Object.freeze({
	PERSPECTIVE: "PERSPECTIVE",
	ORTHOGRAPHIC: "ORTHOGRAPHIC"
});

const Global = Object.freeze({
	DIMENSIONS: 4,
	PROJECTION: Projection.ORTHOGRAPHIC,
	DISPLAY: Display.EDGES,
	COLOR: null,
	BACKGROUND_COLOR: "black",
	BACKGROUND_ALPHA: 1,
	LINE_WIDTH: 3,
	SPEED: 5,
	SIZE: 400,
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