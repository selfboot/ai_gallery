import {buildModel} from './model.js';
import {buildView} from './view.js';
import {buildMaze} from './lib/main.js';
import {buildStateMachine, STATE_INIT, STATE_DISPLAYING, STATE_PLAYING, STATE_MASKING, STATE_DISTANCE_MAPPING, STATE_RUNNING_ALGORITHM} from './stateMachine.js';
import {shapes} from './lib/shapes.js';
import {drawingSurfaces} from './lib/drawingSurfaces.js';
import {
    EVENT_MAZE_SHAPE_SELECTED, EVENT_SIZE_PARAMETER_CHANGED, EVENT_ALGORITHM_SELECTED, EVENT_GO_BUTTON_CLICKED, EVENT_WINDOW_RESIZED,
    EVENT_SHOW_MAP_BUTTON_CLICKED, EVENT_CLEAR_MAP_BUTTON_CLICKED, EVENT_CREATE_MASK_BUTTON_CLICKED,
    EVENT_SAVE_MASK_BUTTON_CLICKED, EVENT_CLEAR_MASK_BUTTON_CLICKED, EVENT_FINISH_RUNNING_BUTTON_CLICKED, EVENT_DELAY_SELECTED,
    EVENT_CHANGE_PARAMS_BUTTON_CLICKED, EVENT_EXITS_SELECTED, EVENT_SOLVE_BUTTON_CLICKED, EVENT_PLAY_BUTTON_CLICKED, EVENT_STOP_BUTTON_CLICKED,
    EVENT_KEY_PRESS, EVENT_DOWNLOAD_CLICKED
} from './view.js';
import {config} from './config.js';
import {algorithms} from './lib/algorithms.js';
import {buildRandom} from './lib/random.js';
import {
    ALGORITHM_NONE, METADATA_MASKED, METADATA_END_CELL, METADATA_START_CELL, EVENT_CLICK, EXITS_NONE, EXITS_HARDEST, EXITS_HORIZONTAL, EXITS_VERTICAL,
    METADATA_PLAYER_CURRENT, METADATA_PLAYER_VISITED, METADATA_PATH, METADATA_VISITED,
    DIRECTION_NORTH, DIRECTION_SOUTH, DIRECTION_EAST, DIRECTION_WEST, DIRECTION_NORTH_WEST, DIRECTION_NORTH_EAST, DIRECTION_SOUTH_WEST, DIRECTION_SOUTH_EAST,
    DIRECTION_CLOCKWISE, DIRECTION_ANTICLOCKWISE, DIRECTION_INWARDS, DIRECTION_OUTWARDS,
    SHAPE_SQUARE, SHAPE_TRIANGLE, SHAPE_HEXAGON, SHAPE_CIRCLE
} from './lib/constants.js';

