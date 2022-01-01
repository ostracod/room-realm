
import * as pathUtils from "path";
import express from "express";
import ostracodMultiplayer from "ostracod-multiplayer";

import { projectPath } from "./constants.js";
import { gameDelegate } from "./gameDelegate.js";

const { pageUtils } = ostracodMultiplayer;
const ostracodMultiplayerInstance = ostracodMultiplayer.ostracodMultiplayer;

const router = express.Router();

router.get("/modelEditor", (req, res, next) => {
    pageUtils.renderPage(
        res,
        pathUtils.join(projectPath, "views", "modelEditor.html"),
        { scripts: [
            "javascript/graphics.js",
            "javascript/modelEditor.js",
        ] },
        {},
    );
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


