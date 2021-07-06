const {
    Menu,
    app,
    BrowserWindow,
    nativeImage,
    Notification,
    ipcMain,
    dialog
} = require("electron"),
    mime = require("mime"),
    path = require("path"), {
        Api
    } = require("./res/api"),
    config = require("./res/config"), {
        UserStorage
    } = require("./res/userStorage"), {
        Encryptor,
        Decryptor
    } = require("./res/messageEncryption"), {
        parsePrivateKey
    } = require("./res/encryption"), {
        KryptonWebSocket
    } = require("./res/kryptonWebSocket"),
    fileDecrypt = require("./res/fileDecrypt");
    // fileEncrypt = require("./res/fileEncrypt");

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
        this.api = new Api(this);
        this.config = config;
        this.storage = new UserStorage(this);
        this.encryptor = new Encryptor(this);
        this.decryptor = new Decryptor(this, this.api.getPublickey);
        this.ws = new KryptonWebSocket(this);
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
                    console.log("sending ipc", {
                        command,
                        data
                    });
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
                this.storage.reset();
                break;

            case "logIn":
                let logInResponse = await this.api.logIn(arg.data);
                if (logInResponse.success) this.sendIpc("showScreen", {
                    screenID: this.SCREENID.MAIN
                });
                else this.sendIpc("error", {
                    error: logInResponse.error.description
                });
                this.storage.init();
                break;

            case "signUp":
                console.log("signing up with given credentials");
                let signUpResponse = await this.api.signUp({
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
                this.storage.close();
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
                console.log("chatlist requested");
                await this.storage.addChats(await this.api.getChats());
                let chatList = {};
                chatList["Chats"] = await this.storage.getChatsWithPreview(arg.data.query);
                this.sendIpc("chatList", {
                    chatList
                });
                break;
            case "sendMessage":
                // arg.data = {message,
                //     delay,
                //     quote,
                //     chatId,
                //     chatKey}
                let encryptedMessage = await this.encryptor.encryptMessage(arg.data.message, arg.data.chatKey, arg.data.quote, arg.data.messageType);
                console.log("sending message", arg.data);
                this.api.sendMessage({
                    content: encryptedMessage,
                    delay: arg.data.delay,
                    chatId: arg.data.chatId
                });
                break;
            case "getMessages":
                await this.storage.loadMessages([{
                    chatId: arg.data.chatId,
                    chatKey: arg.data.chatKey
                }]);
                this.sendIpc("messages", {
                    messages: await this.storage.getMessages(arg.data.query, arg.data.chatId, arg.data.offset)
                });
                // for(let i of await this.api.getMessages(arg.data.chatId).data){
                //     this.storage.decryptAndAddMessage(i);
                // }

                break;
            case "startRemoteServer":
                // start server for remote access
                break;
            case "getMime":
                this.sendIpc("mimeType", {
                    mime: mime.getType(arg.data.fileName),
                    fileName: arg.data.fileName
                });
            case "downloadFile":
                console.log("downloading file", arg.data);
                let result = await dialog.showSaveDialog(this.browserWindow, {
                    defaultPath: arg.data.fileName
                });
                if (!result.canceled) {
                    let filePath = await fileDecrypt.decryptFromList(this.api.getFile.bind(this.api), arg.data.fileKey, arg.data.iv, arg.data.fileParts, result.filePath, ((percentage) => {
                        this.sendIpc("downloadFile", {
                            transactionId: arg.data.transactionId,
                            fileName: arg.data.fileName,
                            status: "downloading",
                            percentage
                        });
                    }).bind(this));
                    this.sendIpc("downloadFile", {
                        transactionId: arg.data.transactionId,
                        fileName:filePath,
                        status: "done"
                    });
                } else {
                    this.sendIpc("downloadFile", {
                        transactionId: arg.data.transactionId,
                        fileName: arg.data.fileName,
                        status: "aborted"
                    });
                }
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
        this.browserWindow.loadFile(this.rootFile);
        this.browserWindow.webContents.openDevTools();
        this.browserWindow.on("resize", () => {
            config.setAndSave("windowSize", this.browserWindow.getSize());
        });
    }
    getPrivateKey() {
        return parsePrivateKey(this.config.get("credentials:privateKey:encrypted"), this.config.get("credentials:password:sha256"));
    }
}
exports.KryptonBackend = KryptonBackend;