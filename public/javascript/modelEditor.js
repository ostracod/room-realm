
const canvasWidth = 300;
const canvasHeight = 200;
const canvasPixelScale = 1 / 2;
const walkSpeed = 10;
let canvas;
let context;
let testBody;
let testScene;
let testAngle = 0;
let isPaused = false;

const moveCamera = (x, y, z) => {
    const cosY = Math.cos(testScene.cameraAngleY);
    const sinY = Math.sin(testScene.cameraAngleY);
    const { cameraLoc } = testScene;
    cameraLoc.x += x * cosY + z * sinY;
    cameraLoc.y += y;
    cameraLoc.z += x * -sinY + z * cosY;
};

const rotateCamera = (x, y) => {
    let angleX = testScene.cameraAngleX + x;
    angleX = Math.max(-Math.PI / 2, Math.min(angleX, Math.PI / 2));
    const angleY = testScene.cameraAngleY + y;
    testScene.setCameraAngles(angleX, angleY);
};

const timerEvent = () => {
    if (isPaused) {
        return;
    }
    clearImageData();
    testBody.rot = createRotByAngles(testAngle / 4, testAngle / 2, testAngle);
    testAngle += 0.05;
    testScene.draw();
    drawImageData();
}

const keyDownEvent = (event) => {
    const keyCode = event.which;
    // A.
    if (keyCode === 65) {
        moveCamera(-walkSpeed, 0, 0);
    }
    // D.
    if (keyCode === 68) {
        moveCamera(walkSpeed, 0, 0);
    }
    // W.
    if (keyCode === 87) {
        moveCamera(0, 0, walkSpeed);
    }
    // S.
    if (keyCode === 83) {
        moveCamera(0, 0, -walkSpeed);
    }
    // E.
    if (keyCode === 69) {
        moveCamera(0, -walkSpeed, 0);
    }
    // C.
    if (keyCode === 67) {
        moveCamera(0, walkSpeed, 0);
    }
    // Left.
    if (keyCode === 37) {
        rotateCamera(0, -0.2);
        return false;
    }
    // Right.
    if (keyCode === 39) {
        rotateCamera(0, 0.2);
        return false;
    }
    // Up.
    if (keyCode === 38) {
        rotateCamera(0.2, 0);
        return false;
    }
    // Down.
    if (keyCode === 40) {
        rotateCamera(-0.2, 0);
        return false;
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
    
    const colorGrid = new ColorGrid(
        new Dim(100, 100),
        new Pos(0, 0),
        new Dim(50, 50),
        0.05,
    );
    testBody = new Body(new Loc(0, 0, 200), createRotByAngles(0, 0, 0), [
        new Panel(new Loc(-50, -50, -50), createRotByAngles(0, 0, 0), colorGrid),
        new Panel(new Loc(-50, 50, 50), createRotByAngles(Math.PI, 0, 0), colorGrid),
        new Panel(new Loc(-50, -50, 50), createRotByAngles(-Math.PI / 2, 0, 0), colorGrid),
        new Panel(new Loc(-50, 50, -50), createRotByAngles(Math.PI / 2, 0, 0), colorGrid),
        new Panel(new Loc(-50, -50, 50), createRotByAngles(0, Math.PI / 2, 0), colorGrid),
        new Panel(new Loc(50, -50, -50), createRotByAngles(0, -Math.PI / 2, 0), colorGrid),
    ]);
    testScene = new Scene([testBody]);
    
    setInterval(timerEvent, 50);
    window.onkeydown = keyDownEvent;
}


