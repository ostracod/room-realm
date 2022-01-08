
import { RoomDbRow, WallElementJson, RoomTexturesJson, DecorationJson, RoomJson } from "./interfaces.js";
import { Pos, convertShellPosToPos } from "./pos.js";
import { DbCache } from "./dbCache.js";

type WallElementConstructor<T extends WallElement> = new (
    id: number,
    angle: number,
    offset: number,
) => T;

export class WallElement {
    id: number;
    angle: number;
    offset: number;
    
    constructor(id: number, angle: number, offset: number) {
        this.id = id;
        this.angle = angle;
        this.offset = offset;
    }
    
    toJson(): WallElementJson {
        return {
            id: this.id,
            angle: this.angle,
            offset: this.offset,
        };
    }
}

export class Door extends WallElement {
    
}

export class Button extends WallElement {
    
}

export class Decoration {
    type: number;
    angle: number;
    pos: Pos;
    
    constructor(type: number, angle: number, pos: Pos) {
        this.type = type;
        this.angle = angle;
        this.pos = pos;
    }
    
    toJson(): DecorationJson {
        return {
            type: this.type,
            angle: this.angle,
            pos: this.pos.toJson(),
        };
    }
}

export class Room {
    id: number;
    pos: Pos;
    doors: Door[];
    buttons: Button[];
    textures: RoomTexturesJson;
    decorations: Decoration[];
    
    constructor(id: number, pos: Pos, textures: RoomTexturesJson) {
        this.id = id;
        this.pos = pos;
        this.textures = textures;
        this.doors = [];
        this.buttons = [];
        this.decorations = [];
    }
    
    toJson(): RoomJson {
        return {
            id: this.id,
            pos: this.pos.toJson(),
            doors: this.doors.map((door) => door.toJson()),
            buttons: this.buttons.map((button) => button.toJson()),
            textures: this.textures,
            decorations: this.decorations.map((decoration) => decoration.toJson()),
        };
    }
}

const readCsv = (csv: string): number[] => (
    csv.split(",").map((term) => parseInt(term, 10))
);

const readWallElements = <T extends WallElement>(
    data: number[],
    constructor: WallElementConstructor<T>,
): T[] => {
    const output: T[] = [];
    for (let index = 0; index < data.length; index += 3) {
        const id = data[index];
        const angle = data[index + 1];
        const offset = data[index + 2];
        const element = new constructor(id, angle, offset);
        output.push(element);
    }
    return output;
};

const readDecorations = (data: number[]): Decoration[] => {
    const output: Decoration[] = [];
    for (let index = 0; index < data.length; index += 4) {
        const type = data[index];
        const angle = data[index + 1];
        const pos = new Pos(data[index + 2], data[index + 3]);
        const decoration = new Decoration(type, angle, pos);
        output.push(decoration);
    }
    return output;
};

const convertDbRowToRoom = (dbRow: RoomDbRow): Room => {
    const pos = convertShellPosToPos(dbRow.shellPos);
    const texturesData = readCsv(dbRow.textures);
    const textures = {
        floor: texturesData[0],
        wall: texturesData[1],
        ceiling: texturesData[2],
    };
    const output = new Room(dbRow.id, pos, textures);
    const doorsData = readCsv(dbRow.doors);
    output.doors = readWallElements(doorsData, Door);
    const buttonsData = readCsv(dbRow.buttons);
    output.buttons = readWallElements(buttonsData, Button);
    const decorationsData = readCsv(dbRow.decorations);
    output.decorations = readDecorations(decorationsData);
    return output;
};

const roomCache = new DbCache("Rooms", ["id"], convertDbRowToRoom);


