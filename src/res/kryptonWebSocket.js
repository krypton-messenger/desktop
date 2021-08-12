const ws = require("ws");
const sleep = require("./sleep");
class KryptonWebSocket {
    constructor(kryptonInstance, anonymousUse) {
        this.anonymous = anonymousUse ?? true;
        this.kryptonInstance = kryptonInstance;
        this.listeners = {};
    }
    get serverURL() {
        return `ws://${this.kryptonInstance.config.get("server").match(/:\/\/([^\/]*)(\/(.*))?/)[1]+":8080/"+this.kryptonInstance.config.get("server").match(/:\/\/([^\/]*)(\/(.*))?/)[2]}`
    }
    set socketConnection(value) {
        this._socketConnection = value;
        this._socketConnection.on("message", message => {
            message = JSON.parse(message);
            console.log("new socket message:", message);
            switch (message.trigger.toLowerCase()) {
                case "newmessage":
                    for (let i of message.data) {
                        console.log(`new socket message ${i.chat_id}, calling callbacks`, this.listeners[i.chat_id])
                        for (let callback of this.listeners[i.chat_id] ?? []) {
                            console.log("websocket incomming", i.data);
                            console.log(message.data.message_id);
                            callback({
                                chatId: i.chat_id,
                                content: i.content,
                                messageId: i.message_id,
                                encryptionType: i.encryptionType,
                                timestamp: i.timestamp
                            })
                        }
                    }
                    break;
                case "newchatkey":
                    this.kryptonInstance.api.updateChatKeys();
                    break;
                default:
                    console.warn(`unexpected message trigger: ${message.trigger}`);
                    break;
            }
        });
        this._socketConnection.on("close", (() => {
            console.warn("socket closed connection, retrying")
            this.socketConnection = new ws(this.serverURL);
            this.socketConnection.on("open", (() => {
                this.send("listen", [...Object.keys(this.listeners)]);
            }).bind(this));
        }).bind(this));
        this._socketConnection.on("error", (async () => {
            for (let i = 0; i < 20; i++) {
                await sleep(500);
                this.start();
            }
        }).bind(this));
    }
    get socketConnection() {
        return this._socketConnection;
    }
    start() {
        return new Promise((resolve, _reject) => {
            this.socketConnection = new ws(this.serverURL);
            this.socketConnection.on("open", () => {
                resolve();
            })
        })
    }
    send(action, data) {
        this.socketConnection.send(JSON.stringify({
            action,
            data
        }));
    }
    listenChat(chatId, callback, force) {
        if (!this.anonymous) {
            console.error("forbidden to listen to chat over onymous connection");
            throw new Error("ERR_CHATKEY_ON_ONYMOUS_WEBSOCKET");
        } else {
            if (!this.listeners[chatId]) {
                this.listeners[chatId] = [];
                console.log("listening for chat", chatId);
                this.send("listen", [chatId]);
                force = true;
            }
            if (force) {
                if (!callback) {
                    callback = (async ({
                        chatId,
                        content,
                        messageId,
                        encryptionType,
                        timestamp
                    }) => {
                        console.warn("new message recieved over socket", chatId);
                        console.log(messageId);
                        console.log(this.kryptonInstance);
                        this.kryptonInstance.sendIpc("socketMessage", {
                            messages: [await this.kryptonInstance.storage.decryptAndAddMessage({
                                chatId,
                                chatKey: await this.kryptonInstance.storage.chatKeyFromChatId(chatId),
                                content,
                                message_id: messageId,
                                encryptionType,
                                timestamp
                            })]
                        });
                    });
                }
                this.listeners[chatId].push(callback.bind(this));
            }
        }
    }
    listenChats(chatData, callback) {
        for (let i of chatData)
            this.listenChat(i.chatId, callback);
    }
    listenChatKey() {
        if (this.anonymous) {
            console.error("forbidden to listen to chatkey over anonymous connection");
            throw new Error("ERR_CHATKEY_ON_ANONYMOUS_WEBSOCKET");
        } else {
            this.send("listenChatKey", {
                username: this.kryptonInstance.config.get("credentials:username")
            });
        }
    }
}
exports.KryptonWebSocket = KryptonWebSocket;