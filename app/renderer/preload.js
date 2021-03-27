const {
    contextBridge,
    ipcRenderer
} = require('electron'),
    config = require("../config");

contextBridge.exposeInMainWorld("ipc", {
    send: (command, data) => {
        ipcRenderer.send("message", {
            command,
            data
        });
    },
    listen: (callback) => {
        ipcRenderer.on("message", callback);
    }
});

contextBridge.exposeInMainWorld("config", {
    server: config.get("server"),
    username: config.get("credentials:username"),
    signedIn: config.get("signedIn")
});
