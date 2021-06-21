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
    fs = require("fs"),
    forge = require("node-forge"),
    WebSocket = require('ws'),
    config = require("./app/config"),
    apiConnection = require("./app/apiConnection");


const containingFile = () => {
    console.log("loginstate: ", config.get("signedIn"));
    return config.get("signedIn") ? "app/renderer/main.html" : "app/renderer/login.html"
};

var win;

function createWindow() {
    var configSize = config.get("windowSize") ?? [800, 600];
    win = new BrowserWindow({
        minWidth: 300,
        minHeight: 500,
        width: configSize[0],
        height: configSize[1],
        frame: false,
        webPreferences: {
            preload: path.join(__dirname, "app/renderer/preload.js"),
        }
    });

    win.setMenuBarVisibility(true);
    win.setMenu(new Menu());
    win.setIcon(nativeImage.createFromPath("app/icon.png"));
    win.loadFile(containingFile());

    win.on("resize", () => {
        config.setAndSave("windowSize", win.getSize());
    });
}

app.on("ready", createWindow);

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
    }
});

var socket = {};
Object.defineProperty(socket, "chats", {
    set: value => {
        console.log("set chats, ready = %s", socket.anonymousConnection.readyState);
        if (socket.anonymousConnection.readyState == 1) {
            for (var i of value) {
                console.log(i.chatid);
                socket.anonymousConnection.send(JSON.stringify({
                    action: "listen",
                    data: [i.chatid]
                }));

            }
        } else {
            socket.anonymousConnection.on("ready", () => {
                socket.chats = socket.chats
            });
        }
        socket._chats = value;
    },
    get: () => {
        return socket._chats
    }
})

const startAnonymousWebSocket = () => {
    if (config.get("signedIn")) {
        console.log(config.get("server"));
        socket.anonymousConnection = new WebSocket(`ws://${config.get("server").match(/:\/\/([^\/]*)(\/(.*))?/)[1]+":8080/"+config.get("server").match(/:\/\/([^\/]*)(\/(.*))?/)[2]}`);
        console.log(socket);
        console.log("anonymous websocket started");
        socket.anonymousConnection.on('close', () => {
            socket.feed("message", {
                trigger: "socket_disconnected",
                success: false,
                data: "Server closed anonymous websocket-connection"
            })
        });
        socket.anonymousConnection.on('message', async msg => {
            console.log("\n\n\nnew socket message:", msg);
            msg = JSON.parse(msg);
            console.log("\n\n\nnew socket message (parsed):", msg);
            if (msg.trigger == "newmessage") {
                chatKey = await apiConnection.chatIdToChatKey(msg.data.chatid);
                console.log("feeding message via ipc");
                let data = await apiConnection.decryptMessage(msg.data.content, chatKey, msg.data.message_id, msg.data.chatid, msg.data.encryptionType, msg.data.timestamp);
                data.encryptionType = msg.data.encType;
                data.timestamp = msg.data.sendtime;
                //                data.chat_id = msg.data.chatid;
                console.log(socket.feed);
                socket.feed("message", {
                    trigger: "socket_message",
                    data: [data]
                })
            }
        });
        socket.chats = socket.chats;
    } else {
        console.log("skipped startAnonymousWebSocket because user is not signed in");
    }
}
startAnonymousWebSocket();

const startAuthenticatedWebSocket = () => {
    if (config.get("signedIn")) {
        console.log(config.get("server"));
        socket.authenticatedConnection = new WebSocket(`ws://${config.get("server").match(/:\/\/([^\/]*)(\/(.*))?/)[1]+":8080/"+config.get("server").match(/:\/\/([^\/]*)(\/(.*))?/)[2]}`);
        console.log(socket);
        console.log("authenticated websocket started");
        socket.authenticatedConnection.on("close", () => {
            socket.feed("message", {
                trigger: "socket_disconnected",
                success: false,
                data: "Server closed authenticated websocket-connection"
            })
        });
        socket.authenticatedConnection.on("message", async msg => {
            console.log("new authsocket message:", msg);
            msg = JSON.parse(msg);
            console.log("new authsocket message (parsed):", msg);
            switch (msg.trigger) {
                case "newchatkey":
                    // handle new chat key
                    break;
                case "notAuthenticated":
                    // re-auth
                    break;
            }
        });
        socket.authenticatedConnection.on("ready", () => {
            socket.authenticatedConnection.send({
                action: "authenticate",
                data: {
                    authToken: config.get("credentials:authToken"),
                    username: config.get("credentials:username")
                }
            });
        })
    }
};

