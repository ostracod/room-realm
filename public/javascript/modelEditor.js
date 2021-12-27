
const canvasWidth = 300;
const canvasHeight = 200;
const canvasPixelScale = 1 / 2;
const walkSpeed = 5;
const controlModes = { camera: 1, panel: 2 };
let controlMode;
let selectedPanelIndex;
let canvas;
let context;
let modelBody;
let scene;

const setControlMode = (mode) => {
    controlMode = mode;
    const text = (controlMode === controlModes.camera) ? "Camera" : "Panel";
    document.getElementById("controlMode").innerHTML = text;
};

const controlLoc = (x, y, z) => {
    const locOffset = new Loc(x, y, z);
    if (controlMode === controlModes.camera) {
        moveCamera(locOffset);
    } else {
        
    }
};

const controlRot = (x, y) => {
    const anglesOffset = new RotAngles(x, y, 0);
    if (controlMode === controlModes.camera) {
        rotateCamera(anglesOffset);
    } else {
        
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

const rotateCamera = (anglesOffset) => {
    const angles = scene.cameraAngles.copy();
    angles.add(anglesOffset);
    angles.x = Math.max(-Math.PI / 2, Math.min(angles.x, Math.PI / 2));
    scene.setCameraAngles(angles);
    drawEverything();
};

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
        controlLoc(-walkSpeed, 0, 0);
    }
    // D.
    if (keyCode === 68) {
        controlLoc(walkSpeed, 0, 0);
    }
    // W.
    if (keyCode === 87) {
        controlLoc(0, 0, walkSpeed);
    }
    // S.
    if (keyCode === 83) {
        controlLoc(0, 0, -walkSpeed);
    }
    // E.
    if (keyCode === 69) {
        controlLoc(0, -walkSpeed, 0);
    }
    // C.
    if (keyCode === 67) {
        controlLoc(0, walkSpeed, 0);
    }
    // Left.
    if (keyCode === 37) {
        controlRot(0, -0.2);
        return false;
    }
    // Right.
    if (keyCode === 39) {
        controlRot(0, 0.2);
        return false;
    }
    // Up.
    if (keyCode === 38) {
        controlRot(0.2, 0);
        return false;
    }
    // Down.
    if (keyCode === 40) {
        controlRot(-0.2, 0);
        return false;
    }
    // Enter.
    if (keyCode === 13) {
        createPanel();
        return false;
    }
    // Backspace.
    if (keyCode == 8) {
        deletePanel();
        return false;
    }
    // Left bracket.
    if (keyCode == 219) {
        selectPanelByOffset(-1);
    }
    // Right bracket.
    if (keyCode == 221) {
        selectPanelByOffset(1);
    }
}

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
}


