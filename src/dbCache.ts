
import { dbUtils } from "ostracod-multiplayer";

export class DbCache<T extends Object> {
    tableName: string;
    keyNames: string[];
    convertDbRow: (dbRow: any) => T;
    valueMaps: Map<string, Map<number, T>>;
    
    constructor(tableName: string, keyNames: string[], convertDbRow: (dbRow: any) => T) {
        this.tableName = tableName;
        this.keyNames = keyNames;
        this.convertDbRow = convertDbRow;
        this.valueMaps = new Map();
        this.keyNames.forEach((name) => {
            this.valueMaps.set(name, new Map());
        });
    }
    
    addValue(value: T): void {
        this.keyNames.forEach((keyName) => {
            const key = value[keyName];
            const valueMap = this.valueMaps.get(keyName);
            valueMap.set(key, value);
        });
    }
    
    removeValue(value: T): void {
        this.keyNames.forEach((keyName) => {
            const key = value[keyName];
            const valueMap = this.valueMaps.get(keyName);
            valueMap.delete(key);
        });
    }
    
    async getValues(keyName: string, keys: number[]): Promise<T[]> {
        const output: T[] = [];
        const keysToLoad: number[] = [];
        const valueMap = this.valueMaps.get(keyName);
        keys.forEach((key) => {
            const value = valueMap.get(key);
            if (typeof value === "undefined") {
                keysToLoad.push(key);
            } else {
                output.push(value);
            }
        });
        if (keysToLoad.length > 0) {
            await dbUtils.performOperation(async () => {
                const questionMarks = [];
                while (questionMarks.length < keysToLoad.length) {
                    questionMarks.push("?");
                }
                const questionMarksText = questionMarks.join(", ");
                const rows = await dbUtils.performQuery(
                    `SELECT * FROM ${this.tableName} WHERE ${keyName} IN (${questionMarksText})`,
                    keysToLoad,
                );
                rows.forEach((row) => {
                    const value = this.convertDbRow(row);
                    this.addValue(value);
                    output.push(value);
                });
            });
        }
        return output;
    }
}


