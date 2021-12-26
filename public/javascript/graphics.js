
const canvasOffsetScale = 100;
const textureSheetSize = 100;
let canvasCenter;
let imageData;
let imageDataList;
let depthArray;
let textureSheetImage;
let textureSheetCanvas;
let textureSheetContext;
let textureSheetImageData;
let textureSheetImageDataList;

class Loc {
    
    constructor(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
    }
    
    copy() {
        return new Loc(this.x, this.y, this.z);
    }
    
    getCoord(index) {
        if (index === 0) {
            return this.x;
        } else if (index === 1) {
            return this.y;
        } else if (index === 2) {
            return this.z;
        }
        throw new Error("Invalid Loc coordinate index.");
    }
    
    add(loc) {
        this.x += loc.x;
        this.y += loc.y;
        this.z += loc.z;
    }
    
    subtract(loc) {
        this.x -= loc.x;
        this.y -= loc.y;
        this.z -= loc.z;
    }
    
    invert() {
        this.x = -this.x;
        this.y = -this.y;
        this.z = -this.z;
    }
    
    dotProduct(loc) {
        return this.x * loc.x + this.y * loc.y + this.z * loc.z;
    }
}

class Rot {
    
    // matrix is an array of 9 numbers.
    constructor(matrix) {
        this.matrix = matrix;
    }
    
    getMinor(x, y) {
        const x1 = (x === 0) ? 1 : 0;
        const x2 = (x === 2) ? 1 : 2;
        const y1 = (y === 0) ? 1 : 0;
        const y2 = (y === 2) ? 1 : 2;
        const value1 = this.matrix[x1 + y1 * 3];
        const value2 = this.matrix[x2 + y1 * 3];
        const value3 = this.matrix[x1 + y2 * 3];
        const value4 = this.matrix[x2 + y2 * 3];
        return value1 * value4 - value2 * value3;
    }
    
    getDeterminant() {
        return this.matrix[0] * this.getMinor(0, 0)
            - this.matrix[1] * this.getMinor(1, 0)
            + this.matrix[2] * this.getMinor(2, 0);
    }
    
    invert() {
        const cofactors = [];
        for (let y = 0; y < 3; y++) {
            for (let x = 0; x < 3; x++) {
                const minor = this.getMinor(x, y);
                const sign = ((x % 2 === 1) !== (y % 2 === 1)) ? -1 : 1;
                cofactors.push(sign * minor);
            }
        }
        const invertedMatrix = transposeRotMatrix(cofactors);
        const determinant = this.getDeterminant();
        for (let index = 0; index < invertedMatrix.length; index++) {
            invertedMatrix[index] /= determinant;
        }
        return new Rot(invertedMatrix);
    }
    
    rotateLoc(loc) {
        const coords = [];
        // index1 is a coordinate index in the output Loc.
        for (let index1 = 0; index1 < 3; index1++) {
            let sum = 0;
            // index2 is a coordinate index in the argument Loc.
            for (let index2 = 0; index2 < 3; index2++) {
                sum += this.matrix[index2 + index1 * 3] * loc.getCoord(index2);
            }
            coords.push(sum);
        }
        return new Loc(...coords);
    }
    
    rotateRot(rot) {
        const matrix = [];
        for (let posY = 0; posY < 3; posY++) {
            for (let posX = 0; posX < 3; posX++) {
                let sum = 0;
                for (let index = 0; index < 3; index++) {
                    sum += this.matrix[index + posY * 3] * rot.matrix[posX + index * 3];
                }
                matrix.push(sum);
            }
        }
        return new Rot(matrix);
    }
}

class ColorGrid {
    
    constructor(width, height, colors) {
        this.width = width;
        this.height = height;
        this.colors = colors;
    }
    
    getColor(pos) {
        const x = Math.floor(pos.x);
        const y = Math.floor(pos.y);
        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
            return this.colors[x + y * this.width];
        } else {
            return null
        }
    }
}

class Panel {
    
    constructor(loc, rot, colorGrid, drawBothSides = false) {
        this.loc = loc;
        this.rot = rot;
        this.colorGrid = colorGrid;
        this.drawBothSides = drawBothSides;
        if (this.drawBothSides) {
            this.shouldDraw = true;
        } else {
            const normalOffset = this.rot.rotateLoc(new Loc(0, 0, 1));
            const dotProduct = this.loc.dotProduct(normalOffset);
            this.shouldDraw = (dotProduct > 0);
        }
        if (this.shouldDraw) {
            this.basisX = this.rot.rotateLoc(new Loc(1, 0, 0));
            this.basisY = this.rot.rotateLoc(new Loc(0, 1, 0));
        } else {
            this.basisX = null;
            this.basisY = null;
        }
    }
    
