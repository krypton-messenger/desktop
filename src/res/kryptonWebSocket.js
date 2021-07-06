const ws = require("ws");
class KryptonWebSocket {
    constructor(kryptonInstance) {
        this.kryptonInstance = kryptonInstance;
        this.socketConnection = new ws(this.serverURL);
        this.listeners = {};
    }
    get serverURL() {
        return `ws://${this.kryptonInstance.config.get("server").match(/:\/\/([^\/]*)(\/(.*))?/)[1]+":8080/"+this.kryptonInstance.config.get("server").match(/:\/\/([^\/]*)(\/(.*))?/)[2]}`
    }
    set socketConnection(value) {
        this._socketConnection = value;
        this._socketConnection.on("message", message => {
            message = JSON.parse(message);
            if (message.trigger == "newmessage") {
                for (let callback of this.listeners[message.data.chatid]) {
                    callback({
                        chatId: message.data.chatid,
                        content: message.data.content,
                        messageId: message.data.message_id,
                        encryptionType: message.data.encryptionType,
                        timestamp: message.data.timestamp
                    })
                }
            } else console.warn(`unexpected message trigger: ${message.trigger}`);

        })
    }
    get socketConnection(){
        return this._socketConnection;
    }
    send(action, data) {
        this.socketConnection.send(JSON.stringify({
            action,
            data
        }));
    }
    listenChat(chatId, callback, force) {
        if (!this.listeners[chatId]) {
            this.listeners[chatId] = [];
            console.log("listening for chat", chatId);
            this.send("listen", [chatId]);
        } else force = true;
        if (force) {
            this.listeners[chatId].push(callback);
        }
    }
    listenChats(chatData, callback) {
        for (let i of chatData)
            this.listenChat(i.chatId, callback);
    }

}
exports.KryptonWebSocket = KryptonWebSocket;