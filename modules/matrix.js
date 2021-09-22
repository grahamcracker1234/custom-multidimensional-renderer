/**
 * Factory function for a 2d array.
 * @param {number} rows - The number of rows.
 * @param {number} cols - The number of columns.
 * @param {number} [fillValue = 0] - The value for which to fill the matrix.
 * @returns {number[][]} 2d array filled with zeros.
 */
const init = (rows, cols, fillValue = 0) => {
	return Array(rows).fill().map(() => Array(cols).fill(fillValue));
};

/**
 * Multiplies two matrices together.
 * @param {number[][]} a
 * @param {number[][]} b
 * @returns {number[][]}
 */
const mul = (a, b) => {
	const [aRows, aCols] = [a.length, a[0].length];
	const [bRows, bCols] = [b.length, b[0].length];
	if (!Array.isArray(a) || !Array.isArray(b) || !aCols || !aRows || !bCols || !bRows)
		throw new Error("Arguments should be in 2-dimensional array format");
	if (aCols !== bRows)
		throw new Error("Number of columns in the first matrix should be the same as the number of rows in the second");

	const product = Matrix.init(aRows, bCols);
	for (let i = 0; i < aRows; i++)
		for (let j = 0; j < bCols; j++)
			for (let k = 0; k < aCols; k++)
				product[i][j] += a[i][k] * b[k][j];

	return product;
};

/**
 * Convert a vertical matrix to a point.
 * @param {number[][]} matrix
 * @returns {number[]}
 */
const toPoint = (matrix) => {
	return matrix.map(row => row[0]);
};

const Matrix = { init, mul, toPoint };

export default Matrix;