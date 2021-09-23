import Canvas from "./canvas.js";
import Matrix from "./matrix.js";
import Point from "./point.js";
import { Global, Display, Projection, hash } from "./global.js";

/**
 * Generates the points of a cube, centered at the origin.
 * @param {number} dimension - The dimension of the cube to be generated.
 * @param {size} [size = 1] - The size of the cube, defaults to 1.
 * @yields {number[]} The next point in the cube.
 */
const cubePointsGenerator = function* (dimension, size = 1) {
	const end = 2 ** dimension;
	for (let i = 0; i < end; i++) {
		const binary = i.toString(2) // Convert i to binary.
			.padStart(end.toString(2).length - 1, 0); // Pad the left side with zeros to have consistent length.
		yield Array.from(binary)
			.map(x => x === "0" ? -1 : 1) // Map "0" -> -1 and "1" -> 1
			.map(x => x * size / 2); // Multiple by radius or half the size.
	}
};

/**
 * Generates pairs of indices of the points that represent an edge.
 * @param {number} dimension - The dimension of the generated edges.
 * @param {number[][]} cubePoints - An array of a non-rotated points of a cube.
 * @yields {number[]} A pair of indices that represent an edge.
 */
const edgeGenerator = function* (dimension, cubePoints) {
	for (const i in cubePoints) {
		const a = cubePoints[i];
		for (const j in cubePoints) {
			const b = cubePoints[j];
			if (a === b) continue; // Continue to next iteration, if a and b are the same.
			if (a.length !== b.length) throw new Error("Vectors do not have same length");

			// Count the amount of shared dimensions between a and b.
			let matches = 0;
			for (const k in a)
				if (a[k] === b[k]) matches++;

			// If there is one dimension different between the two this means they form an edge.
			// Continue to next iteration, if this is not the case.
			if (matches !== dimension - 1) continue;

			// Yield the pair if this is the case.
			yield [i, j];
		}
	}
};

/**
 * Generates sets of indices of the points that represent a face.
 * @param {number} dimension - The dimension of the generated faces.
 * @param {number[][]} cubePoints - An array of a non-rotated points of a cube.
 * @yields {number[]} A set of indices that represent an face.
 */
const faceGenerator = function* (dimension, cubePoints) {
	for (const i in cubePoints) {
		const a = cubePoints[i];
		for (const j in cubePoints) {
			const b = cubePoints[j];
			if (i >= j) continue; 
			for (const k in cubePoints) {
				const c = cubePoints[k];
				if (i >= k) continue; 
				if (j >= k) continue; 
				for (const l in cubePoints) {
					const d = cubePoints[l];
					if (i >= l) continue; 
					if (j >= l) continue; 
					if (k >= l) continue; 

					let matches = 0;
					for (const m in a)
						if ([a,b,c,d].every((x) => x[m] === a[m])) matches++;

					if (matches !== dimension - 2) continue;

					let indices = [i];
					matches = 0;
					for (const m in a)
						if (a[m] === b[m]) matches++;
					if (matches === dimension - 1) {
						indices.push(j);
						matches = 0;
						for (const m in b)
							if (b[m] === c[m]) matches++;
						if (matches === dimension - 1) indices.push(k, l);
						else indices.push(l, k);
					} else {
						indices.push(k);
						matches = 0;
						for (const m in c)
							if (c[m] === b[m]) matches++;
						if (matches === dimension - 1) indices.push(j, l);
						else indices.push(l, j);
					}

					yield indices;
				}
			}
		}
	}
};

/**
 * Callback for a rotation matrix.
 * @callback rotationMatrix
 * @param {number} theta - The angle of rotation.
 * @returns {number[][]} Rotation matrix.
 *//**
 * Generates all rotation matrices.
 * @param {number} dimension - The dimension of the rotation matrices.
 * @yields {rotationMatrix} A function that takes an angle `theta` and returns the rotation matrix.
 */
const rotationsGenerator = function* (dimension) {
	for (let i = 0; i < dimension - 1; i++) {
		for (let j = i + 1; j < dimension; j++) {
			yield (theta) => {
				const matrix = Matrix.init(dimension, dimension);
				for (let k = 0; k < dimension; k++) matrix[k][k] = 1;
				matrix[i][i] = Math.cos(theta);
				matrix[i][j] = -Math.sin(theta);
				matrix[j][i] = Math.sin(theta);
				matrix[j][j] = Math.cos(theta);
				return matrix;
			};
		}
	}
};

const transformGenerator = (() => {
	let memo;
	return function* (points) {
		for (const point of points) {
			let pointMatrix = Point.toMatrix(point);

			let multiplier = 1;
			const theta = Global.SPEED * window.performance.now() / 10000;
			const rotationLength = Global.DIMENSIONS * (Global.DIMENSIONS - 1) / 2;
			memo ??= Array.from(rotationsGenerator(Global.DIMENSIONS));
			for (const rotation of memo) {
				const r = Global.ROTATION_OFFSET ? rotation(theta * multiplier) : rotation(theta);
				pointMatrix = Matrix.mul(r, pointMatrix);
				multiplier += Global.ROTATION_OFFSET / rotationLength;
			}

			yield Matrix.toPoint(pointMatrix);
		}
	};
})();

