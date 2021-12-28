
const canvasWidth = 300;
const canvasHeight = 200;
const canvasPixelScale = 1 / 2;
const controlModes = { camera: 1, panel: 2 };
let controlMode;
let selectedPanelIndex;
let canvas;
let context;
let modelBody;
let scene;
let shiftKeyIsHeld = false;

const getSelectedPanel = () => (
    (selectedPanelIndex === null) ? null : modelBody.panels[selectedPanelIndex]
);

const selectPanel = (index) => {
    selectedPanelIndex = index;
    const text = (index === null) ? "(None)" : selectedPanelIndex.toString();
    document.getElementById("selectedPanelIndex").innerHTML = text;
};

const selectPanelByOffset = (offset) => {
    const { panels } = modelBody;
    if (panels.length <= 0) {
        selectPanel(null);
        return;
    }
    const index = Math.max(0, Math.min(selectedPanelIndex + offset, panels.length - 1))
    selectPanel(index);
};

const setControlMode = (mode) => {
    controlMode = mode;
    const text = (controlMode === controlModes.camera) ? "Camera" : "Panel";
    document.getElementById("controlMode").innerHTML = text;
};

const controlLoc = (x, y, z) => {
    const locOffset = new Loc(x, y, z);
    if (controlMode === controlModes.camera) {
        const scaleValue = shiftKeyIsHeld ? 10 : 3;
        locOffset.scale(scaleValue);
        moveCamera(locOffset);
    } else {
        const scaleValue = shiftKeyIsHeld ? 5 : 1;
        locOffset.scale(scaleValue);
        movePanel(locOffset);
    }
};

const controlRot = (x, y, z) => {
    const anglesOffset = new RotAngles(x, y, z);
    if (controlMode === controlModes.camera) {
        anglesOffset.scale(Math.PI / 16);
        rotateCamera(anglesOffset);
    } else {
        anglesOffset.scale(Math.PI / 8);
        rotatePanel(anglesOffset);
    }
};

const moveCamera = (locOffset) => {
    const cosY = Math.cos(scene.cameraAngles.y);
    const sinY = Math.sin(scene.cameraAngles.y);
    const { cameraLoc } = scene;
    cameraLoc.x += locOffset.x * cosY + locOffset.z * sinY;
    cameraLoc.y += locOffset.y;
    cameraLoc.z += locOffset.x * -sinY + locOffset.z * cosY;
    drawEverything();
};

const movePanel = (locOffset) => {
    const panel = getSelectedPanel();
    if (panel === null) {
        return;
    }
    panel.loc.add(locOffset);
    drawEverything();
};

const rotateCamera = (anglesOffset) => {
    const angles = scene.cameraAngles.copy();
    angles.add(anglesOffset);
    angles.x = Math.max(-Math.PI / 2, Math.min(angles.x, Math.PI / 2));
    scene.setCameraAngles(angles);
    drawEverything();
};

const rotatePanel = (anglesOffset) => {
    const panel = getSelectedPanel();
    if (panel === null) {
        return;
    }
    const angles = panel.angles.copy();
    angles.add(anglesOffset);
    panel.setRotAngles(angles);
    drawEverything();
};

const createPanel = () => {
    const texture = new Texture(new Dim(16, 16), new Pos(0, 0), new Dim(16, 16));
    const panel = new Panel(new Loc(0, 0, 0), texture, new RotAngles(0, 0, 0));
    const { panels } = modelBody;
    selectPanel(panels.length);
    panels.push(panel);
    drawEverything();
};

const deletePanel = () => {
    if (selectedPanelIndex === null) {
        return;
    }
    const { panels } = modelBody;
    panels.splice(selectedPanelIndex, 1);
    const index = (panels.length > 0) ? panels.length - 1 : null;
    selectPanel(index);
    drawEverything();
};

const drawEverything = () => {
    clearImageData();
    scene.draw();
    drawImageData();
}

const keyDownEvent = (event) => {
    const keyCode = event.which;
    // Shift.
    if (keyCode === 16) {
        shiftKeyIsHeld = true;
    }
    // 1.
    if (keyCode === 49) {
        setControlMode(controlModes.camera);
    }
    // 2.
    if (keyCode === 50) {
        setControlMode(controlModes.panel);
    }
    // A.
    if (keyCode === 65) {
        controlLoc(-1, 0, 0);
    }
    // D.
    if (keyCode === 68) {
        controlLoc(1, 0, 0);
    }
    // W.
    if (keyCode === 87) {
        controlLoc(0, 0, 1);
    }
    // S.
    if (keyCode === 83) {
        controlLoc(0, 0, -1);
    }
    // E.
    if (keyCode === 69) {
        controlLoc(0, -1, 0);
    }
    // C.
    if (keyCode === 67) {
        controlLoc(0, 1, 0);
    }
    // Left.
    if (keyCode === 37) {
        controlRot(0, -1, 0);
        return false;
    }
    // Right.
    if (keyCode === 39) {
        controlRot(0, 1, 0);
        return false;
    }
    // Up.
    if (keyCode === 38) {
        controlRot(1, 0, 0);
        return false;
    }
    // Down.
    if (keyCode === 40) {
        controlRot(-1, 0, 0);
        return false;
    }
    // Comma.
    if (keyCode === 188) {
        controlRot(0, 0, -1);
    }
    // Period.
    if (keyCode === 190) {
        controlRot(0, 0, 1);
    }
    // Enter.
    if (keyCode === 13) {
        createPanel();
        return false;
    }
    // Backspace.
    if (keyCode === 8) {
        deletePanel();
        return false;
    }
    // Left bracket.
    if (keyCode === 219) {
        selectPanelByOffset(-1);
    }
    // Right bracket.
    if (keyCode === 221) {
        selectPanelByOffset(1);
    }
}

const keyUpEvent = (event) => {
    const keyCode = event.which;
    // Shift.
    if (keyCode === 16) {
        shiftKeyIsHeld = false;
    }
};

const initializePage = async () => {
    
    canvas = document.getElementById("canvas");
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    canvas.style.width = Math.round(canvasWidth / canvasPixelScale);
    canvas.style.height = Math.round(canvasHeight / canvasPixelScale);
    context = canvas.getContext("2d");
    
    await initializeGraphics();
    
    const zeroRot = createRotByAngles(0, 0, 0);
    const originTexture = new Texture(new Dim(2, 2), new Pos(0, 0), new Dim(2, 2));
    const originBody = new Body(new Loc(0, 0, 0), zeroRot, [
        new Panel(new Loc(-1, -1, -1), originTexture, new RotAngles(0, 0, 0)),
        new Panel(new Loc(-1, 1, 1), originTexture, new RotAngles(Math.PI, 0, 0)),
        new Panel(new Loc(-1, -1, 1), originTexture, new RotAngles(-Math.PI / 2, 0, 0)),
        new Panel(new Loc(-1, 1, -1), originTexture, new RotAngles(Math.PI / 2, 0, 0)),
        new Panel(new Loc(-1, -1, 1), originTexture, new RotAngles(0, Math.PI / 2, 0)),
        new Panel(new Loc(1, -1, -1), originTexture, new RotAngles(0, -Math.PI / 2, 0)),
    ]);
    modelBody = new Body(new Loc(0, 0, 0), zeroRot, []);
    scene = new Scene([originBody, modelBody]);
    scene.cameraLoc.z = -50;
    drawEverything();
    
    setControlMode(controlModes.camera);
    selectPanel(null);
    window.onkeydown = keyDownEvent;
    window.onkeyup = keyUpEvent;
}


