const {
    resolve
} = require("path"),
    encryption = require("./encryption"),
    sqlite3 = require("sqlite3").verbose();

class UserStorage {
    constructor(kryptonInstance) {
        this.kryptonInstance = kryptonInstance;
        this.chats = [];
        this.api = kryptonInstance.api;
        this.dbLocation = resolve((process.env.APPDATA ?? process.env.HOME) + "./.krypton/userData/userData.db")
        this.init();
    }
    init() {
        this.db = new sqlite3.Database(this.dbLocation);
        this.db.run(`CREATE TABLE IF NOT EXISTS chats (
            chatId TEXT PRIMARY KEY,
            chatKey TEXT NOT NULL,
            username TEXT NOT NULL,
            picture TEXT DEFAULT NULL)`);
        this.db.run(`CREATE TABLE IF NOT EXISTS publicKeys (
                username TEXT PRIMARY KEY,
                publicKey TEXT DEFAULT NULL)`);
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


    reset() {
        this.db.run("DROP TABLE chats");
        this.db.run("DROP TABLE publicKeys");
        this.db.run("DROP TABLE messages");
        this.db.close();
    }
    getChats() {
        this.getPicturesOfMissing();
        return new Promise((resolve, reject) => {
            this.db.all(`SELECT * FROM chats`, (error, rows) => {
                if (error) return reject(error);
                else resolve(rows);
                for (let row of rows) {
                    this.kryptonInstance.ws.listenChat(row.chatId);
                }
                this.getPicturesOfMissing();
            });
        });
    }
    getChatsWithPreview(query) {
        this.lastSearchQuery = query;
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
                if (error) {
                    console.error(error);
                    reject(error);
                } else resolve(rows);
                console.log("chats with preview:", rows);
            })
        });

    }
    async getPublicKey(username) {
        return new Promise((resolve, reject) => {
            this.db.all(`SELECT publicKey FROM publicKeys WHERE username LIKE ?`, [username], async (error, rows) => {
                console.warn(`getting publickey of ${username}`, error, rows);
                if (error) reject(error);
                else if (rows.length>0) resolve(encryption.parsePublicKey(rows[0].publicKey));
                else {
                    let pem = await this.api.getPublicKey(username, true);
                    this.addPublicKey(pem, username);
                    resolve(encryption.parsePublicKey(pem));
                }
            })
        });
    }
    async addPublicKey(pem, username) {
        this.db.run(`INSERT OR IGNORE INTO publicKeys(publicKey, username) VALUES(?, ?);`, [pem, username]);
    }
    getPublicKeysOfMissing() {
        this.db.all(`SELECT DISTINCT sender FROM messages WHERE sender NOT IN (SELECT username FROM publicKeys)`,async (error, rows) => {
            if (error) return error;
            console.log(`getting publickey of missing`, error, rows);
            for (let i of rows) {
                console.log(`getting publickey of ${i.username}`);
                this.addPublicKey(await this.api.getPublicKey(i.username, true), i.username)
            }
        });
    }
    getPicturesOfMissing() {
        this.db.all(`SELECT * FROM chats WHERE picture IS NULL`, async (error, rows) => {
            if (error) return error;
            console.log(rows);
            for (let i of rows) {
                console.log(`getting picture of ${i.username}`);
                let profilePicture = await this.kryptonInstance.api.getProfilePicture(i.username);
                this.db.run(`UPDATE chats SET picture=? WHERE chatId LIKE ?`, [profilePicture, i.chatId], (error)=>{
                    if(error) console.error(error);
                });
            }
        });
    }
    async addChats(values) {
        console.log("adding chats to db:", values);
        for (let username of Object.keys(values)) {
            // this.db.run(`INSERT INTO chats(username, chatId, chatKey) 
            //                 VALUES(?, ?, ?)`,
            this.db.run(`
                INSERT INTO chats(username, chatId, chatKey) 
                SELECT ?, ?, ?
                WHERE NOT(? IN (SELECT chatId FROM chats))`,
                [username, values[username].chatId, values[username].chatKey, values[username].chatId]
            );
            this.kryptonInstance.ws.listenChat(values[username].chatId);
        }
        await this.loadMessages(Object.values(values));
        await this.getPublicKeysOfMissing();
        this.getPicturesOfMissing();
        this.kryptonInstance.sendIpc("chatList", {
            Chats: await this.getChatsWithPreview(this.lastSearchQuery)
        });
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
            let response = await this.api.getMessages(chatId, 0, "ALL");
            console.log(response);
            let messages = [];
            for (let messageData of response.data) {
                let decryptedMessage = (await this.decryptAndAddMessage({
                    chatId,
                    chatKey,
                    ...messageData
                }));
                if (decryptedMessage) messages.push(decryptedMessage)
            }
            return messages;
        }
    }

    hasMessage(messageId) {
        return new Promise((resolve, reject) => {
            this.db.all("SELECT * FROM messages WHERE messageId IS ?", [messageId], (error, rows) => {
                if (error) reject(error);
                if (rows && rows.length > 0) resolve(true);
                else resolve(false);
            });
        });
    }

    hasChat(username) {
        return new Promise((resolve, reject) => {
            this.db.all("SELECT COUNT(`username`) as count FROM chats WHERE `username` IS ?", [username], (error, rows) => {
                if (error) reject(error);
                if (rows[0].count > 0) resolve(true);
                else resolve(false)
            })
        });
    }

    async decryptAndAddMessage(messageData) {
        let messageId = messageData.message_id;
        if (!await this.hasMessage(messageId)) {
            console.warn("message not known yet, adding...")
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
            let content = JSON.stringify(message);
            // insert to db
            return await this.addMessage(messageId, messageData.chatId, sender, direction, timestamp, content, verified, messageType, encryptionType, decryptMsg);
        } else {
            return null;
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
        return new Promise((resolve, reject) => {
            console.log(`adding message #${messageId} to db`);
            this.db.run(`INSERT INTO messages(messageId, chatId, sender, direction, timestamp, content, verified, messageType, encryptionType, systemComment) 
            SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
            WHERE NOT(? IN (SELECT messageId FROM messages))`, [
                messageId,
                chatId,
                sender,
                direction,
                timestamp,
                content,
                verified,
                messageType,
                encryptionType,
                systemComment ?? "",
                messageId
            ], (error) => {
                if (error) reject(console.error(error));
                else resolve({
                    messageId,
                    chatId,
                    sender,
                    direction,
                    timestamp,
                    content,
                    verified,
                    messageType,
                    encryptionType,
                    systemComment: systemComment ?? ""
                });
            });
        });
    }
    chatKeyFromChatId(chatId) {
        return new Promise((resolve, _reject) => {
            this.db.all("SELECT `chatKey` from `chats` WHERE `chatId` LIKE ?;", [chatId], (err, rows) => {
                if (err) console.error(error);
                else if (rows[0]) resolve(rows[0].chatKey);
                else resolve(undefined);
            })
        });
    }

    chatIdFromChatKey(chatKey) {
        return new Promise((resolve, _reject) => {
            this.db.all("SELECT `chatId` from `chats` WHERE `chatKey` LIKE ?;", [chatKey], (err, rows) => {
                if (err) console.error(error);
                else if (rows[0]) resolve(rows[0].chatId);
                else resolve(undefined);
            })
        });
    }

    close() {
        this.db.close((err) => {
            if (err) console.warn("error closing db");
        });
    }
}
exports.UserStorage = UserStorage;