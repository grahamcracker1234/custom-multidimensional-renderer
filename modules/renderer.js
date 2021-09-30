import Canvas from "./canvas.js";
import Matrix from "./matrix.js";
import Point from "./point.js";
import { Global, Display, Projection, hash } from "./global.js";

// Module-private variables.
let canvas;
let context;
let cubePoints;

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
			const matches = a.map( (_, ii) => a[ii] === b[ii] ? 1 : 0 ).reduce( (x, y) => x + y );

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
			if (i >= j) continue;
			const b = cubePoints[j];

			for (const k in cubePoints) {
				if (j >= k) continue;
				const c = cubePoints[k];

				for (const l in cubePoints) {
					if (k >= l) continue;
					const d = cubePoints[l];
					const facePoints = [a, b, c, d];

					// Check how many dimensions all vertices share and store result in matches.
					let matches = facePoints[0].map( (_, ii) => 
						facePoints.every( (p) => facePoints[0][ii] === p[ii] ) ? 1 : 0
					).reduce( (x, y) => x + y );

					// If matches do not differ by exactly two from the total dimension count, then they are not in the same face; continue.
					if (matches !== dimension - 2) continue;

					// All vertices are in the same face, but now they must be ordered clockwise in `faceIndices`.
					// Add first vertex index to array.
					let faceIndices = [i];

					// The rest of the vertices's indices.
					let rest = [j,k,l];

					// While all indices have not yet been put into array, find the next index.
					while (faceIndices.length != 4) {
						// Check to see how many dimensions are shared between last item in `faceIndices` and the first item in `rest`.
						const lastIndex = faceIndices[faceIndices.length - 1];
						matches = cubePoints[lastIndex].map( (_, ii) => cubePoints[lastIndex][ii] === cubePoints[rest[0]][ii] ? 1 : 0 ).reduce( (x, y) => x + y );

						// If matches do not differ by exactly one from the total dimension count, then they they are not in the same edge; rotate `rest` and continue.
						if (matches !== dimension - 1) {
							rest.push(rest.shift());
							continue;
						}

						// The selected vertices are guaranteed to be in the same axis.
						// Add the selected vertices to the `faceIndices` and remove it from `rest`.
						faceIndices.push(rest[0]);
						rest.shift();
					}

					// Indices have been properly ordered; yield. 
					yield faceIndices;
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

/**
 * Generates all transformed points.
 * @param {number[][]} points - An array of points.
 * @yields {number[]} A transformed point.
 */
const transformGenerator = (() => {
	let memo; // Added memoization to improve performance after multiple calls.
	const getSeconds = () => window.performance.now() / 1000; // Gets number of seconds since program began.
	const start = getSeconds();
	const rotationLength = Global.DIMENSIONS * (Global.DIMENSIONS - 1) / 2; // Number of rotations for the dimension.

	return function* (points) {
		for (const point of points) {
			let pointMatrix = Point.toMatrix(point);

			// Speed in degrees per second.
			const theta = (getSeconds() - start) * Global.SPEED * (Math.PI / 180);
			let multiplier = 1;

			// Memoize rotations.
			memo ??= Array.from(rotationsGenerator(Global.DIMENSIONS));

			// Apply each rotation.
			for (const rotation of memo) {
				// Apply a multiplier if there is a rotation offset.
				const r = Global.ROTATION_OFFSET ? rotation(theta * multiplier) : rotation(theta);

				// Apply rotation to point.
				pointMatrix = Matrix.mul(r, pointMatrix);

				// Increase rotation offset.
				multiplier += Global.ROTATION_OFFSET / rotationLength;
			}

			// Yield transformed point.
			yield Matrix.toPoint(pointMatrix);
		}
	};
})();

/**
 * Generates projected points.
 * @param {number[][]} points - An array of points.
 * @yields {number[]} A projected point.
 */
const projectionGenerator = function* (points) {
	// Apply a projection to each point.
	for (const point of points) {
		// Get copy of point.
		let newPoint = Array.from(point);
		// Loop through point's dimensions backwards.
		for (let i = point.length - 1; i > 1; i--) {
			// Multiplying factor, used for bringing lower dimensions closer towards center if they are further away.
			const r = Global.FAR_CLIPPING_PLANE / (Global.FAR_CLIPPING_PLANE - newPoint[i]);
			
			// Create projection matrix with diagonal being the multiplying factor. 
			const projectionMatrix = Matrix.init(point.length, point.length);
			for (const j in projectionMatrix) projectionMatrix[j][j] = r;

			// Apply projection to point.
			const pointMatrix = Point.toMatrix(newPoint);
			const newPointMatrix = Matrix.mul(projectionMatrix, pointMatrix);
			newPoint = Matrix.toPoint(newPointMatrix);
		}
		// Yield new point after all projections applied.
		yield newPoint;
	}
};

/**
 * Setup the renderer
 */
const setup = () => {
	canvas = Canvas();
	context = canvas.getContext("2d");
	context.fillStyle = Global.BACKGROUND_COLOR;
	context.fillRect(-canvas.width / 2, -canvas.height / 2, canvas.width, canvas.height);

	document.body.appendChild(canvas);

	cubePoints = Array.from(cubePointsGenerator(Global.DIMENSIONS, Global.SIZE));
};

const drawVertices = (points) => {
	for (const i in points) {
		const point = points[i];
		const color = "#" + hash(point.length - i) + hash(i + point.length) + hash(i * point.length);
		context.fillStyle = color;
		context.beginPath();
		context.arc(point[0] ?? 0, point[1] ?? 0, Global.LINE_WIDTH / 2, 0, 2 * Math.PI, false);
		context.fill();
	}
};

const drawEdges = (() => {
	let memo;
	return (cubePoints, points) => {
		memo ??= Array.from(edgeGenerator(Global.DIMENSIONS, cubePoints));
		for (const [i, j] of memo) {
			if (Global.COLOR == null) {
				const color = "#" + hash(i / j) + hash(i + j) + hash(i * j);
				context.strokeStyle = color;
			}
			context.beginPath();
			context.moveTo(points[i][0] ?? 0, points[i][1] ?? 0);
			context.lineTo(points[j][0] ?? 0, points[j][1] ?? 0);
			context.stroke();
		}
	};
})();

const drawFaces = (() => {
	let memo;
	return (cubePoints, points) => {
		memo ??= Array.from(faceGenerator(Global.DIMENSIONS, cubePoints));
		for (const [i, j, k, l] of memo) {
			if (Global.COLOR == null) {
				const color = "#" + hash(i - j - k - l) + hash(i + j * k / l) + hash(i ** j / k + l);
				context.fillStyle = color;
			}
			context.beginPath();
			context.moveTo(points[i][0] ?? 0, points[i][1] ?? 0);
			context.lineTo(points[j][0] ?? 0, points[j][1] ?? 0);
			context.lineTo(points[k][0] ?? 0, points[k][1] ?? 0);
			context.lineTo(points[l][0] ?? 0, points[l][1] ?? 0);
			context.closePath();
			context.fill();
		}
	};
})();

const drawBackground = () => {
	const width = canvas.width;
	const height = canvas.height;

	if (Global.BACKGROUND_ALPHA === 1 && Global.BACKGROUND_COLOR == null) {
		context.clearRect(-width / 2, -height / 2, width, height);
	} else {
		context.globalAlpha = Global.BACKGROUND_ALPHA;
		context.fillStyle = Global.BACKGROUND_COLOR;
		context.fillRect(-width / 2, -height / 2, width, height);
	}
};

const drawSetup = () => {
	context.fillStyle = Global.COLOR ?? "black";
	context.strokeStyle = Global.COLOR ?? "black";
	context.lineWidth = Global.LINE_WIDTH;
	context.lineCap = "round";
	context.globalAlpha = 1 / (Global.DIMENSIONS - 1);
};

/**
 * Renders the cube every frame.
 * @param {object} args
 * @param {HTMLCanvasElement} args.canvas - The canvas to on which to render.
 * @param {number[][]} args.cubePoints - The points of the cube to render.
 */
const draw = () => {
	// Draw background to clear frame.
	drawBackground();

	// Setup canvas properties for drawing.
	drawSetup();

	let points = Array.from(cubePoints);

	// Transform cubePoints into rotated points.
	points = Array.from(transformGenerator(points));

	// If perspective projection, add perspective to points.
	if (Global.PROJECTION === Projection.PERSPECTIVE)
		points = Array.from(projectionGenerator(points));

	// If display contains faces, draw faces.
	if (Display.has(Display.FACES))
		drawFaces(cubePoints, points);

	// If display contains edges, draw edges.
	if (Display.has(Display.EDGES))
		drawEdges(cubePoints, points);

	// If display contains vertices, draw points.
	if (Display.has(Display.VERTICES))
		drawVertices(points);

	// Draw next frame.
	requestAnimationFrame(() => draw());
};

const Renderer = { draw, setup };

export default Renderer;