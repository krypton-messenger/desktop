const config = require("./config"),
    forge = require("node-forge"),
    fs = require("fs"),
    got = require("got");


const request = async (action, params) => {
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

exports.getPublicKey = async user => {
    let response = await request("getpublickey", {
        user
    });
    if (response.success) return forge.pki.publicKeyFromPem(response.data);
    throw {
        "error": "could not get public key of user: " + user,
        "furtherInformaiton": response
    }
}

exports.getMessagesFromStorage = (chatid) => {
    return Object.values(chatDatabase[chatid].messages);
}

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

            // decrypt message
            let [sender, content, signature, messageType] = aesDecrypt(i.content, chatKey).split("::");

            // decode content
            content = forge.util.decodeUtf8(forge.util.hexToBytes(content));


            // verify sender
            // doesn't work yet
            let verified;
            try {
                let publickey = await exports.getPublicKey(sender);
                let md = forge.md.sha1.create();
//                console.log(`verifying content ${content}`);
                md.update(content, 'utf8');
                verified = publickey.verify(md.digest().bytes(), forge.util.hexToBytes(signature));
//                console.log(`verifying sender ${sender} returned ${verified}`);
            } catch (e) {
                console.log("error while verifying:", e);
                verified = false;
            }


            // parse content
            message = JSON.parse(content);

            let messageData = {
                message_id: i.message_id,
                sender,
                verified,
                messageType,
                message,
                chat_id: i.chat_id,
                direction: sender == config.get("credentials:username") ? "sent" : "recieved",
                encryptionType: i.encryptionType,
                timestamp: i.timestamp,
            };
            if (!chatDatabase[chatid]) chatDatabase[chatid] = {
                title: undefined,
                chatKey,
                messages: {}
            };
            chatDatabase[chatid].messages[i.message_id] = messageData;
            messages.push(messageData);
        }
        return messages;
    } else {
        throw {
            success: false,
            data: []
        }
    }
}
exports.getChats = async () => {
    let response = await request("getchatkeys", {
        username: config.get("credentials:username")
    });
    if (response.success) {
        let chatInformation = response.data == null ? {} : JSON.parse(aesDecrypt(response.data, config.get("credentials:password:sha256")));
        let contacts = [];
        for (var i in chatInformation) {
            let profilePicture = await exports.getProfilePicture(i);
            let messages = await exports.getMessages(chatInformation[i].chatId, chatInformation[i].chatKey, 1, 0, true);
            console.log("messagelength", messages);
            contacts.push({
                username: i,
                profilePicture,
                lastMessage: messages[0],
                chatid: chatInformation[i].chatId,
                chatKey: chatInformation[i].chatKey
            })
        }
        return contacts;
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
