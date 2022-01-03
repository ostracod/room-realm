
const canvasWidth = 300;
const canvasHeight = 200;
const canvasPixelScale = 1 / 2;
const controlModes = { camera: 1, panel: 2 };
const panelTagItems = [
    {
        id: "panelLoc",
        get: (panel) => panel.loc.toJson(),
        parse: convertJsonToLoc,
    },
    {
        id: "panelAngles",
        get: (panel) => panel.angles.toJson(),
        parse: convertJsonToRotAngles,
    },
    {
        id: "panelDim",
        get: (panel) => panel.dim.toJson(),
        parse: convertJsonToDim,
    },
    {
        id: "drawBothSides",
        get: (panel) => panel.drawBothSides,
    },
    {
        id: "texturePos",
        get: (panel) => convertPosToJson(panel.texture.pos),
        parse: convertJsonToPos,
    },
    {
        id: "textureDim",
        get: (panel) => panel.texture.dim.toJson(),
        parse: convertJsonToDim,
    },
    {
        id: "textureNoise",
        get: (panel) => panel.texture.noise,
    },
    {
        id: "textureIsFlipped",
        get: (panel) => (
            (panel.texture instanceof ImageTexture) ? panel.texture.isFlipped : false
        ),
    },
    {
        id: "textureIsSwatch",
        get: (panel) => panel.texture instanceof SwatchTexture,
    },
];
let controlMode;
let selectedPanelIndex;
let canvas;
let context;
let modelBody;
let scene;
let shiftKeyIsHeld = false;
let canvasIsFocused = true;

const getSelectedPanel = () => (
    (selectedPanelIndex === null) ? null : modelBody.panels[selectedPanelIndex]
);

const displayPanelAttributes = () => {
    const panel = getSelectedPanel();
    if (panel === null) {
        panelTagItems.forEach((tagItem) => {
            document.getElementById(tagItem.id).value = "";
        });
        return;
    }
    panelTagItems.forEach((tagItem) => {
        const value = tagItem.get(panel);
        const tag = document.getElementById(tagItem.id);
        if (tag.type === "checkbox") {
            tag.checked = value;
        } else {
            tag.value = JSON.stringify(value);
        }
    });
};

const selectPanel = (index) => {
    if (index !== null && (index < 0 || index >= modelBody.panels.length)) {
        selectedPanelIndex = null;
    } else {
        selectedPanelIndex = index;
    }
    const text = (selectedPanelIndex === null) ? "(None)" : selectedPanelIndex.toString();
    document.getElementById("selectedPanelIndex").innerHTML = text;
    displayPanelAttributes();
};

const selectPanelByOffset = (offset) => {
    const { panels } = modelBody;
    if (panels.length <= 0) {
        selectPanel(null);
        return;
    }
    let index = (selectedPanelIndex === null) ? 0 : selectedPanelIndex;
    index = Math.max(0, Math.min(index + offset, panels.length - 1));
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
    displayPanelAttributes();
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
    modelBody.initializeShade(panel);
    drawEverything();
    displayPanelAttributes();
};

const addPanel = (panel) => {
    const { panels } = modelBody;
    modelBody.addPanel(panel);
    selectPanel(modelBody.panels.length - 1);
    drawEverything();
};

const createPanel = () => {
    const dim = new Dim(16, 16);
    const texture = new ImageTexture(new Pos(0, 16), dim);
    const panel = new Panel(new Loc(0, 0, 0), dim.copy(), texture, new RotAngles(0, 0, 0));
    addPanel(panel);
};

const duplicatePanel = () => {
    const panel = getSelectedPanel();
    if (panel === null) {
        return;
    }
    const panelCopy = panel.copy();
    addPanel(panelCopy);
};

const deletePanel = () => {
    if (selectedPanelIndex === null) {
        return;
    }
    const { panels } = modelBody;
    panels.splice(selectedPanelIndex, 1);
    selectPanel(panels.length - 1);
    drawEverything();
};

const drawEverything = () => {
    clearImageData();
    scene.draw();
    drawImageData();
}

const readModelData = () => {
    const data = modelBody.panels.map((panel) => panel.toJson());
    document.getElementById("modelData").value = JSON.stringify(data);
};