window.onload = () => {
    "use strict";
    const model = buildModel(),
        stateMachine = buildStateMachine(),
        view = buildView(model, stateMachine);

    function isMaskAvailableForCurrentConfig() {
        const currentMask = model.mask[getModelMaskKey()];
        return currentMask && currentMask.length;
    }

    function setupShapeParameter() {
        Object.keys(shapes).forEach(name => {
            view.addShape(name);
        });

        function onShapeSelected(shapeName) {
            view.setShape(model.shape = shapeName);
            view.updateMaskButtonCaption(isMaskAvailableForCurrentConfig());
        }
        onShapeSelected(model.shape);

        view.on(EVENT_MAZE_SHAPE_SELECTED, shapeName => {
            onShapeSelected(shapeName);
            setupSizeParameters();
            setupAlgorithms();
            showEmptyGrid(true);
        });
    }

    function setupSizeParameters() {
        const shape = model.shape,
            parameters = config.shapes[shape].parameters;

        model.size = {};
        view.clearSizeParameters();

        Object.entries(parameters).forEach(([paramName, paramValues]) => {
            view.addSizeParameter(paramName, paramValues.min, paramValues.max);
        });

        function onParameterChanged(name, value) {
            model.size[name] = value;
            view.setSizeParameter(name, value);
            view.updateMaskButtonCaption(isMaskAvailableForCurrentConfig());
        }
        Object.entries(parameters).forEach(([paramName, paramValues]) => {
            onParameterChanged(paramName, paramValues.initial);
        });

        view.on(EVENT_SIZE_PARAMETER_CHANGED, data => {
            if (view.getValidSizeParameters().includes(data.name)) {
                onParameterChanged(data.name, data.value);
                showEmptyGrid(true);
                setupAlgorithms();
            }
        });
    }

    function setupAlgorithms() {
        const shape = model.shape;

        view.clearAlgorithms();

        Object.entries(algorithms).filter(([algorithmId, algorithm]) => algorithmId !== ALGORITHM_NONE).forEach(([algorithmId, algorithm]) => {
            if (algorithm.metadata.shapes.includes(shape) && (algorithm.metadata.maskable || !isMaskAvailableForCurrentConfig())) {
                view.addAlgorithm(algorithm.metadata.description, algorithmId);
            }
        });

        function onAlgorithmChanged(algorithmId) {
            view.setAlgorithm(model.algorithm = algorithmId);
        }
        onAlgorithmChanged(config.shapes[shape].defaultAlgorithm);

        view.on(EVENT_ALGORITHM_SELECTED, onAlgorithmChanged);
    }

    function setupAlgorithmDelay() {
        view.addAlgorithmDelay('Instant Mazes', 0);
        view.addAlgorithmDelay('Show Algorithm Steps', 5000);

        view.on(EVENT_DELAY_SELECTED, algorithmDelay => {
            model.algorithmDelay = algorithmDelay;
            view.setAlgorithmDelay(algorithmDelay);
        });
        view.setAlgorithmDelay(model.algorithmDelay);
    }

    function setupExitConfigs() {
        view.addExitConfiguration('No Entrance/Exit', EXITS_NONE);
        view.addExitConfiguration('Bottom to Top', EXITS_VERTICAL);
        view.addExitConfiguration('Left to Right', EXITS_HORIZONTAL);
        view.addExitConfiguration('Hardest Entrance/Exit', EXITS_HARDEST);

        view.on(EVENT_EXITS_SELECTED, exitConfig => {
            view.setExitConfiguration(model.exitConfig = exitConfig);
        });
        view.setExitConfiguration(model.exitConfig);
    }

    setupShapeParameter();
    setupSizeParameters();
    setupExitConfigs();
    setupAlgorithmDelay();
    setupAlgorithms();
    showEmptyGrid(true);

    function buildMazeUsingModel(overrides={}) {
        if (model.maze) {
            model.maze.dispose();
        }

        const grid = Object.assign({'cellShape': model.shape}, model.size),
            maze = buildMaze({
                grid,
                'algorithm':  overrides.algorithm || model.algorithm,
                'randomSeed' : model.randomSeed,
                'element': overrides.element || document.getElementById('maze'),
                'mask': overrides.mask || model.mask[getModelMaskKey()],
                'exitConfig': overrides.exitConfig || model.exitConfig
            });

        model.maze = maze;

        maze.on(EVENT_CLICK, ifStateIs(STATE_DISTANCE_MAPPING).then(event => {
            maze.findDistancesFrom(...event.coords);
            maze.render();
        }));

        maze.on(EVENT_CLICK, ifStateIs(STATE_MASKING).then(event => {
            const cell = maze.getCellByCoordinates(event.coords);
            cell.metadata[METADATA_MASKED] = !cell.metadata[METADATA_MASKED];
            maze.render();
        }));

        maze.on(EVENT_CLICK, ifStateIs(STATE_PLAYING).then(event => {
            const currentCell = model.playState.currentCell,
                direction = maze.getClosestDirectionForClick(currentCell, event);
            navigate(direction, event.shift || view.isMobileLayout, event.alt || view.isMobileLayout);
            maze.render();
        }));

        const algorithmDelay = overrides.algorithmDelay !== undefined ? overrides.algorithmDelay : model.algorithmDelay,
            runAlgorithm = maze.runAlgorithm;
        if (algorithmDelay) {
            model.runningAlgorithm = {run: runAlgorithm};
            return new Promise(resolve => {
                stateMachine.runningAlgorithm();
                model.runningAlgorithm.interval = setInterval(() => {
                    const done = runAlgorithm.oneStep();
                    maze.render();
                    if (done) {
                        clearInterval(model.runningAlgorithm.interval);
                        delete model.runningAlgorithm;
                        stateMachine.displaying();
                        resolve();
                    }
                }, algorithmDelay/maze.cellCount);
            });

        } else {
            runAlgorithm.toCompletion();
            maze.render();
            return Promise.resolve();
        }

    }

    function showEmptyGrid(deleteMaskedCells) {
        buildMazeUsingModel({algorithmDelay: 0, exitConfig: EXITS_NONE, algorithm: ALGORITHM_NONE, mask: deleteMaskedCells ? model.mask[getModelMaskKey()] : []})
            .then(() => model.maze.render());
    }

    function ifStateIs(...states) {
        return {
            then(handler) {
                return event => {
                    if (states.includes(stateMachine.state)) {
                        handler(event);
                    }
                };
            }
        }
    }

    view.on(EVENT_GO_BUTTON_CLICKED, () => {
        model.randomSeed = Number(view.getSeed() || buildRandom().int(Math.pow(10,9)));
        view.showSeedValue();

        const errors = view.inputErrorMessage();
        if (errors) {
            alert(errors);
        } else {
            buildMazeUsingModel().then(() => {
                view.toggleSolveButtonCaption(true);
                model.maze.render();
                stateMachine.displaying();
            });
        }
    });
    view.on(EVENT_SHOW_MAP_BUTTON_CLICKED, () => {
        stateMachine.distanceMapping();
        const [startCell, _1] = findStartAndEndCells(),
            coords = (startCell || model.maze.randomCell()).coords;
        model.maze.findDistancesFrom(...coords);
        model.maze.render();
    });
    view.on(EVENT_CLEAR_MAP_BUTTON_CLICKED, () => {
        stateMachine.displaying();
        model.maze.clearDistances();
        model.maze.render();
    });

    view.on(EVENT_FINISH_RUNNING_BUTTON_CLICKED, () => {
        clearInterval(model.runningAlgorithm.interval);
        model.runningAlgorithm.run.toCompletion();
        delete model.runningAlgorithm;
        stateMachine.displaying();
        model.maze.render();
    });

    stateMachine.onStateChange(newState => {
        view.updateForNewState(newState);
    });
    view.updateForNewState(stateMachine.state);

    function getModelMaskKey() {
        if (model.shape && model.size) {
            return `${model.shape}-${Object.values(model.size).join('-')}`;
        }
    }

    view.on(EVENT_CREATE_MASK_BUTTON_CLICKED, () => {
        stateMachine.masking();
        showEmptyGrid(false);
        (model.mask[getModelMaskKey()] || []).forEach(maskedCoords => {
            const cell = model.maze.getCellByCoordinates(maskedCoords);
            cell.metadata[METADATA_MASKED] = true;
        });
        model.maze.render();
    });

    function validateMask() {
        const isNotMasked = cell => !cell.metadata[METADATA_MASKED],
            startCell = model.maze.randomCell(isNotMasked);
        let unmaskedCellCount = 0;

        model.maze.forEachCell(cell => {
            if (isNotMasked(cell)) {
                unmaskedCellCount++;
            }
        });
        if (!startCell) {
            throw 'No unmasked cells remain';
        }
        if (unmaskedCellCount < 4) {
            throw 'Not enough unmasked cells to build a maze';
        }

        function countUnmasked(cell) {
            cell.metadata[METADATA_VISITED] = true;
            let count = 1;
            cell.neighbours.toArray(isNotMasked).forEach(neighbourCell => {
                if (!neighbourCell.metadata[METADATA_VISITED]) {
                    count += countUnmasked(neighbourCell);
                }
            });
            return count;
        }

        model.maze.forEachCell(cell => {
            delete cell.metadata[METADATA_VISITED];
        });

        if (unmaskedCellCount !== countUnmasked(startCell)) {
            throw 'Your mask has cut off one or more cells so they are not reachable from the rest of the maze.';
        }

        if (model.shape === SHAPE_CIRCLE && model.maze.getCellByCoordinates(0,0).metadata[METADATA_MASKED]) {
            throw 'You can\'t mask out the centre of a circular maze';
        }
    }

    view.on(EVENT_SAVE_MASK_BUTTON_CLICKED, () => {
        try {
            validateMask();
            stateMachine.init();
            const mask = model.mask[getModelMaskKey()] = [];
            model.maze.forEachCell(cell => {
                if (cell.metadata[METADATA_MASKED]) {
                    mask.push(cell.coords);
                }
            });
            showEmptyGrid(true);
            setupAlgorithms();
            view.updateMaskButtonCaption(isMaskAvailableForCurrentConfig());
        } catch (err) {
            alert(err);
        }
    });

    view.on(EVENT_CLEAR_MASK_BUTTON_CLICKED, () => {
        model.maze.forEachCell(cell => {
            delete cell.metadata[METADATA_MASKED];
        });
        model.maze.render();
    });

    view.on(EVENT_WINDOW_RESIZED, () => {
        model.maze.render();
    });

    view.on(EVENT_CHANGE_PARAMS_BUTTON_CLICKED, () => {
        showEmptyGrid(true);
        stateMachine.init();
    });

    function findStartAndEndCells() {
        let startCell, endCell;
        model.maze.forEachCell(cell => {
            if (cell.metadata[METADATA_START_CELL]) {
                startCell = cell;
            }
            if (cell.metadata[METADATA_END_CELL]) {
                endCell = cell;
            }
        });
        return [startCell, endCell];
    }
    view.on(EVENT_SOLVE_BUTTON_CLICKED, () => {
        const [startCell, endCell] = findStartAndEndCells();
        if (!(startCell && endCell)) {
            alert('You must generate a maze with exits in order to solve');
            return;
        }
        if (model.maze.metadata[METADATA_PATH]) {
            model.maze.clearPathAndSolution();
            view.toggleSolveButtonCaption(true);
        } else {
            const [startCell, endCell] = findStartAndEndCells();
            console.assert(startCell);
            console.assert(endCell);
            model.maze.findPathBetween(startCell.coords, endCell.coords);
            view.toggleSolveButtonCaption(false);
        }
        model.maze.render();
    });

    function getNavigationInstructions() {
        const isMobile = view.isMobileLayout,
            MOBILE_INSTRUCTIONS = 'Tap to move through the maze to the next junction',
            MOUSE_INSTRUCTIONS = 'Click to move through the maze',
            ALT_SHIFT_INSTRUCTIONS = 'Holding down <b>SHIFT</b> will move you as far as possible in one direction<br><br>Holding down <b>ALT</b> and <b>SHIFT</b> will move you to the next junction';

        if (isMobile) {
            return MOBILE_INSTRUCTIONS;
        }

        return {
            [SHAPE_SQUARE]:   `${MOUSE_INSTRUCTIONS} or use the arrow keys<br><br>${ALT_SHIFT_INSTRUCTIONS}`,
            [SHAPE_TRIANGLE]: `${MOUSE_INSTRUCTIONS} or use the arrow keys<br><br>${ALT_SHIFT_INSTRUCTIONS}`,
            [SHAPE_HEXAGON]:  `${MOUSE_INSTRUCTIONS}<br><br>${ALT_SHIFT_INSTRUCTIONS}`,
            [SHAPE_CIRCLE]:   `${MOUSE_INSTRUCTIONS}<br><br>${ALT_SHIFT_INSTRUCTIONS}`
        }[model.shape];
    }

    view.on(EVENT_PLAY_BUTTON_CLICKED, () => {
        const [startCell, endCell] = findStartAndEndCells();
        if (!(startCell && endCell)) {
            alert('You must generate a maze with exits in order to play');
            return;
        }
        model.maze.clearPathAndSolution();
        model.playState = {startCell, endCell, currentCell: startCell, startTime: Date.now()};
        startCell.metadata[METADATA_PLAYER_CURRENT] = true;
        startCell.metadata[METADATA_PLAYER_VISITED] = true;
        model.maze.render();
        stateMachine.playing();
        view.setNavigationInstructions(getNavigationInstructions());
    });

    view.on(EVENT_STOP_BUTTON_CLICKED, () => {
        model.maze.clearMetadata(METADATA_PLAYER_CURRENT, METADATA_PLAYER_VISITED);
        model.maze.render();
        stateMachine.displaying();
    });

    const keyCodeToDirection = {
        38: DIRECTION_NORTH,
        40: DIRECTION_SOUTH,
        39: DIRECTION_EAST,
        37: DIRECTION_WEST,
        65: DIRECTION_NORTH_WEST, // A
        83: DIRECTION_NORTH_EAST, // S
        90: DIRECTION_SOUTH_WEST, // Z
        88: DIRECTION_SOUTH_EAST, // X
        81: DIRECTION_CLOCKWISE,  // Q
        87: DIRECTION_ANTICLOCKWISE, // W
        80: DIRECTION_INWARDS, // P
        76: `${DIRECTION_OUTWARDS}_1`, // L
        186: `${DIRECTION_OUTWARDS}_0` // ;
    };

    function padNum(num) {
        return num < 10 ? '0' + num : num;
    }
    function formatTime(millis) {
        const hours = Math.floor(millis / (1000 * 60 * 60)),
            minutes = Math.floor((millis % (1000 * 60 * 60)) / (1000 * 60)),
            seconds = Math.floor((millis % (1000 * 60)) / 1000);

        return `${padNum(hours)}:${padNum(minutes)}:${padNum(seconds)}`;
    }

    function onMazeCompleted() {
        const timeMs = Date.now() - model.playState.startTime,
            time = formatTime(timeMs),
            {startCell, endCell} = model.playState;

        model.playState.finished = true;

        model.maze.findPathBetween(startCell.coords, endCell.coords);
        const optimalPathLength = model.maze.metadata[METADATA_PATH].length;
        delete model.maze.metadata[METADATA_PATH];

        let visitedCells = 0;
        model.maze.forEachCell(cell => {
            if (cell.metadata[METADATA_PLAYER_VISITED]) {
                visitedCells++;
            }
        });

        const cellsPerSecond = visitedCells / (timeMs / 1000);
        model.maze.render();
        stateMachine.displaying();
        view.showInfo(`
            Finish Time: ${time}<br>
            Visited Cells: ${visitedCells}<br>
            Optimal Route: ${optimalPathLength}<br><br>
            Optimality: <em>${Math.floor(100 * optimalPathLength / visitedCells)}%</em><br>
            Cells per Second: <em>${Math.round(cellsPerSecond)}</em>
        `);
    }

    function navigate(direction, shift, alt) {
        while (true) {
            const currentCell = model.playState.currentCell,
                targetCell = currentCell.neighbours[direction],
                moveOk = targetCell && targetCell.isLinkedTo(currentCell);

            if (moveOk) {
                delete currentCell.metadata[METADATA_PLAYER_CURRENT];
                targetCell.metadata[METADATA_PLAYER_VISITED] = true;
                targetCell.metadata[METADATA_PLAYER_CURRENT] = true;
                model.playState.previousCell = currentCell;
                model.playState.currentCell = targetCell;

                if (targetCell.metadata[METADATA_END_CELL]) {
                    onMazeCompleted();
                }

                if (model.playState.finished) {
                    break;
                } else if (!shift) {
                    break;
                } else if (alt) {
                    const linkedDirections = targetCell.neighbours.linkedDirections();
                    if (linkedDirections.length === 2) {
                        direction = linkedDirections.find(neighbourDirection => targetCell.neighbours[neighbourDirection] !== model.playState.previousCell);
                    } else {
                        break;
                    }
                }

            } else {
                break;
            }
        }
    }

    view.on(EVENT_KEY_PRESS, ifStateIs(STATE_PLAYING).then(event => {
        const {keyCode, shift, alt} = event,
            direction = keyCodeToDirection[keyCode];

        navigate(direction, shift, alt);

        model.maze.render();
    }));

    view.on(EVENT_DOWNLOAD_CLICKED, () => {
        function saveSvg(svgEl, name) {
            const svgData = svgEl.outerHTML,
                prolog = '<?xml version="1.0" standalone="no"?>',
                blob = new Blob([prolog, svgData], {type: 'image/svg+xml;charset=utf-8'}),
                blobAsUrl = URL.createObjectURL(blob),
                downloadLink = document.createElement('a');
            downloadLink.href = blobAsUrl;
            downloadLink.download = name;
            downloadLink.click();
        }

        const SVG_SIZE = 500,
            elSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        elSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        elSvg.setAttribute('width', SVG_SIZE);
        elSvg.setAttribute('height', SVG_SIZE);

        const svgDrawingSurface = drawingSurfaces.svg({el: elSvg}),
            fileName = `maze_${model.shape}_${Object.values(model.size).join('_')}_${model.randomSeed}.svg`;
        model.maze.render(svgDrawingSurface);
        saveSvg(elSvg, fileName);
    });
};