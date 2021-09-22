import Matrix from "./matrix.js";

/**
 * Convert a point to a vertical matrix.
 * @param {number[]} point
 * @returns {number[][]}
 */
const toMatrix = (point) => {
	const pointMatrix = Matrix.init(point.length, 1);
	for (const j in pointMatrix) pointMatrix[j] = [point[j]];
	return pointMatrix;
};

const Point = { toMatrix };

export default Point;