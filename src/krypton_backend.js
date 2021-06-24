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

            case "logOut":
                this.sendIpc("showScreen", {
                    screenID: this.SCREENID.LOGIN
                });
                this.config.reset();
                break;

            case "logIn":
                let logInResponse = await api.logIn(arg.data);
                if (logInResponse.success) this.sendIpc("showScreen", {
                    screenID: this.SCREENID.MAIN
                });
                else this.sendIpc("error", {
                    error: logInResponse.error.description
                });
                break;

            case "signUp":
                console.log("signing up with given credentials");
                let signUpResponse = await api.signUp({
                    createAccountSuccessCallback: (() => {
                        // show login screen if account creates successfully
                        this.sendIpc("showScreen", {
                            screenID: this.SCREENID.LOGIN
                        });
                    }).bind(this),
                    ...arg.data
                });
                // log in directly if it works
                if (signUpResponse.success) this.sendIpc("showScreen", {
                    screenID: this.SCREENID.MAIN
                });
                else this.sendIpc("error", {
                    error: signUpResponse.error.description
                });
                break;

            case "closeWindow":
                this.browserWindow.close();
                break;

            case "toggleMaxinizeWindow":
                if (this.browserWindow.isMaximized()) this.browserWindow.unmaximize()
                else this.browserWindow.maximize();
                break;

            case "minimizeWindow":
                this.browserWindow.minimize();
                break;

            case "startDebug":
                this.browserWindow.webContents.closeDevTools();
                this.browserWindow.webContents.openDevTools();
                break;
            case "requestChatList":
                this.sendIpc("chatList", {
                    chatList: {
                        Chats: [{
                            title: "Chat with Admin",
                            subtitle: "good morning, i was thinking we could get a beer?",
                            timestamp: 1624540755,
                            picture: "data:"
                        }]
                    }
                });
                break;
            case "startRemoteServer":
                // start server for remote access
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
                preload: path.join(__dirname, "res/preload.js"),
            }
        });

        this.browserWindow.setMenuBarVisibility(true);
        this.browserWindow.setMenu(new Menu());
        this.browserWindow.setIcon(nativeImage.createFromPath("res/icon.png"));
        console.log(this.rootFile);
        this.browserWindow.loadFile(this.rootFile);
        this.browserWindow.webContents.openDevTools();
        this.browserWindow.on("resize", () => {
            config.setAndSave("windowSize", this.browserWindow.getSize());
        });
    }
}
exports.KryptonBackend = KryptonBackend;