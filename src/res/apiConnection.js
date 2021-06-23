const config = require("./config"),
    forge = require("node-forge"),
    fs = require("fs"),
    got = require("got");


const getUsernameIfNeeded = action => {
    if (isAuthNeeded(action)) return {
        username: config.get("credentials:username")
    };
    else return {};
}

const isAuthNeeded = action => {
    let authNeeded = ["knock", "setprofilepicture", "updatechatkeys", "getchatkeys", "getchatkeyinbox", "getchatkeysinbox", "removechatkey", "removechatkeys", "awaitinbox", "updatechatkeyinbox", "awaitchatkeyinbox"].indexOf(action) >= 0;
    console.log(`authorisation needed: ${authNeeded} for action ${action}`);
    return authNeeded;
}
const authenticate = async () => {
    let response = await request("authenticate", {
        username: config.get("credentials:username"),
        password: config.get("credentials:password:sha512")
    });
    if (response.success) {
        config.setAndSave("credentials:authToken", response.token);
    } else {
        // logout to brutal?
        config.reset();
        socket.anonymousConnection.close();
        win.loadFile(containingFile());
    }
}
const getAuthHeaderIfNeeded = action => {
    if (isAuthNeeded(action)) return {
        Authorization: "Bearer " + config.get("credentials:authToken")
    };
    else return {};
}
const handleError = async response => {
    switch (response.error.code) {
        case "0x001b": // auth token doesn't match
            await authenticate();
            break;
        default:
            return;
    }
    return;
}

const request = async (action, params) => {
    console.log(`requesting ${action}`);
    try {
        let response = await got.post(action, {
            prefixUrl: config.get("server"),
            json: {
                ...params,
                ...getUsernameIfNeeded(action)
            },
            headers: {
                ...getAuthHeaderIfNeeded(action)
            }
        }).json();
        if (response.error) await handleError(response)
        console.log(response);
        return response;
    } catch (err) {
        console.error(err);
        return {
            success: false,
            error: {
                code: '0x0004',
                description: 'Server unreachable'
            }
        }
    }
};
var chatDatabase = {};

exports.aesDecrypt = (message, password) => {
    var [iv, numIterations, salt, encrypted] = message.split("$");
    iv = forge.util.hexToBytes(iv);
    salt = forge.util.hexToBytes(salt);
    encrypted = forge.util.hexToBytes(encrypted);


    var key = forge.pkcs5.pbkdf2(password, salt, Number(numIterations), 16);


    var decipher = forge.cipher.createDecipher('AES-CBC', key);
    decipher.start({
        iv: iv
    });
    decipher.update(forge.util.createBuffer(encrypted));


    decipher.finish();
    return decipher.output.data;

};

exports.aesEncrypt = (message, password, numIterations) => {
    numIterations = numIterations ?? 12;

    var salt = forge.random.getBytesSync(128);
    var iv = forge.random.getBytesSync(16);

    var key = forge.pkcs5.pbkdf2(password, salt, numIterations, 16);

    var cipher = forge.cipher.createCipher('AES-CBC', key);
    cipher.start({
        iv: iv
    });
    cipher.update(forge.util.createBuffer(message));
    cipher.finish();

    return [forge.util.bytesToHex(iv),
        numIterations,
        forge.util.bytesToHex(salt),
        cipher.output.toHex(),
    ].join("$");

};
const removeFromChatKeyInbox = async (entries) => {
    let response = await request("removechatkey", {
        username: config.get("credentials:username"),
        content: entries
    });
    if (response.success) {
        return true;
    } else {
        throw response.error;
    }
}

