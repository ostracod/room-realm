
const canvasOffsetScale = 100;
const textureSheetWidth = 128;
const textureSheetHeight = 128;
let canvasCenter;
let imageData;
let imageDataList;
let depthArray;
let textureSheetImage;
let textureSheetCanvas;
let textureSheetContext;
let textureSheetImageData;
let textureSheetImageDataList;
let transparentTextureColor;

class Dim {
    
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
    
    copy() {
        return new Dim(this.x, this.y);
    }
    
    toJson() {
        return [this.x, this.y];
    }
}

class Vector {
    
    constructor(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
    }
    
    copy() {
        return new this.constructor(this.x, this.y, this.z);
    }
    
    add(vector) {
        this.x += vector.x;
        this.y += vector.y;
        this.z += vector.z;
    }
    
    subtract(vector) {
        this.x -= vector.x;
        this.y -= vector.y;
        this.z -= vector.z;
    }
    
    scale(value) {
        this.x *= value;
        this.y *= value;
        this.z *= value;
    }
    
    toJson() {
        return [this.x, this.y, this.z];
    }
}

class Loc extends Vector {
    
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
    
    invert() {
        this.x = -this.x;
        this.y = -this.y;
        this.z = -this.z;
    }
    
    dotProduct(loc) {
        return this.x * loc.x + this.y * loc.y + this.z * loc.z;
    }
}

class RotAngles extends Vector {
    
    createRot() {
        const sinX = Math.sin(this.x);
        const cosX = Math.cos(this.x);
        const sinY = Math.sin(this.y);
        const cosY = Math.cos(this.y);
        const sinZ = Math.sin(this.z);
        const cosZ = Math.cos(this.z);
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
    
    toJson() {
        return this.matrix;
    }
}

class Texture {
    // Concrete subclasses of Texture must implement these methods:
    // createColor, copy, getTypeText
    
    constructor(pos, dim, noise = 0) {
        this.pos = pos;
        this.dim = dim;
        this.noise = noise;
        this.shade = null;
        this.colors = null;
    }
    
    initializeColors(normalOffset) {
        const normalX = Math.abs(normalOffset.x);
        const normalY = Math.abs(normalOffset.y);
        const normalZ = Math.abs(normalOffset.z);
        if (normalY > normalX && normalY > normalZ) {
            this.shade = 1;
        } else if (normalZ > normalX) {
            this.shade = 0.9;
        } else {
            this.shade = 0.84;
        }
        this.colors = [];
        const offset = new Pos(0, 0);
        for (offset.y = 0; offset.y < this.dim.y; offset.y++) {
            for (offset.x = 0; offset.x < this.dim.x; offset.x++) {
                const color = this.createColor(offset);
                if (color !== null) {
                    const scaleValue = this.shade * (1 - 2 * this.noise * Math.random());
                    color.scale(scaleValue);
                }
                this.colors.push(color);
            }
        }
    }
    
    getColor(pos) {
        const x = Math.floor(pos.x);
        const y = Math.floor(pos.y);
        return this.colors[x % this.dim.x + (y % this.dim.y) * this.dim.x];
    }
    
    toJson() {
        return {
            type: this.getTypeText(),
            pos: convertPosToJson(this.pos),
            dim: this.dim.toJson(),
            noise: this.noise,
        };
    }
}

class ImageTexture extends Texture {
    
    constructor(pos, dim, noise = 0, isFlipped = false) {
        super(pos, dim, noise);
        this.isFlipped = isFlipped;
    }
    
    createColor(offset) {
        const offsetX = (this.isFlipped) ? this.dim.x - offset.x - 1 : offset.x;
        return getTextureSheetColor(this.pos.x + offsetX, this.pos.y + offset.y);
    }
    
    copy() {
        return new ImageTexture(this.pos.copy(), this.dim.copy(), this.noise, this.isFlipped);
    }
    
    getTypeText() {
        return "image";
    }
    
    toJson() {
        const output = super.toJson();
        output.isFlipped = this.isFlipped;
        return output;
    }
}

class SwatchTexture extends Texture {
    
    constructor(pos, dim, noise = 0) {
        super(pos, dim, noise);
        this.color = getTextureSheetColor(this.pos.x, this.pos.y);
    }
    
