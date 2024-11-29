import {buildEventTarget} from './lib/utils.js';

export const
    EVENT_MAZE_SHAPE_SELECTED = 'mazeShapeSelected',
    EVENT_SIZE_PARAMETER_CHANGED = 'mazeSizeParameterChanged',
    EVENT_DELAY_SELECTED = 'runModeSelected',
    EVENT_ALGORITHM_SELECTED = 'algorithmSelected',
    EVENT_GO_BUTTON_CLICKED = 'goButtonClicked',
    EVENT_SHOW_MAP_BUTTON_CLICKED = 'showDistanceMapButtonClicked',
    EVENT_CLEAR_MAP_BUTTON_CLICKED = 'clearDistanceMapButtonClicked',
    EVENT_CREATE_MASK_BUTTON_CLICKED = 'createMaskButtonClicked',
    EVENT_SAVE_MASK_BUTTON_CLICKED = 'saveMaskButtonClicked',
    EVENT_CLEAR_MASK_BUTTON_CLICKED = 'clearMaskButtonClicked',
    EVENT_FINISH_RUNNING_BUTTON_CLICKED = 'finishRunningButtonClicked',
    EVENT_CHANGE_PARAMS_BUTTON_CLICKED = 'changeParamsButtonClicked',
    EVENT_SOLVE_BUTTON_CLICKED = 'solveButtonClicked',
    EVENT_PLAY_BUTTON_CLICKED = 'playButtonClicked',
    EVENT_STOP_BUTTON_CLICKED = 'stopButtonClicked',
    EVENT_DOWNLOAD_CLICKED = 'downloadClicked',
    EVENT_KEY_PRESS = 'keyPress',
    EVENT_WINDOW_RESIZED = 'windowResized',
    EVENT_EXITS_SELECTED = 'exitsSelected';


import {STATE_INIT, STATE_DISPLAYING, STATE_PLAYING, STATE_MASKING, STATE_DISTANCE_MAPPING, STATE_RUNNING_ALGORITHM} from './stateMachine.js';