const writeModelData = () => {
    const data = JSON.parse(document.getElementById("modelData").value);
    modelBody.panels = [];
    data.forEach((panelData) => {
        const panel = convertJsonToPanel(panelData);
        modelBody.addPanel(panel);
    });
    selectPanel(0);
    drawEverything();
};

const clearModelData = () => {
    modelBody.panels = [];
    selectPanel(0);
    drawEverything();
};

const keyDownEvent = (event) => {
    const keyCode = event.which;
    // Shift.
    if (keyCode === 16) {
        shiftKeyIsHeld = true;
    }
    if (!canvasIsFocused) {
        return true;
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
    // V.
    if (keyCode === 86) {
        duplicatePanel();
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

const panelInputChangeEvent = () => {
    const panel = getSelectedPanel();
    if (panel === null) {
        return;
    }
    const valueMap = {};
    for (const tagItem of panelTagItems) {
        const { id, parse } = tagItem;
        const tag = document.getElementById(id);
        let data;
        if (tag.type === "checkbox") {
            data = tag.checked;
        } else {
            try {
                data = JSON.parse(tag.value);
            } catch(error) {
                alert(`Invalid JSON for ${id}!`);
                return;
            }
        }
        valueMap[id] = (typeof parse === "undefined") ? data : parse(data);
    }
    panel.loc = valueMap.panelLoc;
    panel.setRotAngles(valueMap.panelAngles);
    panel.dim = valueMap.panelDim;
    panel.setDrawBothSides(valueMap.drawBothSides);
    const { texturePos, textureDim, textureNoise } = valueMap;
    let texture;
    if (valueMap.textureIsSwatch) {
        texture = new SwatchTexture(texturePos, textureDim, textureNoise);
    } else {
        texture = new ImageTexture(
            texturePos,
            textureDim,
            textureNoise,
            valueMap.textureIsFlipped,
        );
    }
    panel.texture = texture;
    modelBody.initializeShade(panel);
    drawEverything();
};

const initializePage = async () => {
    
    canvas = document.getElementById("canvas");
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    canvas.style.width = Math.round(canvasWidth / canvasPixelScale);
    canvas.style.height = Math.round(canvasHeight / canvasPixelScale);
    canvas.onclick = () => {
        canvasIsFocused = true;
    }
    context = canvas.getContext("2d");
    
    await initializeGraphics();
    
    const zeroRot = createRotByAngles(0, 0, 0);
    const originDim = new Dim(2, 2);
    const originTexture = new SwatchTexture(new Pos(0, 0), new Dim(2, 2));
    const originPanels = [
        [new Loc(-1, -1, -1), new RotAngles(0, 0, 0)],
        [new Loc(-1, 1, 1), new RotAngles(Math.PI, 0, 0)],
        [new Loc(-1, -1, 1), new RotAngles(-Math.PI / 2, 0, 0)],
        [new Loc(-1, 1, -1), new RotAngles(Math.PI / 2, 0, 0)],
        [new Loc(-1, -1, 1), new RotAngles(0, Math.PI / 2, 0)],
        [new Loc(1, -1, -1), new RotAngles(0, -Math.PI / 2, 0)],
    
    ].map((locAndAngles) => (
        new Panel(locAndAngles[0], originDim, originTexture.copy(), locAndAngles[1])
    ));
    const originBody = new Body(new Loc(0, 0, 0), zeroRot, originPanels);
    originBody.initializeShades();
    modelBody = new Body(new Loc(0, 0, 0), zeroRot, []);
    scene = new Scene([originBody, modelBody]);
    scene.cameraLoc.z = -50;
    drawEverything();
    
    panelTagItems.forEach((tagItem) => {
        const tag = document.getElementById(tagItem.id);
        tag.onfocus = () => {
            canvasIsFocused = false;
        }
        tag.onchange = panelInputChangeEvent;
    });
    document.getElementById("modelData").onfocus = () => {
        canvasIsFocused = false;
    };
    setControlMode(controlModes.camera);
    selectPanel(null);
    window.onkeydown = keyDownEvent;
    window.onkeyup = keyUpEvent;
}