    createColor(offset) {
        return (this.color === null) ? null : this.color.copy();
    }
    
    copy() {
        return new SwatchTexture(this.pos.copy(), this.dim.copy(), this.noise);
    }
    
    getTypeText() {
        return "swatch";
    }
}

class Panel {
    
    constructor(loc, dim, texture, angles = null, drawBothSides = false) {
        this.loc = loc;
        this.dim = dim;
        this.texture = texture;
        this.drawBothSides = drawBothSides;
        this.rot = null;
        this.angles = null;
        if (angles !== null) {
            this.setRotAngles(angles);
        }
    }
    
    copy() {
        const output = new Panel(
            this.loc.copy(),
            this.dim.copy(),
            this.texture.copy(),
            null,
            this.drawBothSides,
        );
        if (this.angles === null) {
            output.setRot(this.rot);
        } else {
            output.setRotAngles(this.angles);
        }
        return output;
    }
    
    initializeTexture(rotOffset = null) {
        let normalOffset = this.normalOffset;
        if (rotOffset !== null) {
            normalOffset = rotOffset.rotateLoc(normalOffset);
        }
        this.texture.initializeColors(normalOffset);
    }
    
    updateShouldDraw() {
        if (this.drawBothSides) {
            this.shouldDraw = true;
        } else {
            const dotProduct = this.loc.dotProduct(this.normalOffset);
            this.shouldDraw = (dotProduct > 0);
        }
    }
    
    setRot(rot) {
        this.rot = rot;
        this.normalOffset = this.rot.rotateLoc(new Loc(0, 0, 1));
        this.updateShouldDraw();
        if (this.shouldDraw) {
            this.basisX = this.rot.rotateLoc(new Loc(1, 0, 0));
            this.basisY = this.rot.rotateLoc(new Loc(0, 1, 0));
            this.useSolution1 = (Math.abs(this.basisY.y) > Math.abs(this.basisY.x));
        } else {
            this.basisX = null;
            this.basisY = null;
            this.useSolution1 = null;
        }
    }
    
    setRotAngles(angles) {
        this.angles = angles;
        this.setRot(this.angles.createRot());
    }
    
    setDrawBothSides(drawBothSides) {
        this.drawBothSides = drawBothSides;
        this.updateShouldDraw();
    }
    