const getChatKeyInbox = async () => {
    let response = await request("getchatkeyinbox", {
        username: config.get("credentials:username")
    });
    if (response.success) {
        for (let i of JSON.parse(response.data)) {
            let [encryptedUsername, encryptedChatKey, signature] = i.split("::");
            // console.log([encryptedUsername, encryptedChatKey, signature] );
            let sk = this.getOwnPrivateKey();
            let decryptedChatKey = sk.decrypt(forge.util.hexToBytes(encryptedChatKey));
            let decryptedUsername = sk.decrypt(forge.util.hexToBytes(encryptedUsername));

            let sendersPublicKey = await this.getPublicKey(decryptedUsername);
            let md = forge.md.sha1.create();
            md.update(decryptedChatKey, 'utf8');
            if (!sendersPublicKey.verify(md.digest().bytes(), forge.util.hexToBytes(signature))) break; // brutally skip entry if signature can't be verifyed
            else if (this.knowsUsername(decryptedUsername)) break; // skip entry if there is allready a chat with this person
            else {
                updateOwnChatKeys(decryptedUsername, decryptedChatKey, forge.md.sha512.create().update(decryptedChatKey).digest().toHex());
            }
        }
        removeFromChatKeyInbox(response.data);
    }
};
let chatKeyListening;
exports.startChatKeyListener = async () => {
    if (chatKeyListening) return;
    chatKeyListening = true;
    while (config.get("signedIn")) {
        getChatKeyInbox();
        try {
            console.warn("started chatkeylistener")
            // promise will be resolved as soon as the server times out or new chatkey is here
            await request("awaitchatkeyinbox", {
                username: config.get("credentials:username")
            });
        } catch (_e) {
            await (() => {
                return new Promise((resolve, _reject) => {
                    console.log("chatkey listener failed, retrying in 2s...");
                    setTimeout(() => {
                        resolve();
                    }, 2000);
                });
            })();
        }
    }
}

exports.setCredentials = (serverurl, username, password, guest) => {
    return new Promise(async (resolve, reject) => {

        password = {
            sha512: forge.md.sha512.create().update(password).digest().toHex(),
            sha256: forge.md.sha256.create().update(password).digest().toHex()
        };
        if (!guest) {
            config.set("server", serverurl);
            config.setAndSave("credentials", {
                username,
                password
            });
        }

        let response = await request("authenticate", {
            username,
            password: password.sha512
        });
        if (response.success) {
            resolve(response);
            config.set("credentials:privateKey:encrypted", response.data.privateKey);
            config.set("credentials:publicKey:encrypted", response.data.publicKey);
            config.set("signedIn", "true");
            config.setAndSave("credentials:authToken", response.data.token);
            this.startChatKeyListener();
        } else {
            reject(response);
        }
    });
};

exports.createAccount = (serverurl, username, password, licenceKey, guest) => {
    return new Promise(async (resolve, reject) => {

        // hash passwords
        password = {
            plain: password,
            sha512: forge.md.sha512.create().update(password).digest().toHex(),
            sha256: forge.md.sha256.create().update(password).digest().toHex()
        };

        try {
            // generate keyPair
            const keyPair = forge.pki.rsa.generateKeyPair({
                bits: 2048,
                workers: 2
            }, async (err, keypair) => {
                if (err) throw {
                    success: false,
                    error: {
                        description: 'Error while generating keypair:' + err
                    }
                };


                privateKey = forge.pki.encryptRsaPrivateKey(keypair.privateKey, password.sha256, {
                    legacy: true,
                    algorithm: 'aes256'
                });
                publicKey = forge.pki.publicKeyToRSAPublicKeyPem(keypair.publicKey);


                let response = await request("createaccount", {
                    username,
                    privateKey,
                    publicKey,
                    licenceKey,
                    password: password.sha512
                });

                if (response.success) {
                    this.setCredentials(serverurl, username, password.plain, guest).then((result) => {
                        resolve(result);
                    });
                } else {
                    reject(response);
                }
            });
        } catch (e) {
            reject(e);
        }

    });
};

