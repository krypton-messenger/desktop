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
                headers: (authenticate) ? {
                    Authorization: "Bearer " + config.get("credentials:authToken:token")
                } : {},
                prefixUrl: config.get("server"),
                responseType: 'json'
            });
            return response.body;
        } catch (e) {
            console.warn("error during request:", e);
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
    async getFile (id){
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
        } = encryption.generateKeyPair(sha256Password);

        let response = await this.request("createaccount", {
            username,
            privateKey,
            publicKey,
            licenceKey,
            password: sha512Password
        });

        if (response.success) {
            if (createAccountSuccessCallback) createAccountSuccessCallback();
            return await this.logIn(serverUrl, username, password);
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
    async getMessages(chatId, offset, count) {
        return await this.request("getMessages", {
            chatid: chatId,
            offset,
            count
        }, false);
    }

    async getPublickey(user) {
        try{

            return forge.pki.publicKeyFromPem((await this.request("getPublicKey", {
                user
            }, false)).data)
        }catch(e){
            console.warn(e)
        }
    }
    async sendMessage({content, delay, chatId}) {
        let sendTime;
        if (delay) {
            sendTime = new Date();
            sendTime.setSeconds(sendTime.getSeconds()+delay);
        }
        return await this.request("sendMessage", {
            content,
            chatid: chatId,
            encType: "RSA-AES_CBC",
            sendTime
        })
    }
}
exports.Api = Api;