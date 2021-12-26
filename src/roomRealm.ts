
import express from "express";
import ostracodMultiplayer from "ostracod-multiplayer";

import { projectPath } from "./constants.js";
import { gameDelegate } from "./gameDelegate.js";

const ostracodMultiplayerInstance = ostracodMultiplayer.ostracodMultiplayer;

const router = express.Router();

router.get("/test", (req, res, next) => {
    res.send("Wow!");
});

console.log("Starting Room Realm server...");
const result = ostracodMultiplayerInstance.initializeServer(
    projectPath,
    gameDelegate,
    [router],
);
if (!result) {
    process.exit(1);
}