const getChatKeys = async () => {
    let response = await request("getchatkeys", {
        username: config.get("credentials:username")
    });
    if (response.success) {
        // {username:{chatId, chatKey}}
        console.log(!!response.data);
        let chatInformation = !response.data ? {} : JSON.parse(this.aesDecrypt(response.data, config.get("credentials:password:sha256")));
        // add data to local db
        for (let i in chatInformation) {
            chatKeyDatabase[chatInformation[i].chatKey] = {
                username: i,
                chatId: chatInformation[i].chatId
            };
            chatIdDatabase[chatInformation[i].chatId] = {
                username: i,
                chatKey: chatInformation[i].chatKey
            };
            usernameDatabase[i] = {
                chatKey: chatInformation[i].chatKey,
                chatId: chatInformation[i].chatId
            };
        }
        return chatInformation;
    } else {
        throw response
    }
}

const updateOwnChatKeys = async (username, chatKey, chatId) => {
    let chatKeys = getChatKeys();
    chatKeys[username] = {
        chatKey,
        chatId
    };
    let data = this.aesEncrypt(JSON.stringify(chatKeys), config.get("credentials:password:sha256"));
    // auth???
    console.log("updating chat keys");
    let result = await request("updateChatKeys", {
        content: data,
        username: config.get("credentials:username")
    });
    if (result.success) return true;
    else throw result;
}

exports.createChat = async targetUser => {
    if (this.knowsUsername(targetUser)) return false;
    else {
        let chatKey = await forge.random.getBytes(200);

        let recieverPublickey = await this.getPublicKey(targetUser);
        let encryptedChatKey = forge.util.bytesToHex(recieverPublickey.encrypt(chatKey));
        let encryptedOwnUsername = forge.util.bytesToHex(recieverPublickey.encrypt(config.get("credentials:username")));
        let ownPrivateKey = this.getOwnPrivateKey();
        let md = forge.md.sha1.create();
        md.update(chatKey, 'utf8');
        let signature = forge.util.bytesToHex(ownPrivateKey.sign(md));

        var encryptedBundle = [encryptedOwnUsername, encryptedChatKey, signature].join("::");
        let response = await request("addchatkey", {
            user: targetUser,
            content: encryptedBundle
        });

        if (response.success) {
            let chatId = forge.md.sha512.create().update(chatKey).digest().toHex()
            updateOwnChatKeys(targetUser, chatKey, chatId);
            return true;
        } else {
            throw {
                success: false,
                data: response.error.description
            };
        }
    }
}

var cache = {};
exports.getPublicKey = async user => {
    if (cache.publickeys && cache.publickeys[user]) return cache.publickeys[user]
    else cache.publickeys = cache.publickeys ?? {}
    let response = await request("getpublickey", {
        user
    });
    try {

        if (response.success) {
            cache.publickeys[user] = forge.pki.publicKeyFromPem(response.data);
            return cache.publickeys[user];
        }
    } catch {
        throw ("failed to get public key");
    }
    throw response
}

exports.getMessagesFromStorage = (chatid) => {
    if (chatDatabase[chatid]) return Object.values(chatDatabase[chatid].messages);
    else return false;
}
exports.getOwnPrivateKey = () => {
    return forge.pki.decryptRsaPrivateKey(config.get("credentials:privateKey:encrypted"), config.get("credentials:password:sha256"));
}
exports.sendFile = async (content) => {
    let response = await request("sendfile", {
        content
    });
    return response
}
exports.getFile = async (id) => {
    let response = await request("getFile", {
        id
    });
    return response;
}

