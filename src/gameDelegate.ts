
import { Player } from "./interfaces.js";

class GameDelegate {
    
    constructor() {
        // Do nothing.
    }
    
    playerEnterEvent(player: Player): void {
        // Do nothing.
    }
    
    playerLeaveEvent(player: Player): void {
        // Do nothing.
    }
    
    async persistEvent(): Promise<void> {
        // Do nothing.
    }
}

export const gameDelegate = new GameDelegate();


