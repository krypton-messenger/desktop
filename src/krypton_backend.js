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
    path = require("path"),
    fs = require("fs"),
    open = require("open")
forge = require("node-forge"), {
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
    fileDecrypt = require("./res/fileDecrypt"),
    fileEncrypt = require("./res/fileEncrypt"), {
        RemoteServer
    } = require("./res/remoteServer.js");

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
        this.decryptor = new Decryptor(this, this.storage.getPublicKey.bind(this.storage));
        this.ws = new KryptonWebSocket(this);
        this.chatKeyWs = new KryptonWebSocket(this, false);
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

    async showMain() {
        if (this.config.get("credentials:username") && this.config.get("server")) {
            await this.chatKeyWs.start();
            await this.ws.start();
            await this.storage.getChats();
            this.sendIpc("showScreen", {
                screenID: this.SCREENID.MAIN,
                data: {
                    username: this.config.get("credentials:username"),
                    server: this.config.get("server"),
                }
            });
            this.api.updateChatKeys();
            this.chatKeyWs.listenChatKey();
        }
    }
    sendIpc(command, data) {
        for (let i of this.ipcs) {
            i(command, data);
        }
    }
    addIpc(callback) {
        this.ipcs = this.ipcs ?? [];
        this.ipcs.push(callback);
    }

    async handleIpcMessage(event, arg) {
        switch (arg.command) {
            case "startUp":
                this.addIpc((command, data) => {
                    console.log("sending ipc", {
                        command,
                        data
                    });
                    event.reply("message", {
                        command,
                        data
                    });
                });

                if (this.config.get("signedIn")) this.showMain();
                else this.sendIpc("showScreen", {
                    screenID: this.SCREENID.LOGIN,
                    data: {
                        servername: this.config.get("server")
                    }
                });
                break;

            case "logOut":
                this.sendIpc("showScreen", {
                    screenID: this.SCREENID.LOGIN,
                    data: {
                        servername: this.config.get("server")
                    }
                });
                this.config.reset();
                this.storage.reset();
                break;

            case "logIn":
                this.storage.init();
                let logInResponse = await this.api.logIn(arg.data);
                if (logInResponse.success) this.showMain(true);
                else this.sendIpc("error", {
                    error: logInResponse.error.description
                });
                break;

            case "signUp":
                console.log("signing up with given credentials");
                let signUpResponse = await this.api.signUp({
                    createAccountSuccessCallback: (() => {
                        // show login screen if account creates successfully
                        this.sendIpc("showScreen", {
                            screenID: this.SCREENID.LOGIN,
                            data: {
                                servername: this.config.get("server")
                            }
                        });
                    }).bind(this),
                    ...arg.data
                });
                // log in directly if it works
                if (signUpResponse.success) this.showMain(true);
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

            case "openLink":
                console.log(arg.data.url);
                open(arg.data.url);
                break;

            case "requestChatList":
                let requestTime = new Date().getTime();
                this.lastChatListRequest = requestTime;
                console.log("chatlist requested");
                // send what we have
                this.sendIpc("chatListPreflight", await this.storage.getChatsWithPreview(arg.data.query));
                // get an update on the chats, but only if no other request was sent in the time of uptating
                this.storage.addChats(await this.api.getChats()).then(async () => {
                    let result = await this.storage.getChatsWithPreview(arg.data.query);
                    try{
                        result.Users = (await this.api.searchUser(arg.data.query ?? "")).map(x=>{return{username:x}});
                    }catch(_e){}
                    if (this.lastChatListRequest == requestTime) this.sendIpc("chatList", result);
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
                (async () => {
                    this.sendIpc("messages", {
                        messages: await this.storage.loadMessages([{
                            chatId: arg.data.chatId,
                            chatKey: arg.data.chatKey
                        }]),
                        preflight: false
                    });
                    console.log("second ipc");
                }).bind(this)();
                console.log("first ipc");
                this.sendIpc("messages", {
                    messages: await this.storage.getMessages(arg.data.query, arg.data.chatId, arg.data.offset),
                    preflight: true
                });
                // for(let i of await this.api.getMessages(arg.data.chatId).data){
                //     this.storage.decryptAndAddMessage(i);
                // }

                break;
            case "startRemoteServer":
                // start server for remote access
                if (this.remoteServer) this.remoteServer.stop();
                else {
                    this.remoteServer = new RemoteServer(this.handleIpcMessage.bind(this));
                    this.remoteServer.start();
                    let qr = await this.remoteServer.generateQR();
                    this.sendIpc("remoteServer", {
                        url: this.remoteServer.url,
                        qr
                    })
                }
                break;

            case "getMime":
                this.sendIpc("mimeType", {
                    mime: mime.getType(arg.data.fileName),
                    fileName: arg.data.fileName
                });
                break;

            case "setProfilePicture":
                console.log("setting profile picture");
                var result = await dialog.showOpenDialog(this.browserWindow, {
                    buttonLabel: "Set Profile Picture",
                    filters: {
                        name: "Images",
                        extensions: ["JPEG", "PNG", "WebP", "AVIF", "GIF", "SVG", "TIFF"]
                    },
                    properties: ["openFile"]
                });
                if (!result.canceled) {
                    let filePath = result.filePaths[0];
                    let base64Content = fs.readFileSync(filePath).toString("base64")
                    console.log(await this.api.setProfilePicture(`data:${mime.getType(filePath)};base64,${base64Content}`));
                }
                break;

            case "sendFile":
                console.log("attaching file");
                var result = await dialog.showOpenDialog(this.browserWindow, {
                    buttonLabel: "Send",
                    properties: ["openFile"]
                });
                if (!result.canceled) {
                    let filePath = result.filePaths[0];
                    // encrypt and send file

                    let encryptionResult = await fileEncrypt.fromPath(arg.data.quote, filePath, arg.data.chatId, this.api.sendFile.bind(this.api), (async ({
                        content,
                        chatId,
                        quote,
                        messageType
                    }) => {
                        console.log("recieved cdata from file encryptor:", {
                            content,
                            chatId,
                            quote,
                            messageType
                        });
                        let chatKey = await this.storage.chatKeyFromChatId(chatId);
                        let encryptedMessage = await this.encryptor.encryptMessage(content, chatKey, quote, messageType);
                        this.api.sendMessage({
                            content: encryptedMessage,
                            delay: 0,
                            chatId
                        });
                    }).bind(this));
                    console.log(encryptionResult);
                    if (!encryptionResult.success) console.warn("could not send file");
                }
                break;

            case "downloadFile":
                console.log("downloading file", arg.data);
                var result = await dialog.showSaveDialog(this.browserWindow, {
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
                        fileName: filePath,
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

            case "createChat":
                console.log(`creating chat with`, arg.data.username);
                this.api.createChat(arg.data.username);
                break;

            default:
                console.log(`uncaught ipc-command ${arg.command}, nothing done`);
                console.log(arg);
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
module.exports = KryptonBackend;