exports.sendMessage = async (value, chatid, quote, messageType) => {
    if (!value.length) throw {
        "error": "Can't send empty message"
    }
    let msgcontent = JSON.stringify({
        value,
        quote
    });
    let sk = this.getOwnPrivateKey();

    let md = forge.md.sha1.create().update(msgcontent, 'utf8');
    let signature = forge.util.bytesToHex(sk.sign(md));
    let chatKey = this.chatIdToChatKey(chatid);
    if (!chatKey) {
        console.log("tying to get chatkey for " + chatid);
        throw {
            "error": "Could not send message, Key not found"
        }
    }

    let content = this.aesEncrypt([config.get("credentials:username"), forge.util.bytesToHex(forge.util.encodeUtf8(msgcontent)), signature, messageType ?? "text"].join("::"), chatKey);
    try {
        let serverResponse = await request("sendmessage", {
            content,
            chatid,
            encType: "RSA-AES_CBC"
        });
        if (serverResponse.success) {
            return serverResponse;
        } else {
            throw {
                "error": serverResponse.error
            }
        }
    } catch (e) {
        console.log(e);
        if (e.error) throw e
        else throw {
            "error": "server unreachable"
        }
    }

}
exports.decryptMessage = async (encryptedContent, chatKey, message_id, chat_id, encryptionType, timestamp) => {
    // decrypt message
    let [sender, content, signature, messageType] = this.aesDecrypt(encryptedContent, chatKey).split("::");
    try {

        // decode content
        content = forge.util.decodeUtf8(forge.util.hexToBytes(content));

        // verify sender
        let verified, decryptMsg;
        try {
            let publickey = await this.getPublicKey(sender);
            let md = forge.md.sha1.create();
            md.update(content, 'utf8');
            verified = publickey.verify(md.digest().bytes(), forge.util.hexToBytes(signature));
            //                console.log(`verifying sender ${sender} returned ${verified}`);
        } catch (e) {
            console.log("error while verifying:", e);
            verified = false;
            decryptMsg = "error while verifying"
        }


        // parse content
        message = JSON.parse(content);

        var messageData = {
            message_id,
            sender,
            verified,
            messageType,
            message,
            chat_id,
            direction: sender == config.get("credentials:username") ? "sent" : "recieved",
            encryptionType,
            timestamp,
            ...decryptMsg ? {
                decryptMsg
            } : null

        };

    } catch (e) {
        var messageData = {
            message_id,
            sender,
            verified: false,
            messageType,
            message: {
                value: "ERR_DECRYPT"
            },
            chat_id,
            direction: sender == config.get("credentials:username") ? "sent" : "recieved",
            encryptionType,
            timestamp,
            decryptMsg: "Error decrypting message"
        };
        console.log(e);
    }
    if (!chatDatabase[chat_id]) chatDatabase[chat_id] = {
        title: undefined,
        chatKey,
        messages: {}
    };
    chatDatabase[chat_id].messages[message_id] = messageData;
    return messageData;
};

exports.getMessages = async (chatid, chatKey, limit, offset, desc) => {
    let response = await request("getmessages", {
        chatid,
        limit: limit ?? NaN,
        offset: offset ?? NaN,
        desc
    });

    let messages = [];
    if (response.success) {
        for (var i of response.data) {
            messages.push(await this.decryptMessage(i.content, chatKey, i.message_id, i.chat_id, i.encryptionType, i.timestamp));
        }
        return messages;
    } else {
        throw {
            success: false,
            data: []
        }
    }
}
var chatKeyDatabase = {};
var usernameDatabase = {};
var chatIdDatabase = {};
// exports.chatIdToChatKey = async (chatId) => {
//     if (chatKeyDatabase[chatId]) return chats[chatId];
//     chats = await this.getChats(true);
//     //    console.log(chats);
//     return chats[chatId];
// }
exports.knowsUsername = (username) => {
    console.log(`checking for username ${username}`);
    return usernameDatabase[username] !== undefined;
}
exports.chatIdToChatKey = (chatId) => {
    if (chatIdDatabase[chatId]) return chatIdDatabase[chatId].chatKey;
    else return false;
}

