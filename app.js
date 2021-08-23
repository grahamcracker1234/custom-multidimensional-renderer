"use strict";

const Display = Object.freeze({
	VERTICES: "VERTICES",
	EDGES: "EDGES",
	VERTICES_EDGES: "VERTICES_EDGES"
});

const Projection = Object.freeze({
	PERSPECTIVE: "PERSPECTIVE",
	ORTHOGRAPHIC: "ORTHOGRAPHIC"
});

const Canvas = () => {
	const ratio = window.devicePixelRatio;
	const canvas = document.createElement("canvas");
	const ctx = canvas.getContext("2d");

	const resize = () => {
		const [width, height] = [window.innerWidth, window.innerHeight];
		canvas.width = width * ratio;
		canvas.height = height * ratio;
		canvas.style.width = width + "px";
		canvas.style.height = height + "px";
		ctx.scale(ratio, ratio);
		ctx.translate(width / 2, height / 2);
	};
	
	resize();
	window.addEventListener("resize", () => {
		console.log("resize");
		resize();
	});

	return canvas;
};

const Matrix = (...args) => {
	if (args.length === 1) return Array(args[0]).fill().map(() => Array(args[0]).fill(0));
	if (args.length === 2) return Array(args[0]).fill().map(() => Array(args[1]).fill(0));
	return Array(3).fill().map(() => Array(3).fill(0));
};

const matrixMultiplication = (a, b) => {
	const [aRows, aCols] = [a.length, a[0].length];
	const [bRows, bCols] = [b.length, b[0].length];
	if (!Array.isArray(a) || !Array.isArray(b) || !aCols || !aRows || !bCols || !bRows)
		throw new Error("Arguments should be in 2-dimensional array format");
	if (aCols !== bRows)
		throw new Error("Number of columns in the first matrix should be the same as the number of rows in the second");

	const product = Matrix(aRows, bCols);
	for (let i = 0; i < aRows; i++)
		for (let j = 0; j < bCols; j++)
			for (let k = 0; k < aCols; k++)
				product[i][j] += a[i][k] * b[k][j];

	return product;
};

const generateCubePoints = (dimension, size) => {
	const end = 2 ** dimension;
	const points = [];
	for (let i = 0; i < end; i++) {
		const binary = i.toString(2).padStart(end.toString(2).length - 1, 0);
		const vector = Array.from(binary).map(x => x === "0" ? -1 : 1).map(x => x * size / 2);
		points.push(vector);
	}
	return points;
};

// Rotations do not necessarily follow the right-hand rule
const generateRotations = (dimension, theta) => {
	const rotations = [];
	for (let i = 0; i < dimension - 1; i++) {
		for (let j = i + 1; j < dimension; j++) {
			const matrix = Matrix(dimension);
			for (let k = 0; k < dimension; k++) matrix[k][k] = 1;
			matrix[i][i] = Math.cos(theta);
			matrix[i][j] = -Math.sin(theta);
			matrix[j][i] = Math.sin(theta);
			matrix[j][j] = Math.cos(theta);
			rotations.push(matrix);
		}
	}
	return rotations;
};

const Transformations = (points, GLOBAL) => {
	const newPoints = [];
	for (const point of points) {
		const pointMatrix = Matrix(GLOBAL.DIMENSIONS, 1);
		for (const i in pointMatrix) pointMatrix[i] = [point[i]]; // Convert to matrix

		const theta = window.performance.now() / 3000;
		const rotations = generateRotations(GLOBAL.DIMENSIONS, theta);
		let newPointMatrix = pointMatrix;
		for (const rotation of rotations) newPointMatrix = matrixMultiplication(rotation, newPointMatrix);

		const newPoint = newPointMatrix.map(x => x[0]); // Convert to vector
		newPoints.push(newPoint);
	}
	return newPoints;
};

const setup = (GLOBAL) => {
	if (GLOBAL.DIMENSIONS !== parseInt(GLOBAL.DIMENSIONS)) throw new Error("Dimension must be positive integer greater than 1");

	const canvas = Canvas();
	const ctx = canvas.getContext("2d");
	document.body.appendChild(canvas);

	const points = generateCubePoints(GLOBAL.DIMENSIONS, 400);

	return [canvas, ctx, points, GLOBAL];
};

const Pairs = (points, GLOBAL) => {
	const pairs = [];
	for (const i in points) {
		const a = points[i];
		for (const j in points) {
			const b = points[j];
			if (a === b) continue;
			if (a.length !== b.length) throw new Error("Vectors do not have same length");

			let matches = 0;
			for (const k in a)
				if (a[k] === b[k]) matches++;

			if (matches !== GLOBAL.DIMENSIONS - 1) continue;
			pairs.push([i, j]);
		}
	}
	return pairs;
};

const Projections = (points, GLOBAL) => {
	const projections = [];
	for (const point of points) {
		const n = point[point.length - 1];
		const far = 1000;
		const r = far / (far - n);
		
		const matrix = Matrix(GLOBAL.DIMENSIONS);
		for (const i in matrix) matrix[i][i] = r; 

		const pointMatrix = Matrix(GLOBAL.DIMENSIONS, 1);
		for (const i in pointMatrix) pointMatrix[i] = [point[i]]; // Convert to matrix

		const newPointMatrix = matrixMultiplication(matrix, pointMatrix);
		const newPoint = newPointMatrix.map(x => x[0]); // Convert to vector

		projections.push(newPoint);
	}
	return projections;
};

const draw = (...args) => {
	const [canvas, ctx, points, GLOBAL] = args;
	const width = canvas.width;
	const height = canvas.height;

	ctx.clearRect(-width / 2, -height / 2, width, height);
	ctx.fillStyle = GLOBAL.COLOR;
	ctx.strokeStyle = GLOBAL.COLOR;
	ctx.lineWidth = GLOBAL.LINE_WIDTH;

	let newPoints = Transformations(points, GLOBAL);

	if (GLOBAL.PROJECTION === Projection.PERSPECTIVE) {
		newPoints = Projections(newPoints, GLOBAL);
	}

	if (GLOBAL.DISPLAY === Display.EDGES || GLOBAL.DISPLAY === Display.VERTICES_EDGES) {
		const pairs = Pairs(points, GLOBAL);
		for (const [i, j] of pairs) {
			ctx.beginPath();
			ctx.moveTo(newPoints[i][0], newPoints[i][1]);
			ctx.lineTo(newPoints[j][0], newPoints[j][1]);
			ctx.stroke();
		}
	}

	if (GLOBAL.DISPLAY === Display.VERTICES || GLOBAL.DISPLAY === Display.VERTICES_EDGES) {
		for (const point of newPoints) {
			ctx.beginPath();
			ctx.arc(point[0], point[1], GLOBAL.LINE_WIDTH / 2, 0, 2 * Math.PI, false);
			ctx.fill();
		}
	}

	window.requestAnimationFrame(() => draw(...args));
};

(() => {
	const GLOBAL = Object.freeze({
		DIMENSIONS: 4,
		PROJECTION: Projection.PERSPECTIVE,
		COLOR: "black",
		DISPLAY: Display.EDGES,
		LINE_WIDTH: 3
	});
	const options = setup(GLOBAL);
	draw(...options);
})();