export function buildView(model, stateMachine) {
    "use strict";

    const eventTarget = buildEventTarget('view'),
        elCanvas = document.getElementById('maze'),
        elMazeContainer = document.getElementById('mazeContainer'),
        elGoButton = document.getElementById('go'),
        elShowDistanceMapButton = document.getElementById('showDistanceMap'),
        elClearDistanceMapButton = document.getElementById('clearDistanceMap'),
        elCreateMaskButton = document.getElementById('createMask'),
        elSaveMaskButton = document.getElementById('saveMask'),
        elClearMaskButton = document.getElementById('clearMask'),
        elFinishRunningButton = document.getElementById('finishRunning'),
        elSolveButton = document.getElementById('solve'),
        elPlayButton = document.getElementById('play'),
        elStopButton = document.getElementById('stop'),
        elChangeParamsButton = document.getElementById('changeParams'),
        elDownloadButton = document.getElementById('download'),
        elInfo = document.getElementById('info'),
        elSeedInput = document.getElementById('seedInput'),
        elSizeParameterList = document.getElementById('sizeParameters'),
        elSeedParameterList = document.getElementById('seedParameters'),
        elMazeShapeList = document.getElementById('shapeSelector'),
        elMazeAlgorithmList = document.getElementById('algorithmSelector'),
        elAlgorithmDelayList = document.getElementById('delaySelector'),
        elExitsList = document.getElementById('exitSelector'),
        elMobileTitle = document.getElementById('mobileTitle'),

        isMobileLayout = !! elMobileTitle.offsetParent;


    elGoButton.onclick = () => eventTarget.trigger(EVENT_GO_BUTTON_CLICKED);
    elShowDistanceMapButton.onclick = () => eventTarget.trigger(EVENT_SHOW_MAP_BUTTON_CLICKED);
    elClearDistanceMapButton.onclick = () => eventTarget.trigger(EVENT_CLEAR_MAP_BUTTON_CLICKED);
    elCreateMaskButton.onclick = () => eventTarget.trigger(EVENT_CREATE_MASK_BUTTON_CLICKED);
    elSaveMaskButton.onclick = () => eventTarget.trigger(EVENT_SAVE_MASK_BUTTON_CLICKED);
    elClearMaskButton.onclick = () => eventTarget.trigger(EVENT_CLEAR_MASK_BUTTON_CLICKED);
    elFinishRunningButton.onclick = () => eventTarget.trigger(EVENT_FINISH_RUNNING_BUTTON_CLICKED);
    elChangeParamsButton.onclick = () => eventTarget.trigger(EVENT_CHANGE_PARAMS_BUTTON_CLICKED);
    elSolveButton.onclick = () => eventTarget.trigger(EVENT_SOLVE_BUTTON_CLICKED);
    elPlayButton.onclick = () => eventTarget.trigger(EVENT_PLAY_BUTTON_CLICKED);
    elStopButton.onclick = () => eventTarget.trigger(EVENT_STOP_BUTTON_CLICKED);
    elDownloadButton.onclick = () => eventTarget.trigger(EVENT_DOWNLOAD_CLICKED);

    window.onkeydown = event => eventTarget.trigger(EVENT_KEY_PRESS, {keyCode: event.keyCode, alt: event.altKey, shift: event.shiftKey});

    function fitCanvasToContainer() {
        if (isMobileLayout) {
            elMazeContainer.style.height = `${elMazeContainer.clientWidth}px`;
        }

        elCanvas.width = elMazeContainer.clientWidth;
        elCanvas.height = elMazeContainer.clientHeight;
    }
    window.onresize = () => {
        fitCanvasToContainer();
        eventTarget.trigger(EVENT_WINDOW_RESIZED);
    };
    fitCanvasToContainer();

    function toggleElementVisibility(el, display) {
        el.style.display = display ? 'block' : 'none';
    }

    return {
        // Shape
        addShape(shapeName) {
            const elMazeShapeItem = document.createElement('li');
            elMazeShapeItem.innerHTML = shapeName;
            elMazeShapeItem.onclick = () => eventTarget.trigger(EVENT_MAZE_SHAPE_SELECTED, shapeName);
            elMazeShapeList.appendChild(elMazeShapeItem);
            elMazeShapeItem.dataset.value = shapeName;
        },
        setShape(shapeName) {
            [...elMazeShapeList.querySelectorAll('li')].forEach(el => {
                el.classList.toggle('selected', el.dataset.value === shapeName);
            });
        },

        // Size
        clearSizeParameters() {
            elSizeParameterList.innerHTML = '';
        },
        addSizeParameter(name, minimumValue, maximumValue) {
            const elParameterItem = document.createElement('li'),
                elParameterName = document.createElement('label'),
                elParameterValue = document.createElement('input');

            elParameterName.innerHTML = name;

            elParameterValue.setAttribute('type', 'number');
            elParameterValue.setAttribute('required', 'required');
            elParameterValue.setAttribute('min', minimumValue);
            elParameterValue.setAttribute('max', maximumValue);
            elParameterValue.oninput = () => eventTarget.trigger(EVENT_SIZE_PARAMETER_CHANGED, {
                name,
                value: Number(elParameterValue.value)
            });
            elParameterValue.dataset.value = name;

            elParameterItem.appendChild(elParameterName);
            elParameterItem.appendChild(elParameterValue);
            elSizeParameterList.appendChild(elParameterItem);
        },
        setSizeParameter(name, value) {
            const elParamInput = [...elSizeParameterList.querySelectorAll('input')].find(el => el.dataset.value === name);
            elParamInput.value = value;
        },

        // Exits
        addExitConfiguration(description, value) {
            const elExitsItem = document.createElement('li');
            elExitsItem.innerHTML = description;
            elExitsItem.onclick = () => eventTarget.trigger(EVENT_EXITS_SELECTED, value);
            elExitsList.appendChild(elExitsItem);
            elExitsItem.dataset.value = value;
        },
        setExitConfiguration(exitConfiguration) {
            [...elExitsList.querySelectorAll('li')].forEach(el => {
                el.classList.toggle('selected', el.dataset.value === exitConfiguration);
            });
        },

        // Algorithm Delay
        addAlgorithmDelay(description, value) {
            const elDelayItem = document.createElement('li');
            elDelayItem.innerHTML = description;
            elDelayItem.onclick = () => eventTarget.trigger(EVENT_DELAY_SELECTED, value);
            elAlgorithmDelayList.appendChild(elDelayItem);
            elDelayItem.dataset.value = value;
        },
        setAlgorithmDelay(algorithmDelay) {
            [...elAlgorithmDelayList.querySelectorAll('li')].forEach(el => {
                el.classList.toggle('selected', Number(el.dataset.value) === algorithmDelay);
            });
        },

        // Algorithm
        clearAlgorithms() {
            elMazeAlgorithmList.innerHTML = '';
        },
        addAlgorithm(description, algorithmId) {
            const elAlgorithmItem = document.createElement('li');
            elAlgorithmItem.innerHTML = description;
            elAlgorithmItem.onclick = () => eventTarget.trigger(EVENT_ALGORITHM_SELECTED, algorithmId);
            elMazeAlgorithmList.appendChild(elAlgorithmItem);
            elAlgorithmItem.dataset.value = algorithmId;
        },
        setAlgorithm(algorithmId) {
            [...elMazeAlgorithmList.querySelectorAll('li')].forEach(el => {
                el.classList.toggle('selected', el.dataset.value === algorithmId);
            });
        },

        toggleSolveButtonCaption(solve) {
            elSolveButton.innerHTML = solve ? 'Solve' : 'Clear Solution';
        },

        getSeed() {
            return elSeedInput.value;
        },

        getValidSizeParameters() {
            return [...elSizeParameterList.querySelectorAll('input')].filter(elInput => elInput.checkValidity()).map(el => el.dataset.value);
        },

        inputErrorMessage() {
            const errors = [];

            [...elSizeParameterList.querySelectorAll('input')].forEach(elInput => {
                if (!elInput.checkValidity()) {
                    errors.push(`Enter a number between ${elInput.min} and ${elInput.max} for ${elInput.dataset.value}`);
                }
            });

            if (!elSeedInput.checkValidity()) {
                errors.push('Enter between 1 and 9 digits for the Seed');
            }

            return errors.join('\n');
        },
        isMobileLayout,

        updateForNewState(state) {
            toggleElementVisibility(elMazeShapeList,      [STATE_INIT].includes(state));
            toggleElementVisibility(elMazeAlgorithmList,  [STATE_INIT].includes(state));
            toggleElementVisibility(elSizeParameterList,  [STATE_INIT].includes(state));
            toggleElementVisibility(elSeedParameterList,  [STATE_INIT].includes(state));
            toggleElementVisibility(elExitsList,          [STATE_INIT].includes(state));
            toggleElementVisibility(elAlgorithmDelayList, [STATE_INIT].includes(state));
            toggleElementVisibility(elCreateMaskButton,   [STATE_INIT].includes(state));

            toggleElementVisibility(elGoButton,           [STATE_INIT, STATE_DISPLAYING].includes(state));
            toggleElementVisibility(elDownloadButton,     [STATE_DISPLAYING, STATE_DISTANCE_MAPPING].includes(state));

            toggleElementVisibility(elChangeParamsButton,    [STATE_DISPLAYING].includes(state));
            toggleElementVisibility(elShowDistanceMapButton, [STATE_DISPLAYING].includes(state));
            toggleElementVisibility(elSolveButton,           [STATE_DISPLAYING].includes(state));
            toggleElementVisibility(elPlayButton,            [STATE_DISPLAYING].includes(state));
            toggleElementVisibility(elStopButton,            [STATE_PLAYING].includes(state));

            toggleElementVisibility(elClearDistanceMapButton, [STATE_DISTANCE_MAPPING].includes(state));

            toggleElementVisibility(elSaveMaskButton, [STATE_MASKING].includes(state));
            toggleElementVisibility(elClearMaskButton, [STATE_MASKING].includes(state));
            toggleElementVisibility(elFinishRunningButton, [STATE_RUNNING_ALGORITHM].includes(state));

            switch(state) {
                case STATE_INIT:
                    this.showInfo('Select parameters for your maze and then click <b>New Maze</b>');
                    break;
                case STATE_DISPLAYING:
                    this.showSeedValue();
                    this.toggleSolveButtonCaption(true);
                    break;
                case STATE_DISTANCE_MAPPING:
                    this.showInfo('Click somewhere in the maze to generate a distance map for that location.<br><br>Cells are coloured according to how difficult they are to reach from your chosen point.');
                    break;
                case STATE_PLAYING:
                    this.showInfo('');
                    break;
                case STATE_RUNNING_ALGORITHM:
                    this.showInfo('The maze generation algorithm has been slowed down.<br><br>Click FINISH to skip to the end.');
                    break;
                case STATE_MASKING:
                    this.showInfo('Define a mask by selecting cells from the grid.<br><br>Masked cells will not be included in your maze');
                    break;
                default:
                    console.assert(false, 'unexpected state value: ' + state);
            }
        },

        updateMaskButtonCaption(maskAvailable) {
            elCreateMaskButton.innerHTML = maskAvailable ? 'Edit Mask' : 'Create Mask';
        },

        showSeedValue() {
            this.showInfo(`Seed Value:<br><b>${model.randomSeed}</b>`);
        },
        showInfo(msg) {
            toggleElementVisibility(elInfo, msg);
            elInfo.innerHTML = msg;
        },
        setNavigationInstructions(instructions) {
            this.showInfo(instructions);
        },

        on(eventName, handler) {
            eventTarget.on(eventName, handler);
        }
    };
}