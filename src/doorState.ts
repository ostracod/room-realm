
import { DoorStateDbRow } from "./interfaces.js";
import { DbCache } from "./dbCache.js";

export class DoorState {
    id: number;
    isLocked: boolean;
    missingButtonIndex: number;
    
    constructor(id: number, isLocked: boolean, missingButtonIndex: number) {
        this.id = id;
        this.isLocked = isLocked;
        this.missingButtonIndex = missingButtonIndex;
    }
}

const convertDbRowToDoorState = (dbRow: DoorStateDbRow): DoorState => (
    new DoorState(dbRow.id, (dbRow.isLocked !== 0), dbRow.missingButtonIndex)
);

const stateCache = new DbCache<DoorState>(
    "DoorStates",
    ["id", "missingButtonIndex"],
    convertDbRowToDoorState,
);