exports.chatIdToUsername = (chatId) => {
    if (chatIdDatabase[chatId]) return chatIdDatabase[chatId].username;
    else return false;
}
exports.usernameToChatKey = (username) => {
    if (usernameDatabase[username]) return usernameDatabase[username].chatKey;
    else return false;
}
exports.usernameToChatId = (username) => {
    if (usernameDatabase[username]) return usernameDatabase[username].chatId;
    else return false;
}

exports.chatKeyToChatId = (chatKey) => {
    if (chatKeyDatabase[chatKey]) return chatKeyDatabase[chatKey].chatId;
    else return false;
}

exports.chatKeyToUsername = (chatKey) => {
    if (chatKeyDatabase[chatKey]) return chatKeyDatabase[chatKey].username;
    else return false;
}

exports.getChats = async (chatkeysonly) => {
    let chatInformation = await getChatKeys();
    if (chatkeysonly) {
        let chats = {};
        for (var i in chatInformation) {
            chats[chatInformation[i].chatId] = chatInformation[i].chatKey
            // chatKeyDatabase[chatInformation[i].chatId] = chatInformation[i].chatKey

        }
        return chats;
    } else {
        let chats = [];
        for (var i in chatInformation) {
            let profilePicture = await this.getProfilePicture(i);
            let messages = await this.getMessages(chatInformation[i].chatId, chatInformation[i].chatKey, 1, 0, true);
            console.log("messagelength ", messages.length);
            chats.push({
                username: i,
                profilePicture,
                lastMessage: messages[0],
                chatid: chatInformation[i].chatId,
                chatKey: chatInformation[i].chatKey
            })
        }
        return chats;
    }
};

exports.getProfilePicture = async username => {
    let response = await request("getprofilepicture", {
        user: username
    });
    if (response.success) {
        return response.data;
    } else {
        throw response;
    }
};
exports.search = {};
exports.search.messages = query => {
    return [{
        "message_id": 1,
        "sender": "tim",
        "verified": true,
        "messageType": "text",
        "message": {
            "value": "hello"
        },
        "chat_id": "d6b1a5a8f03f18ce0b2670ea89dd2854a1e6101a8cb11e28810b973e495a14d9e1c89100f82edf4a65162e21471d94e0bee1a8e9e3fc823aaf9b58f5116cd2a8",
        "direction": "sent",
        "encryptionType": "RSA-AES_CBC",
        "timestamp": "2021-05-21T10:09:11.686Z"
    }];
};
exports.search.chats = query => {
    return [{
        "username": "tim",
        "profilePicture": null,
        "lastMessage": {
            "message_id": 1,
            "sender": "tim",
            "verified": true,
            "messageType": "text",
            "message": {
                "value": "hello"
            },
            "chat_id": "d6b1a5a8f03f18ce0b2670ea89dd2854a1e6101a8cb11e28810b973e495a14d9e1c89100f82edf4a65162e21471d94e0bee1a8e9e3fc823aaf9b58f5116cd2a8",
            "direction": "sent",
            "encryptionType": "RSA-AES_CBC",
            "timestamp": "2021-05-21T10:09:11.686Z"
        },
        "chatid": "d6b1a5a8f03f18ce0b2670ea89dd2854a1e6101a8cb11e28810b973e495a14d9e1c89100f82edf4a65162e21471d94e0bee1a8e9e3fc823aaf9b58f5116cd2a8",
        "chatKey": "Oû),|ùO0NçSÄ.@xÞ¿>({i¸Ig÷%§ÂM¾²ÜUòGb+Ö­\b$dz¾8c7<+µªïj	®if®?Ý«(×1øßÀ=%B)Ü¤/%¨ÐÔ#D.!« Ëôsc¦¶ÿx=¾.áñôt³6hÃbJºoóü¸»¼áLÝswF¥;8p!aÙiÕ9-¾ù`¼RV	TOã[åQëß¨fâU]Ä'I"
    }];
};
exports.search.users = query => {
    return [{
        "username": "tim",
        "profilePicture": null
    }];
};