    transformByOffsets(locOffset, rotOffset) {
        const loc = rotOffset.rotateLoc(this.loc);
        const rot = rotOffset.rotateRot(this.rot);
        loc.add(locOffset);
        const output = new Panel(loc, this.dim, this.texture, null, this.drawBothSides);
        output.setRot(rot);
        return output;
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
        
        // Determine the Loc of each vertex in the panel.
        const vertexLocs = [];
        let hasPositiveZ = false;
        for (
            panelOffset.y = 0;
            panelOffset.y <= this.dim.y;
            panelOffset.y += this.dim.y
        ) {
            for (
                panelOffset.x = 0;
                panelOffset.x <= this.dim.x;
                panelOffset.x += this.dim.x
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
                // This is based on solving a lot of equations...
                const c2 = this.loc.x - this.loc.z * canvasOffset.x;
                const c5 = this.loc.y - this.loc.z * canvasOffset.y;
                let c1;
                let c3;
                let c4;
                let c6;
                if (this.useSolution1) {
                    c1 = this.basisX.z * canvasOffset.y - this.basisX.y;
                    c3 = this.basisY.x - this.basisY.z * canvasOffset.x;
                    c4 = this.basisX.z * canvasOffset.x - this.basisX.x;
                    c6 = this.basisY.y - this.basisY.z * canvasOffset.y;
                } else {
                    c1 = this.basisY.z * canvasOffset.y - this.basisY.y;
                    c3 = this.basisX.x - this.basisX.z * canvasOffset.x;
                    c4 = this.basisY.z * canvasOffset.x - this.basisY.x;
                    c6 = this.basisX.y - this.basisX.z * canvasOffset.y;
                }
                const coordinate1 = (c5 - c1 * c2 / c4) / (c1 * c3 / c4 - c6);
                const coordinate2 = (c2 + coordinate1 * c3) / c4;
                if (this.useSolution1) {
                    panelOffset.x = coordinate2;
                    panelOffset.y = coordinate1;
                } else {
                    panelOffset.x = coordinate1;
                    panelOffset.y = coordinate2;
                }
                if (panelOffset.x < 0 || panelOffset.x >= this.dim.x
                        || panelOffset.y < 0 || panelOffset.y >= this.dim.y) {
                    continue;
                }
                const color = this.texture.getColor(panelOffset);
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
    
    toJson() {
        const output = {
            loc: this.loc.toJson(),
            dim: this.dim.toJson(),
            texture: this.texture.toJson(),
            drawBothSides: this.drawBothSides,
        };
        if (this.angles !== null) {
            output.angles = this.angles.toJson();
        } else {
            output.rot = this.rot.toJson();
        }
        return output;
    }
}

class Body {
    
    constructor(loc, rot, panels) {
        this.loc = loc;
        this.rot = rot;
        this.panels = panels;
    }
    
    initializePanelTexture(panel) {
        panel.initializeTexture(this.rot);
    }
    
    initializeTextures() {
        this.panels.forEach((panel) => {
            this.initializePanelTexture(panel);
        });
    }
    
    addPanel(panel) {
        this.panels.push(panel);
        this.initializePanelTexture(panel);
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
        this.cameraAngles = new RotAngles(0, 0, 0);
        this.cameraRot = null;
    }
    
    getCameraRot() {
        if (this.cameraRot === null) {
            this.cameraRot = this.cameraAngles.createRot();
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
    
    setCameraAngles(angles) {
        this.cameraAngles = angles;
        this.cameraRot = null;
    }
}

const convertPosToJson = (pos) => [pos.x, pos.y];

const convertJsonToPos = (data) => new Pos(data[0], data[1]);

const convertJsonToDim = (data) => new Dim(data[0], data[1]);

const convertJsonToLoc = (data) => new Loc(data[0], data[1], data[2]);

const convertJsonToRot = (data) => new Rot(data);

const convertJsonToRotAngles = (data) => new RotAngles(data[0], data[1], data[2]);

const convertJsonToTexture = (data) => {
    const { type, noise } = data;
    const pos = convertJsonToPos(data.pos);
    const dim = convertJsonToDim(data.dim);
    if (type === "image") {
        return new ImageTexture(pos, dim, noise, data.isFlipped);
    } else if (type === "swatch") {
        return new SwatchTexture(pos, dim, noise);
    } else {
        throw new Error(`Unknown texture type "${type}".`);
    }
}

const convertJsonToPanel = (data) => {
    const output = new Panel(
        convertJsonToLoc(data.loc),
        convertJsonToDim(data.dim),
        convertJsonToTexture(data.texture),
        null,
        data.drawBothSides,
    );
    if ("angles" in data) {
        output.setRotAngles(convertJsonToRotAngles(data.angles));
    } else {
        output.setRot(convertJsonToRot(data.rot));
    }
    return output;
}

const transposeRotMatrix = (matrix) => {
    return [
        matrix[0], matrix[3], matrix[6],
        matrix[1], matrix[4], matrix[7],
        matrix[2], matrix[5], matrix[8],
    ]
};

const createRotByAngles = (x, y, z) => {
    const angles = new RotAngles(x, y, z);
    return angles.createRot();
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

const getTextureSheetColor = (x, y) => {
    const index = (x + y * textureSheetWidth) * 4;
    const r = textureSheetImageDataList[index];
    const g = textureSheetImageDataList[index + 1];
    const b = textureSheetImageDataList[index + 2];
    if (r === transparentTextureColor.r && g === transparentTextureColor.g
            && b === transparentTextureColor.b) {
        return null;
    } else {
        return new Color(r, g, b);
    }
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
    textureSheetCanvas.width = textureSheetWidth;
    textureSheetCanvas.height = textureSheetHeight;
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
        textureSheetWidth,
        textureSheetHeight
    );
    textureSheetImageDataList = textureSheetImageData.data;
    transparentIndex = textureSheetImageDataList.length - 4;
    transparentTextureColor = new Color(
        textureSheetImageDataList[transparentIndex],
        textureSheetImageDataList[transparentIndex + 1],
        textureSheetImageDataList[transparentIndex + 2],
    );
};


