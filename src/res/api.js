const got = require("got"),
    config = require("./config"),
    encryption = require("./encryption");
const forge = require("node-forge");
class Api {
    constructor(kryptonInstance) {
        this.kryptonInstance = kryptonInstance;
    }
    async request(action, data, authenticate, method) {
        try {
            if (authenticate) await this.checkTokenValidity();
            data = {
                ...data,
                ...(authenticate) ? {
                    username: config.get("credentials:username")
                } : {}
            };
            console.log("sending data to server:", data);
            let response = await got(action, {
                method: method ?? "POST",
                json: data,
                headers: {
                    useapi: true, // on krypton-servers useapi will redirect any request to the api, without having to add /api prefix to path (which can change from server to server)
                    ...(authenticate) ? {
                        Authorization: "Bearer " + config.get("credentials:authToken:token")
                    } : {}
                },
                prefixUrl: config.get("server"),
                responseType: 'json'
            });
            return response.body;
        } catch (e) {
            console.warn("Error during request:", e);
            return {
                success: false,
                error: {
                    code: '0x0004',
                    description: 'Server unreachable'
                }
            }
        }
    }
    checkTokenValidity() {
        return new Promise(async (resolve, _reject) => {
            let tolerance = 5000;
            let valid = config.get("credentials:authToken:validUntil") - tolerance < new Date().getTime();
            if (valid) {
                resolve(true);
            } else {
                await this.authenticate();
                resolve(true);
            }
        });
    }
    async authenticate() {
        let response = await this.request("authenticate", {
            username: config.get("credentials:username"),
            password: config.get("credentials:password:sha512")
        });
        if (response.success) {
            config.set("credentials:privateKey:encrypted", response.data.privateKey);

            let validUntil = new Date();
            validUntil.setSeconds(validUntil.getSeconds() + response.data.expires);

            config.setAndSave("credentials:authToken", {
                token: response.data.token,
                validUntil
            });
            return response;
        } else throw response;
    }
    async getFile(id) {
        let response = await this.request("getFile", {
            id
        });
        return response;
    }
    async logIn({
        serverUrl,
        username,
        password
    }) {
        config.setAndSave("server", serverUrl);
        let {
            sha256Password,
            sha512Password
        } = encryption.processPassword(password);

        config.set("signedIn", true);
        config.set("credentials", {
            username,
            password: {
                sha512: sha512Password,
                sha256: sha256Password
            }

        });
        return this.authenticate();
    }


    async signUp({
        serverUrl,
        username,
        password,
        licenceKey,
        createAccountSuccessCallback
    }) {
        config.setAndSave("server", serverUrl);

        let {
            sha256Password,
            sha512Password
        } = encryption.processPassword(password);

        let {
            privateKey,
            publicKey
        } = await encryption.generateKeyPair(sha256Password);

        let response = await this.request("createaccount", {
            username,
            privateKey,
            publicKey,
            licenceKey,
            password: sha512Password
        });

        if (response.success) {
            if (createAccountSuccessCallback) createAccountSuccessCallback();
            return await this.logIn({
                serverUrl,
                username,
                password
            });
        } else {
            return response;
        }

    }
    async getChats() {
        console.log("querying server");
        let response = await this.request("getchatkeys", {}, true);
        // console.log(response);
        let chatKeys = {};
        if (response.success) {
            chatKeys = !response.data ? {} : JSON.parse(this.kryptonInstance.decryptor.aesDecrypt(response.data, config.get("credentials:password:sha256")))
        } else {
            console.warn("failed to get chats:", response.error)
        }
        // chatKeys = {
        //     username: {
        //         chatId,
        //         chatKey
        //     }
        // }
        return chatKeys;
    }
    async updateChatKeys() {
        let response = await this.request("getchatkeyinbox", {}, true);
        let newData = await this.decryptInbox(response.data)
        console.log("decrypted chat inbox:", newData);
        this.setChats(newData);
    }
    /**
     * 
     * newChatInfo = [{
     *      username,
     *      chatId,
     *      chatKey
     *  }, {
     *      username,
     *      chatId,
     *      chatKey
     *  }];
     * 
     * @param {Object} newChatInfo 
     * @returns Promise {Boolean}
     */
    async setChats(newChatInfo) {
        let chatKeys = await this.getChats() ?? {};
        console.log("current chats:", chatKeys);
        for (let {username, chatId, chatKey} of newChatInfo) {
            console.log("trying with username: ", username)
            if (chatKeys[username]) console.warn(`overwriting chatkey with ${username}`);
            chatKeys[username] = {
                chatId,
                chatKey
            }
        };
        this.kryptonInstance.storage.addChats(chatKeys);
        let chatKeysEncrypted = this.kryptonInstance.encryptor.aesEncrypt(JSON.stringify(chatKeys), config.get("credentials:password:sha256"));
        let response = await this.request("updatechatkeys", {
            content: chatKeysEncrypted
        })
        return response.success;
    }

