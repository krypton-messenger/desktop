const config = require("./config"),
    forge = require("node-forge"),
    fs = require("fs"),
    got = require("got");


const request = async (action, params) => {
    console.log(`requesting ${action}`);
    try {
        return await got.post(action, {
            prefixUrl: config.get("server"),
            json: params,
        }).json();
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

const aesDecrypt = (message, password) => {
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


    var result = decipher.finish();
    return decipher.output.data;

};

const aesEncrypt = (message, password, numIterations) => {
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
                    exports.setCredentials(serverurl, username, password.plain, guest).then((result) => {
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
    return Object.values(chatDatabase[chatid].messages);
}

exports.sendMessage = async (value, chatid, quote, messageType) => {
    if (!value.length) throw {
        "error": "Can't send empty message"
    }
    let msgcontent = JSON.stringify({
        value,
        quote
    });
    let sk = forge.pki.decryptRsaPrivateKey(config.get("credentials:privateKey:encrypted"), config.get("credentials:password:sha256"));

    let md = forge.md.sha1.create().update(msgcontent, 'utf8');
    let signature = forge.util.bytesToHex(sk.sign(md));
    let chatKey = await exports.chatIdToChatKey(chatid);

    if (!chatKey) {
        throw {
            "error": "Could not send message, Key not found"
        }
    }

    let content = aesEncrypt([config.get("credentials:username"), forge.util.bytesToHex(forge.util.encodeUtf8(msgcontent)), signature, messageType ?? "text"].join("::"), chatKey);
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
    let [sender, content, signature, messageType] = aesDecrypt(encryptedContent, chatKey).split("::");
    try {

        // decode content
        content = forge.util.decodeUtf8(forge.util.hexToBytes(content));

        // verify sender
        let verified, decryptMsg;
        try {
            let publickey = await exports.getPublicKey(sender);
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
            messages.push(await exports.decryptMessage(i.content, await exports.chatIdToChatKey(i.chat_id), i.message_id, i.chat_id, i.encryptionType, i.timestamp));
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
exports.chatIdToChatKey = async (chatId) => {
    if (chatKeyDatabase[chatId]) return chats[chatId];
    chats = await exports.getChats(true);
    //    console.log(chats);
    return chats[chatId];
}

exports.getChats = async (chatkeysonly) => {
    let response = await request("getchatkeys", {
        username: config.get("credentials:username")
    });
    if (response.success) {
        let chatInformation = response.data == null ? {} : JSON.parse(aesDecrypt(response.data, config.get("credentials:password:sha256")));
        if (chatkeysonly) {
            let chats = {};
            for (var i in chatInformation) {
                chats[chatInformation[i].chatId] = chatInformation[i].chatKey
                chatKeyDatabase[chatInformation[i].chatId] = chatInformation[i].chatKey
            }
            return chats;
        } else {
            let chats = [];
            for (var i in chatInformation) {
                let profilePicture = await exports.getProfilePicture(i);
                let messages = await exports.getMessages(chatInformation[i].chatId, chatInformation[i].chatKey, 1, 0, true);
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
    } else {
        throw response
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
    return [
        {
            "username": "tim",
            "profilePicture": null
        }
    ];
};