const projectionGenerator = function* (points) {
	for (const point of points) {
		let newPoint = Array.from(point);
		for (let i = point.length - 1; i > 1; i--) {
			const r = Global.FAR_CLIPPING_PLANE / (Global.FAR_CLIPPING_PLANE - newPoint[i]);
			
			const projectionMatrix = Matrix.init(point.length, point.length);
			for (const j in projectionMatrix) projectionMatrix[j][j] = r;

			const pointMatrix = Point.toMatrix(newPoint);
			const newPointMatrix = Matrix.mul(projectionMatrix, pointMatrix);

			newPoint = Matrix.toPoint(newPointMatrix);
		}
		yield newPoint;
	}
};

const getContext = (canvas) => canvas.getContext("2d");

const setup = () => {
	if (Global.DIMENSIONS !== parseInt(Global.DIMENSIONS)) throw new Error("Dimension must be positive integer greater than 1");

	const canvas = Canvas();
	const ctx = getContext(canvas);
	ctx.fillStyle = Global.BACKGROUND_COLOR;
	ctx.fillRect(-canvas.width / 2, -canvas.height / 2, canvas.width, canvas.height);

	document.body.appendChild(canvas);

	const cubePoints = Array.from(cubePointsGenerator(Global.DIMENSIONS, Global.SIZE));

	return {canvas, cubePoints};
};

const drawVertices = ({canvas, points}) => {
	const ctx = getContext(canvas);
	for (const i in points) {
		const point = points[i];
		const color = "#" + hash(point.length - i) + hash(i + point.length) + hash(i * point.length);
		ctx.fillStyle = color;
		ctx.beginPath();
		ctx.arc(point[0] ?? 0, point[1] ?? 0, Global.LINE_WIDTH / 2, 0, 2 * Math.PI, false);
		ctx.fill();
	}
};

const drawEdges = (() => {
	let memo;
	return ({canvas, cubePoints, points}) => {
		const ctx = getContext(canvas);
		memo ??= Array.from(edgeGenerator(Global.DIMENSIONS, cubePoints));
		for (const [i, j] of memo) {
			if (Global.COLOR == null) {
				const color = "#" + hash(i / j) + hash(i + j) + hash(i * j);
				ctx.strokeStyle = color;
			}
			ctx.beginPath();
			ctx.moveTo(points[i][0] ?? 0, points[i][1] ?? 0);
			ctx.lineTo(points[j][0] ?? 0, points[j][1] ?? 0);
			ctx.stroke();
		}
	};
})();

const drawFaces = (() => {
	let memo;
	return ({canvas, cubePoints, points}) => {
		const ctx = getContext(canvas);
		memo ??= Array.from(faceGenerator(Global.DIMENSIONS, cubePoints));
		for (const [i, j, k, l] of memo) {
			if (Global.COLOR == null) {
				const color = "#" + hash(i - j - k - l) + hash(i + j * k / l) + hash(i ** j / k + l);
				ctx.fillStyle = color;
			}
			ctx.beginPath();
			ctx.moveTo(points[i][0] ?? 0, points[i][1] ?? 0);
			ctx.lineTo(points[j][0] ?? 0, points[j][1] ?? 0);
			ctx.lineTo(points[k][0] ?? 0, points[k][1] ?? 0);
			ctx.lineTo(points[l][0] ?? 0, points[l][1] ?? 0);
			ctx.closePath();
			ctx.fill();
		}
	};
})();

const drawBackground = (canvas) => {
	const ctx = getContext(canvas);
	const width = canvas.width;
	const height = canvas.height;

	if (Global.BACKGROUND_ALPHA === 1 && Global.BACKGROUND_COLOR == null) {
		ctx.clearRect(-width / 2, -height / 2, width, height);
	} else {
		ctx.globalAlpha = Global.BACKGROUND_ALPHA;
		ctx.fillStyle = Global.BACKGROUND_COLOR;
		ctx.fillRect(-width / 2, -height / 2, width, height);
	}
};

const drawSetup = (canvas) => {
	const ctx = getContext(canvas);

	ctx.fillStyle = Global.COLOR ?? "black";
	ctx.strokeStyle = Global.COLOR ?? "black";
	ctx.lineWidth = Global.LINE_WIDTH;
	ctx.lineCap = "round";
	ctx.globalAlpha = 0.5;
};

const draw = ({canvas, cubePoints}) => {
	// Draw background to clear frame.
	drawBackground(canvas);

	// Setup canvas properties for drawing.
	drawSetup(canvas);

	let points = Array.from(cubePoints);

	// Transform cubePoints into rotated points.
	points = Array.from(transformGenerator(points));

	// If perspective projection, add perspective to points.
	if (Global.PROJECTION === Projection.PERSPECTIVE)
		points = Array.from(projectionGenerator(points));

	// If display contains faces, draw faces.
	if (Global.DISPLAY.includes(Display.FACES))
		drawFaces({canvas, cubePoints, points});

	// If display contains edges, draw edges.
	if (Global.DISPLAY.includes(Display.EDGES))
		drawEdges({canvas, cubePoints, points});

	// If display contains vertices, draw Points
	if (Global.DISPLAY.includes(Display.VERTICES))
		drawVertices({canvas, points});

	// Draw next frame.
	return requestAnimationFrame(() => draw({canvas, cubePoints}));
};

const Renderer = { draw, setup };

export default Renderer;