    async getMessages(chatId, offset, count) {
        return await this.request("getMessages", {
            chatid: chatId,
            offset,
            count
        }, false);
    }

    async getPublicKey(user, keepAsPem = false) {
        try {
            let pem = (await this.request("getPublicKey", {
                user
            }, false)).data;
            return keepAsPem ? pem : forge.pki.publicKeyFromPem(pem);
        } catch (e) {
            console.warn(e)
        }
    }

    async sendFile(content) {
        return await this.request("sendfile", {
            content
        });
    }

    async sendMessage({
        content,
        delay,
        chatId
    }) {
        let sendTime;
        if (delay) {
            sendTime = new Date();
            sendTime.setSeconds(sendTime.getSeconds() + delay);
        }
        return await this.request("sendMessage", {
            content,
            chatid: chatId,
            encType: "RSA-AES_CBC",
            sendTime
        })
    }

    async addChatKey({
        username,
        chatKey,
        chatId,
        publicKey
    }) {
        let chats = {};
        chats[username] = {
            chatKey,
            chatId
        };
        this.kryptonInstance.storage.addPublicKey(forge.pki.publicKeyToPem(publicKey), username);
        this.kryptonInstance.storage.addChats(chats);
    }

    async decryptInbox(newKeys) {
        let decryptedKeys = [];
        var privKey = this.kryptonInstance.getPrivateKey();
        for (let keyBundle of newKeys) {
            let {
                username,
                chatKey,
                signature
            } = JSON.parse(keyBundle);
            username = privKey.decrypt(forge.util.hexToBytes(username));
            chatKey = privKey.decrypt(forge.util.hexToBytes(chatKey));
            let chatId = forge.md.sha512.create().update(chatKey).digest().toHex();

            let publicKey = await this.kryptonInstance.storage.getPublicKey(username);

            let md = forge.md.sha1.create();
            md.update(chatKey, 'utf8');
            if (!publicKey.verify(md.digest().bytes(), forge.util.hexToBytes(signature))) continue; // skip this chat key
            decryptedKeys.push({
                username,
                chatKey,
                chatId
            });
        }
        return decryptedKeys;
    }
    async createChat(username) {
        if (!await this.kryptonInstance.storage.hasChat(username)) {
            let publicKey = await this.kryptonInstance.storage.getPublicKey(username);
            let chatKey = forge.random.getBytesSync(200); // 256 is too long for PKCS#1 v1.5 padding
            let chatId = forge.md.sha512.create().update(chatKey).digest().toHex();

            // prepeare bundle
            let encryptedChatKey = forge.util.bytesToHex(publicKey.encrypt(chatKey))
            let encryptedUsername = forge.util.bytesToHex(publicKey.encrypt(config.get("credentials:username")))

            // sign
            let md = forge.md.sha1.create();
            md.update(chatKey, 'utf8');
            console.log(this.kryptonInstance.getPrivateKey());
            let signature = forge.util.bytesToHex(this.kryptonInstance.getPrivateKey().sign(md));

            this.request("addChatKey", {
                user: username,
                content: JSON.stringify({
                    username: encryptedUsername,
                    chatKey: encryptedChatKey,
                    signature
                })
            });

            // this.updateChatKey({
            //     username,
            //     chatKey,
            //     chatId,
            //     publicKey
            // });
        } else {
            // the user allready has a chat with this contact, just select it
            this.kryptonInstance.sendIpc("selectChat", {
                username
            });
        }
    }
    async getProfilePicture(user){
        return (await this.request("getprofilepicture", {user})).data;
    }
    async setProfilePicture(uri){
        let result = await this.request("setprofilepicture", {profilePictureURI:uri}, true);
        console.log(result);
        return result.success;
    }
}
exports.Api = Api;