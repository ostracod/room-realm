
class ClientDelegate {
    
    constructor() {
        // Do nothing.
    }
    
    initialize(done) {
        // Do nothing.
        done();
    }
    
    setLocalPlayerInfo(command) {
        // Do nothing.
    }
    
    addCommandsBeforeUpdateRequest() {
        // Do nothing.
    }
    
    timerEvent() {
        // Do nothing.
    }
    
    keyDownEvent(keyCode) {
        // Do nothing.
        return true;
    }
    
    keyUpEvent(keyCode) {
        // Do nothing.
        return true;
    }
}

clientDelegate = new ClientDelegate();


