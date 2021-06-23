const {
    Menu,
    app,
    BrowserWindow,
    nativeImage,
    Notification,
    ipcMain,
    dialog
} = require("electron"),
    path = require("path"),
    api = require("./res/api"),
    config = require("./res/config");

class KryptonBackend {
    constructor() {
        app.on("ready", this.createWindow.bind(this));

        app.on("activate", (() => {
            if (BrowserWindow.getAllWindows().length === 0) {
                this.createWindow()
            }
        }).bind(this));

        app.on("window-all-closed", () => {
            if (process.platform !== "darwin") app.quit();
        });

        ipcMain.on("message", this.handleIpcMessage.bind(this));
        this.api = api;
        this.config = config;
    }
    get SCREENID() {
        return {
            LOGIN: 0,
            SIGNUP: 1,
            MAIN: 2
        }
    }
    get rootFile() {
        return "src/res/app/index.html";
    }
    async handleIpcMessage(event, arg) {
        console.log(arg.command);
        switch (arg.command) {
            case "startUp":
                this.sendIpc = (command, data) => {
                    event.reply("message", {
                        command,
                        data
                    });
                }
                if (this.config.get("signedIn")) this.sendIpc("showScreen", {
                    screenID: this.SCREENID.MAIN
                });
                else this.sendIpc("showScreen", {
                    screenID: this.SCREENID.LOGIN
                });
                break;

            case "logIn":
                console.log("logging in with given credentials");
                let response = await api.logIn(arg.data);
                if (response.success) this.sendIpc("showScreen", {
                    screenID: this.SCREENID.MAIN
                });
                else this.sendIpc("error", {
                    error: response.error.description
                });
                break;

            case "signUp":
                console.log("signing up with given credentials");
                let response = await api.signUp({
                    createAccountSuccessCallback: (() => {
                        // show login screen if account creates successfully
                        this.sendIpc("showScreen", {
                            screenID: this.SCREENID.LOGIN
                        });
                    }).bind(this),
                    ...arg.data
                });
                // log in directly if it works
                if (response.success) this.sendIpc("showScreen", {
                    screenID: this.SCREENID.MAIN
                });
                else this.sendIpc("error", {
                    error: response.error.description
                });
                break;

            default:
                console.log(`uncaught ipc-command ${arg.command}, nothing done`);
                break;
        }

    }

    createWindow() {
        var configSize = config.get("windowSize") ?? [800, 600];
        this.browserWindow = new BrowserWindow({
            minWidth: 300,
            minHeight: 500,
            width: configSize[0],
            height: configSize[1],
            frame: false,
            webPreferences: {
                preload: path.join(__dirname, "res/app/preload.js"),
            }
        });

        this.browserWindow.setMenuBarVisibility(true);
        this.browserWindow.setMenu(new Menu());
        this.browserWindow.setIcon(nativeImage.createFromPath("res/icon.png"));
        console.log(this.rootFile);
        this.browserWindow.loadFile(this.rootFile);
        this.browserWindow.webContents.openDevTools();
        this.browserWindow.on("resize", () => {
            config.setAndSave("windowSize", win.getSize());
        });
    }
}
exports.KryptonBackend = KryptonBackend;