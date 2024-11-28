import {buildSquareGrid, buildTriangularGrid, buildHexagonalGrid, buildCircularGrid} from './maze.js';

import {
    SHAPE_SQUARE, SHAPE_TRIANGLE, SHAPE_HEXAGON, SHAPE_CIRCLE
} from './constants.js';

export const shapes = {
    [SHAPE_SQUARE]: {
        build: buildSquareGrid
    },
    [SHAPE_TRIANGLE]: {
        build: buildTriangularGrid
    },
    [SHAPE_HEXAGON]: {
        build: buildHexagonalGrid
    },
    [SHAPE_CIRCLE]: {
        build: buildCircularGrid
    }
};