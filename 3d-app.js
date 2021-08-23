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

const Vector2D = (...args) => {
	let xy = { x: 0, y: 0 };
	if (args.length === 1) xy = { x: args[0], y: args[0] };
	if (args.length === 2) xy = { x: args[0], y: args[1] };
	return xy;
};

const Vector3D = (...args) => {
	let xyz = { x: 0, y: 0, z: 0 };
	if (args.length === 1) xyz = { x: args[0], y: args[0], z: args[0] };
	if (args.length === 2) xyz = { x: args[0], y: args[1], z: 0 };
	if (args.length === 3) xyz = { x: args[0], y: args[1], z: args[2] };
	return xyz;
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
	const end = 2 ** 3;
	const points = [];
	for (let i = 0; i < end; i++) {
		const binary = i.toString(2).padStart(end.toString(2).length - 1, 0);
		const vector = Vector3D(...Array.from(binary).map(x => x === "0" ? -n / 2 : n / 2));
		points.push(vector);
	}
	return points;
};

const Rotation = Object.freeze({
	xy: theta => [
		[Math.cos(theta), -Math.sin(theta), 0],
		[Math.sin(theta), Math.cos(theta), 0],
		[0, 0, 1]
	],
	xz: theta => [
		[Math.cos(theta), 0, Math.sin(theta)],
		[0, 1, 0],
		[-Math.sin(theta), 0, Math.cos(theta)]
	],
	yz: theta => [	
		[1, 0, 0],
		[0, Math.cos(theta), -Math.sin(theta)],
		[0, Math.sin(theta), Math.cos(theta)]
	]
});

const setup = () => {
	const canvas = createCanvas();
	const ctx = canvas.getContext("2d");
	document.body.appendChild(canvas);

	const points = generateCube(200);

	return [canvas, ctx, points];
};

const draw = (...args) => {
	const [canvas, ctx, points] = args;
	const width = canvas.width;
	const height = canvas.height;

	ctx.clearRect(-width / 2, -height / 2, width, height);
	ctx.fillStyle = "black";

	const projection = [];
	for (const point of points) {
		const pointMatrix = [[point.x], [point.y], [point.z]];
		const theta = window.performance.now() / 1000;
		let newPointMatrix = matrixMultiplication(Rotation.xy(theta), pointMatrix);
		newPointMatrix = matrixMultiplication(Rotation.xz(theta), newPointMatrix);
		newPointMatrix = matrixMultiplication(Rotation.yz(theta), newPointMatrix);
		const newPoint = Vector3D(newPointMatrix[0][0], newPointMatrix[1][0], newPointMatrix[2][0]);
		projection.push(newPoint);
	}

	for (const point of projection) {
		ctx.beginPath();
		ctx.arc(point.x, point.y, 3, 0, 2 * Math.PI, false);
		ctx.fill();
	}

	window.requestAnimationFrame(() => draw(...args));
};

(() => {
	const options = setup();
	draw(...options);
})();