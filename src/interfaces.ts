
export interface Player {
    username: string;
    score: number;
    extraFields: {
        shellPos: number;
    };
}

export interface RoomDbRow {
    id: number;
    shellPos: number;
    doors: string;
    buttons: string;
    textures: string;
    decorations: string;
}

export interface DoorStateDbRow {
    id: number;
    isLocked: number;
    missingButtonIndex: number;
}

export interface PosJson {
    x: number;
    y: number;
}

export interface WallElementJson {
    id: number;
    angle: number;
    offset: number;
}

export interface RoomTexturesJson {
    floor: number;
    wall: number;
    ceiling: number;
}

export interface DecorationJson {
    type: number;
    pos: PosJson;
    angle: number;
}

export interface RoomJson {
    id: number;
    pos: PosJson;
    doors: WallElementJson[];
    buttons: WallElementJson[];
    textures: RoomTexturesJson;
    decorations: DecorationJson[];
}


