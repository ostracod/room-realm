
import { PosJson } from "./interfaces.js";

export class Pos {
    
    x: number;
    y: number;
    
    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }
    
    copy(): Pos {
        return new Pos(this.x, this.y);
    }
    
    set(pos: Pos): void {
        this.x = pos.x;
        this.y = pos.y;
    }
    
    add(pos: Pos): void {
        this.x += pos.x;
        this.y += pos.y;
    }
    
    subtract(pos: Pos): void {
        this.x -= pos.x;
        this.y -= pos.y;
    }
    
    equals(pos: Pos): boolean {
        return (this.x === pos.x && this.y === pos.y);
    }
    
    toString(): string {
        return `(${this.x}, ${this.y})`;
    }
    
    toJson(): PosJson {
        return {
            x: this.x,
            y: this.y,
        };
    }
}

export const createPosFromJson = (data: PosJson): Pos => new Pos(data.x, data.y);

// Shell pos covers rings of positions like this:
// 14 15 16 17 18
// 21 4  5  6  24
// 20 7  0  8  23
// 19 1  2  3  22
// 9  10 11 12 13
export const convertShellPosToPos = (shellPos: number): Pos => {
    if (shellPos === 0) {
        return new Pos(0, 0);
    }
    const innerSize = Math.floor((Math.sqrt(shellPos) - 1) / 2) * 2 + 1;
    const innerRadius = Math.floor(innerSize / 2);
    const outerSize = innerSize + 2;
    const outerRadius = innerRadius + 1;
    let offset = shellPos - innerSize * innerSize;
    if (offset < outerSize) {
        return new Pos(offset - outerRadius, -outerRadius);
    }
    offset -= outerSize;
    if (offset < outerSize) {
        return new Pos(offset - outerRadius, outerRadius);
    }
    offset -= outerSize;
    if (offset < innerSize) {
        return new Pos(-outerRadius, offset - innerRadius);
    }
    offset -= innerSize;
    return new Pos(outerRadius, offset - innerRadius);
};