    transformByOffsets(locOffset, rotOffset) {
        const loc = rotOffset.rotateLoc(this.loc);
        const rot = rotOffset.rotateRot(this.rot);
        loc.add(locOffset);
        return new Panel(loc, rot, this.colorGrid, this.drawBothSides);
    }
    
    getLocZ(offset) {
        return this.loc.z + offset.x * this.basisX.z + offset.y * this.basisY.z;
    }
    
    // offset is an instance of Pos within the panel.
    getLoc(offset) {
        return new Loc(
            this.loc.x + offset.x * this.basisX.x + offset.y * this.basisY.x,
            this.loc.y + offset.x * this.basisX.y + offset.y * this.basisY.y,
            this.getLocZ(offset),
        );
    }
    
    draw() {
        if (!this.shouldDraw) {
            return;
        }
        const panelOffset = new Pos(0, 0);
        const canvasPos = new Pos(0, 0);
        const panelWidth = this.colorGrid.width;
        const panelHeight = this.colorGrid.height;
        
        // Determine the Loc of each vertex in the panel.
        const vertexLocs = [];
        let hasPositiveZ = false;
        for (
            panelOffset.y = 0;
            panelOffset.y <= panelHeight;
            panelOffset.y += panelHeight
        ) {
            for (
                panelOffset.x = 0;
                panelOffset.x <= panelWidth;
                panelOffset.x += panelWidth
            ) {
                const vertexLoc = this.getLoc(panelOffset);
                vertexLocs.push(vertexLoc);
                if (vertexLoc.z > 0) {
                    hasPositiveZ = true;
                }
            }
        }
        if (!hasPositiveZ) {
            // Do not draw a panel whose vertices are
            // all behind the camera.
            return;
        }
            
        // Determine the bounding box which should be drawn.
        const minBound = new Pos(Infinity, Infinity);
        const maxBound = new Pos(-Infinity, -Infinity);
        vertexLocs.forEach((vertexLoc) => {
            if (vertexLoc.z < 0) {
                canvasPos.x = Math.sign(vertexLoc.x) * Infinity;
                canvasPos.y = Math.sign(vertexLoc.y) * Infinity;
            } else {
                convertLocToCanvasPos(canvasPos, vertexLoc);
            }
            minBound.x = Math.min(minBound.x, canvasPos.x);
            minBound.y = Math.min(minBound.y, canvasPos.y);
            maxBound.x = Math.max(maxBound.x, canvasPos.x + 1);
            maxBound.y = Math.max(maxBound.y, canvasPos.y + 1);
        });
        minBound.x = Math.max(minBound.x, 0);
        minBound.y = Math.max(minBound.y, 0);
        maxBound.x = Math.min(maxBound.x, canvasWidth);
        maxBound.y = Math.min(maxBound.y, canvasHeight);
        
        // Draw the pixels within the bounding box.
        const canvasOffset = new Pos(0, 0);
        for (canvasPos.y = minBound.y; canvasPos.y < maxBound.y; canvasPos.y++) {
            for (canvasPos.x = minBound.x; canvasPos.x < maxBound.x; canvasPos.x++) {
                canvasOffset.x = (canvasPos.x - canvasCenter.x) / canvasOffsetScale;
                canvasOffset.y = (canvasPos.y - canvasCenter.y) / canvasOffsetScale;
                const c1 = this.basisX.z * canvasOffset.y - this.basisX.y;
                const c2 = this.loc.x - this.loc.z * canvasOffset.x;
                const c3 = this.basisY.x - this.basisY.z * canvasOffset.x;
                const c4 = this.basisX.z * canvasOffset.x - this.basisX.x;
                const c5 = this.loc.y - this.loc.z * canvasOffset.y;
                const c6 = this.basisY.y - this.basisY.z * canvasOffset.y;
                panelOffset.y = (c5 - c1 * c2 / c4) / (c1 * c3 / c4 - c6);
                panelOffset.x = (c2 + panelOffset.y * c3) / c4;
                const color = this.colorGrid.getColor(panelOffset);
                if (color === null) {
                    continue;
                }
                const depth = this.getLocZ(panelOffset);
                if (depth <= 0) {
                    continue;
                }
                const pixelIndex = canvasPos.x + canvasPos.y * canvasWidth;
                if (depth > depthArray[pixelIndex]) {
                    continue;
                }
                const imageIndex = pixelIndex * 4;
                imageDataList[imageIndex] = color.r;
                imageDataList[imageIndex + 1] = color.g;
                imageDataList[imageIndex + 2] = color.b;
                depthArray[pixelIndex] = depth;
            }
        }
    }
}