ipcMain.on("message", async (event, arg) => {
    switch (arg.command) {
        case "search":
            console.log(arg);
            console.log("searching for " + arg.data.query);
            let response = {
                result: {}
            };
            try {
                response.result.messages = apiConnection.search.messages(arg.data.query);
                response.result.chats = apiConnection.search.chats(arg.data.query);
                response.result.users = apiConnection.search.users(arg.data.query);
                response.success = true;
            } catch (e) {
                response.success = false;
                response.error = e;
            }

            event.reply("message", {
                trigger: arg.command,
                ...response
            })
            break;
        case "sendmessage":
            try {

                event.reply("message", {
                    trigger: arg.command,
                    ...await apiConnection.sendMessage(arg.data.content, arg.data.chatId, arg.data.quote)
                });
            } catch (e) {

                event.reply("message", {
                    trigger: arg.command,
                    success: false,
                    ...e
                });
            }
            break;

        case "windowStateChange":
            switch (arg.data) {
                case "minimize":
                    win.minimize();
                    break;
                case "toggleMaximize":
                    if (win.isMaximized()) win.unmaximize()
                    else win.maximize();
                    break;
                case "close":
                    win.close();
                    break;
                case "openDebug":
                    win.webContents.openDevTools();
                    break;
                default:
                    console.log("unknown operation:" + arg.data);
                    break;
            }
            break;

        case "login":
            try {
                await apiConnection.setCredentials(arg.data.serverurl, arg.data.username, arg.data.password);
                event.reply("message", {
                    trigger: arg.command,
                    success: true
                });
                setTimeout(() => {
                    win.loadFile(containingFile());
                    startAnonymousWebSocket();
                }, 350);
            } catch (e) {
                console.log("failed to sign in:");
                console.log(e);
                event.reply("message", {
                    trigger: arg.command,
                    ...e
                });
            }
            break;

        case "signup":
            try {
                await apiConnection.createAccount(arg.data.serverurl, arg.data.username, arg.data.password, arg.data.licenceKey);

                event.reply("message", {
                    trigger: arg.command,
                    success: true
                });
                setTimeout(() => {
                    win.loadFile(containingFile());
                }, 350);
            } catch (e) {
                console.log("failed to create account in:");
                console.log(e);
                event.reply("message", {
                    trigger: arg.command,
                    ...e
                });
            }
            break;


        case "logout":

            try {
                config.reset();
                event.reply("message", {
                    trigger: arg.command,
                    success: true
                });
                socket.anonymousConnection.close();
                win.loadFile(containingFile());
            } catch (e) {
                event.reply("message", {
                    trigger: arg.command,
                    success: false
                });
                console.log(["failed to sign out", e]);
            }
            break;

        case "getmessages":

            try {
                event.reply("message", {
                    trigger: arg.command,
                    success: true,
                    data: apiConnection.getMessagesFromStorage(arg.data.chatid)
                });


                event.reply("message", {
                    trigger: arg.command,
                    success: true,
                    data: await apiConnection.getMessages(arg.data.chatid, arg.data.chatKey, 50, arg.data.offset, true)
                });
            } catch (e) {
                event.reply("message", {
                    trigger: arg.command,
                    success: false
                });
                console.log(["failed to get messages", e]);
            }
            break;

        case "toggleLoginView":

            try {
                if (arg.data.newView == "signup") {
                    win.loadFile("app/renderer/signup.html");
                    console.log("loaded signup view");
                } else if (arg.data.newView == "login") {
                    win.loadFile("app/renderer/login.html");
                    console.log("loaded login view");
                } else {
                    console.log(arg.data.newView, "unknown view");
                }
                event.reply("message", {
                    trigger: arg.command,
                    success: true
                });
            } catch (e) {
                event.reply("message", {
                    trigger: arg.command,
                    success: false
                });
                console.log(["failed to sign out", e]);
            }
            break;

        case "getConfigCredentials":
            event.reply("message", {
                trigger: arg.command,
                username: config.get("credentials:username"),
                server: config.get("server")
            });
            break;

        case "chatList":
            try {
                var contacts = await apiConnection.getChats();
                socket.feed = event.reply;
                socket.chats = contacts;

                event.reply("message", {
                    trigger: arg.command,
                    success: true,
                    data: contacts
                });
            } catch (e) {
                console.log("failed to get contacts:");
                console.log(e);
                event.reply("message", {
                    trigger: arg.command,
                    ...e
                });
            }
            break;



        case "downloadFile":
            console.log("downloading file", arg);

            // docs: https://github.com/electron/electron/blob/master/docs/api/dialog.md#dialogshowsavedialogbrowserwindow-options
            console.log("save as " + arg.data.title);
            let result = await dialog.showSaveDialog({
                defaultPath: arg.data.title
            });
            if (!result.canceled) {
                event.reply("message", {
                    trigger: arg.command,
                    success: undefined,
                    data: `Downloading ${arg.data.title}`
                });
                console.log(`saving to ${result.filePath}`);
            } else {
                event.reply("message", {
                    trigger: arg.command,
                    success: false,
                    data: "Download aborted by user"
                });
            }
            break;

        case "ownProfile":
            try {
                var profilePicture = await apiConnection.getProfilePicture(config.get("credentials:username"));
                event.reply("message", {
                    trigger: arg.command,
                    success: true,
                    data: {
                        profilePictureURI: profilePicture,
                        username: config.get("credentials:username")
                    }
                });
            } catch (e) {
                console.log("failed to get own profile information:");
                console.log(e);
                event.reply("message", {
                    trigger: arg.command,
                    ...e
                });
            }
            break;

        case "connectSocket":
            startAnonymousWebSocket();
            break;
            
        case "createChat":
            event.reply("message", {
                trigger: arg.command,
                success: false,
                data: "Username doesn't exist"
            });
            break;
            
        default:
            console.log("unknown command " + arg.command);
            console.log(arg);

    }
})
