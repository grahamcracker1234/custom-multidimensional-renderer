"use strict";

function createCanvas() {
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
}

const Vector = (...args) => {
	let vector = Array(3).fill(0);
	if (args.length === 1) vector = Array(args[0]).fill(0);
	return vector;
};

const Matrix = (...args) => {
	let matrix = Array(3).fill().map(() => Array(3).fill(0));
	if (args.length === 1) matrix = Array(args[0]).fill().map(() => Array(args[0]).fill(0));
	if (args.length === 2) matrix = Array(args[0]).fill().map(() => Array(args[1]).fill(0));
	return matrix;
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

const generateCube = (n) => {
	const end = 2 ** 4;
	const points = [];
	for (let i = 0; i < end; i++) {
		const binary = i.toString(2).padStart(end.toString(2).length - 1, 0);
		const vector = Array.from(binary).map(x => x === "0" ? -n / 2 : n / 2);
		points.push(vector);
	}
	return points;
};

// Rotations do not necessarily follow the right-hand-rule
const Rotation = Object.freeze({
	xy: theta => [
		[Math.cos(theta), -Math.sin(theta), 0, 0],
		[Math.sin(theta), Math.cos(theta), 0, 0],
		[0, 0, 1, 0],
		[0, 0, 0, 1]
	],
	xz: theta => [
		[Math.cos(theta), 0, -Math.sin(theta), 0],
		[0, 1, 0, 0],
		[Math.sin(theta), 0, Math.cos(theta), 0],
		[0, 0, 0, 1]
	],
	xw: theta => [
		[Math.cos(theta), 0, 0, -Math.sin(theta)],
		[0, 1, 0, 0],
		[0, 0, 1, 0],
		[Math.sin(theta), 0, 0, Math.cos(theta)],
	],
	yz: theta => [
		[1, 0, 0, 0],
		[0, Math.cos(theta), -Math.sin(theta), 0],
		[0, Math.sin(theta), Math.cos(theta), 0],
		[0, 0, 0, 1]
	],
	yw: theta => [
		[1, 0, 0, 0],
		[0, Math.cos(theta), 0, -Math.sin(theta)],
		[0, 0, 1, 0],
		[0, Math.sin(theta), 0, Math.cos(theta)]
	],
	zw: theta => [
		[1, 0, 0, 0],
		[0, 1, 0, 0],
		[0, 0, Math.cos(theta), -Math.sin(theta)],
		[0, 0, Math.sin(theta), Math.cos(theta)]
	]
});

const setup = () => {
	const canvas = createCanvas();
	const ctx = canvas.getContext("2d");
	document.body.appendChild(canvas);

	const points = generateCube(400);

	return [canvas, ctx, points];
};

const draw = (...args) => {
	const [canvas, ctx, points] = args;
	const width = canvas.width;
	const height = canvas.height;

	ctx.clearRect(-width / 2, -height / 2, width, height);
	ctx.fillStyle = "black";
	ctx.strokeStyle = "black";
	ctx.lineWidth = 3;

	const projection = [];
	for (const point of points) {
		const pointMatrix = [[point[0]], [point[1]], [point[2]], [point[3]]];
		const theta = window.performance.now() / 1000;
		let newPointMatrix = matrixMultiplication(Rotation.xy(theta), pointMatrix);
		newPointMatrix = matrixMultiplication(Rotation.xz(theta), newPointMatrix);
		newPointMatrix = matrixMultiplication(Rotation.xw(theta), newPointMatrix);
		newPointMatrix = matrixMultiplication(Rotation.yz(theta), newPointMatrix);
		newPointMatrix = matrixMultiplication(Rotation.yw(theta), newPointMatrix);
		newPointMatrix = matrixMultiplication(Rotation.zw(theta), newPointMatrix);
		const newPoint = [newPointMatrix[0][0], newPointMatrix[1][0], newPointMatrix[2][0], newPointMatrix[3][0]];
		projection.push(newPoint);
	}

	const pairs = [];
	for (const i in points) {
		const a = points[i];
		for (const j in points) {
			const b = points[j];
			if (a === b) continue;

			let matches = 0;
			if (a[0] === b[0]) matches++;
			if (a[1] === b[1]) matches++;
			if (a[2] === b[2]) matches++;
			if (a[3] === b[3]) matches++;
			if (matches < 3) continue;

			pairs.push([i, j]);
		}
	}

	for (const [i, j] of pairs) {
		ctx.beginPath();
		ctx.moveTo(projection[i][0], projection[i][1]);
		ctx.lineTo(projection[j][0], projection[j][1]);
		ctx.stroke();
	}

	// for (const point of projection) {
	// 	ctx.beginPath();
	// 	ctx.arc(point[0], point[1], 3, 0, 2 * Math.PI, false);
	// 	ctx.fill();
	// }

	window.requestAnimationFrame(() => draw(...args));
};

(() => {
	const options = setup();
	draw(...options);
})();