class Body {
    
    constructor(loc, rot, panels) {
        this.loc = loc;
        this.rot = rot;
        this.panels = panels;
    }
    
    transformByCamera(cameraLoc, cameraRot) {
        let loc = this.loc.copy();
        loc.subtract(cameraLoc);
        const invertedRot = cameraRot.invert();
        loc = invertedRot.rotateLoc(loc);
        const rot = invertedRot.rotateRot(this.rot);
        return new Body(loc, rot, this.panels);
    }
    
    draw() {
        this.panels.forEach((panel) => {
            const transformedPanel = panel.transformByOffsets(this.loc, this.rot);
            transformedPanel.draw();
        });
    }
}

class Scene {
    
    constructor(bodies) {
        this.bodies = bodies;
        this.cameraLoc = new Loc(0, 0, 0);
        this.cameraAngleX = 0;
        this.cameraAngleY = 0;
        this.cameraRot = null;
    }
    
    getCameraRot() {
        if (this.cameraRot === null) {
            this.cameraRot = createRotByAngles(this.cameraAngleX, this.cameraAngleY, 0);
        }
        return this.cameraRot;
    }
    
    draw() {
        this.bodies.forEach((body) => {
            const transformedBody = body.transformByCamera(
                this.cameraLoc,
                this.getCameraRot(),
            );
            transformedBody.draw();
        });
    }
    
    setCameraAngles(angleX, angleY) {
        this.cameraAngleX = angleX;
        this.cameraAngleY = angleY;
        this.cameraRot = null;
    }
}

const transposeRotMatrix = (matrix) => {
    return [
        matrix[0], matrix[3], matrix[6],
        matrix[1], matrix[4], matrix[7],
        matrix[2], matrix[5], matrix[8],
    ]
};

const createRotByAngles = (x, y, z) => {
    const sinX = Math.sin(x);
    const cosX = Math.cos(x);
    const sinY = Math.sin(y);
    const cosY = Math.cos(y);
    const sinZ = Math.sin(z);
    const cosZ = Math.cos(z);
    return new Rot([
        cosY * cosZ + sinY * sinX * sinZ,
        -cosY * sinZ + sinY * sinX * cosZ,
        sinY * cosX,
        cosX * sinZ,
        cosX * cosZ,
        -sinX,
        -sinY * cosZ + cosY * sinX * sinZ,
        sinY * sinZ + cosY * sinX * cosZ,
        cosY * cosX,
    ]);
}

const convertLocToCanvasPos = (destination, loc) => {
    const canvasOffsetX = loc.x / loc.z;
    const canvasOffsetY = loc.y / loc.z;
    destination.x = Math.floor(canvasOffsetX * canvasOffsetScale + canvasCenter.x)
    destination.y = Math.floor(canvasOffsetY * canvasOffsetScale + canvasCenter.y)
};

const clearImageData = () => {
    for (let index = 0; index < imageDataList.length; index += 4) {
        imageDataList[index] = 0;
        imageDataList[index + 1] = 0;
        imageDataList[index + 2] = 0;
    }
    depthArray.fill(Infinity);
};

const drawImageData = () => {
    context.putImageData(imageData, 0, 0);
};

const initializeGraphics = async () => {
    
    [
        "-moz-crisp-edges",
        "-webkit-crisp-edges",
        "pixelated",
        "crisp-edges",
    ].forEach((name) => {
        canvas.style.imageRendering = name;
    });
    canvasCenter = new Pos(Math.floor(canvasWidth / 2), Math.floor(canvasHeight / 2));
    imageData = context.createImageData(canvasWidth, canvasHeight);
    imageDataList = imageData.data;
    for (let index = 0; index < imageDataList.length; index += 4) {
        imageDataList[index + 3] = 255
    }
    depthArray = Array(canvasWidth * canvasHeight);
    
    textureSheetCanvas = document.createElement("canvas");
    textureSheetCanvas.width = textureSheetSize;
    textureSheetCanvas.height = textureSheetSize;
    textureSheetContext = textureSheetCanvas.getContext("2d");
    await new Promise((resolve) => {
        textureSheetImage = new Image();
        textureSheetImage.onload = resolve
        textureSheetImage.src = "/images/textureSheet.png";
    });
    textureSheetContext.drawImage(textureSheetImage, 0, 0);
    textureSheetImageData = textureSheetContext.getImageData(
        0,
        0,
        textureSheetSize,
        textureSheetSize
    );
    textureSheetImageDataList = textureSheetImageData.data;
};


