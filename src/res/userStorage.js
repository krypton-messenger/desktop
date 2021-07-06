const {
    resolve
} = require("path");

const sqlite3 = require("sqlite3").verbose();

class UserStorage {
    constructor(kryptonInstance) {
        this.kryptonInstance = kryptonInstance;
        this.chats = [];
        this.api = kryptonInstance.api;
        this.dbLocation = (process.env.APPDATA ?? process.env.HOME) + "/.krypton/userData/userData.db"
        this.init();
    }
    init() {
        this.db = new sqlite3.Database(this.dbLocation);
        this.db.run(`CREATE TABLE IF NOT EXISTS chats (
            chatId TEXT PRIMARY KEY, 
            chatKey TEXT NOT NULL, 
            username TEXT NOT NULL,
            picture TEXT DEFAULT NULL)`);
        this.db.run(`CREATE TABLE IF NOT EXISTS messages (
            messageId TEXT PRIMARY KEY, 
            chatId TEXT NOT NULL, 
            sender TEXT NOT NULL,
            direction TEXT NOT NULL,
            timestamp INTEGER NOT NULL,
            content TEXT NOT NULL,
            verified INTEGER DEFAULT 0,
            messageType TEXT NOT NULL,
            encryptionType TEXT NOT NULL,
            systemComment TEXT DEFAULT NULL)`);
    }
    getChats() {
        return new Promise((resolve, reject) => {
            this.db.all(`select * FROM chats`, (error, rows) => {
                if (error) reject(error);
                else resolve(rows);
            })
        });
    }
    getChatsWithPreview() {
        // return {
        //     Chats: [{
        //         title: "admin",
        //         subtitle: "good morning, i was thinking we could get a beer?",
        //         timestamp: 1624540755,
        //         picture: "data:",
        //         // chatId,
        //         // chatKey,
        //         // username
        //     }]
        // };
        // return [];
        return new Promise((resolve, reject) => {
            this.db.all(`
            SELECT * FROM 
                (SELECT * from chats
                    LEFT JOIN messages
                    on chats.chatId = messages.chatId
                ORDER BY timestamp DESC)
            GROUP BY chatId`, (error, rows) => {
                if (error) reject(error);
                else resolve(rows);
            })
        });

    }
    async getPicturesOfMissing() {
        this.db.all(`SELECT * FROM chats WHERE picture IS NULL`, (error, rows) => {
            if (error) return error;
            console.log(rows);
            for (let i of rows) {
                console.log(`getting picture of ${i.username}`);
            }
        });
    }
    async addChats(values) {
        console.log("adding chats to db");
        for (let username of Object.keys(values)) {
            // this.db.run(`INSERT INTO chats(username, chatId, chatKey) 
            //                 VALUES(?, ?, ?)`,
            this.db.run(`
                INSERT INTO chats(username, chatId, chatKey) 
                SELECT ?, ?, ?
                WHERE NOT(? IN (SELECT chatId FROM chats))`,
                [username, values[username].chatId, values[username].chatKey, values[username].chatId]
            );
            this.kryptonInstance.ws.listenChat(values[username].chatId, async ({
                chatId,
                content,
                messageId,
                encryptionType,
                timestamp
            }) => {
                console.warn("new message recieved over socket", chatId);
                this.kryptonInstance.sendIpc("socketMessage", {
                    messages: [await this.decryptAndAddMessage({
                        chatId,
                        chatKey: values[username].chatKey,
                        content,
                        messageId,
                        encryptionType,
                        timestamp
                    })]
                });
            });
        }
        await this.loadMessages(Object.values(values));
        await this.getPicturesOfMissing();
        return true;
    }
    async loadMessages(chats) {
        console.log("loading messages of chats", chats);
        for (let {
                chatId,
                chatKey
            } of chats) {
            console.log("locaing messages of chat", chatId, chatKey);
            // collect all data
            let response = await this.api.getMessages(chatId, 0, Infinity);
            console.log(response);
            for (let messageData of response.data) {
                await this.decryptAndAddMessage({
                    chatId,
                    chatKey,
                    ...messageData
                })
            }
        }
    }

    hasMessage(messageId) {
        console.log("checking for existance of message with id", messageId);
        return new Promise((resolve, reject) => {
            this.db.all("SELECT * FROM messages WHERE messageId IS ?", [messageId], (error, rows) => {
                if (error) reject(error);
                if (rows.length > 0) resolve(true);
                else resolve(false);
            });
        });
    }

    async decryptAndAddMessage(messageData) {
        let messageId = messageData.message_id;
        if (!await this.hasMessage(messageId)) {
            console.warn("message not known yet, adding...")
            console.log(messageData.chatKey)
            let {
                sender,
                verified,
                messageType,
                message,
                direction,
                decryptMsg
            } = await this.kryptonInstance.decryptor.decryptMessage(messageData.content, messageData.chatKey);
            let timestamp = new Date(messageData.timestamp).getTime() / 1000;
            let encryptionType = messageData.encryptionType;
            // insert to db
            this.addMessage(messageId, messageData.chatId, sender, direction, timestamp, message, verified, messageType, encryptionType, decryptMsg);
            return {
                messageId,
                chatId: messageData.chatId,
                sender,
                direction,
                timestamp,
                message,
                verified,
                messageType,
                encryptionType,
                systemComment: decryptMsg
            }
        }
    }

    getMessages(contentQuery, chatId, limit, offset) {
        return new Promise((resolve, _reject) => {
            let proccessedQuery = contentQuery ? `%${contentQuery}%` : "%";
            if (limit) {
                var sql = `SELECT * FROM messages WHERE content LIKE ? AND chatId LIKE ? LIMIT ? OFFSET ?`;
                var args = [proccessedQuery, chatId ?? "%", limit, offset ?? 0]
            } else {
                var sql = `SELECT * FROM messages WHERE content LIKE ? AND chatId LIKE ? `;
                var args = [proccessedQuery, chatId ?? "%"];
            }
            this.db.all(sql, args,
                (error, rows) => {
                    console.log({
                        sql,
                        args,
                        rows
                    });
                    if (error) console.error(error);
                    else resolve(rows);
                });
        });
    }

    addMessage(messageId, chatId, sender, direction, timestamp, content, verified, messageType, encryptionType, systemComment) {
        console.log(`adding message #${messageId} to db`);
        this.db.run(`INSERT INTO messages(messageId, chatId, sender, direction, timestamp, content, verified, messageType, encryptionType, systemComment) 
                                SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
                                WHERE NOT(? IN (SELECT messageId FROM messages))`, [
            messageId,
            chatId,
            sender,
            direction,
            timestamp,
            JSON.stringify(content),
            verified,
            messageType,
            encryptionType,
            systemComment ?? "",
            messageId
        ], (error) => {
            if (error) console.error(error);
        });
    }
    close() {
        this.db.close();
    }
    reset() {
        this.db.run("DROP TABLE messages");
        this.db.run("DROP TABLE chats");
        this.db.close();
    }
}
exports.UserStorage = UserStorage;