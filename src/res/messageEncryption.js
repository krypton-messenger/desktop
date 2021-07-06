const forge = require("node-forge");

class Decryptor {
    constructor(kryptonInstance, getPublicKey) {
        this.kryptonInstance = kryptonInstance;
        this.getPublicKey = getPublicKey.bind(this.kryptonInstance.api);
        console.warn("mimeTypes:");
    }
    aesDecrypt(message, password) {
        try {
            message = JSON.parse(message)
            var {
                iv,
                iterations,
                salt
            } = message;
            var content = message.message ?? message.content;
        } catch (e) {
            var [iv, iterations, salt, content] = message.split("$");
        }
        console.log(message);
        iv = forge.util.hexToBytes(iv);
        salt = forge.util.hexToBytes(salt);
        let encrypted = forge.util.hexToBytes(content);


        var key = forge.pkcs5.pbkdf2(password, salt, Number(iterations), 16);


        var decipher = forge.cipher.createDecipher('AES-CBC', key);
        decipher.start({
            iv: iv
        });
        decipher.update(forge.util.createBuffer(encrypted));


        decipher.finish();
        return decipher.output.data;

    };

    /**
     * @param {String} encryptedContent 
     * @param {String} chatKey 
     * 
     * @returns {{sender: {String}, verified:{Boolean}, messageType: {String}, message: {String}, direction: {String} (sent | recieved)[, decryptMsg : {String}]}}
     */
    async decryptMessage(encryptedContent, chatKey) {
        let decrypted = this.aesDecrypt(encryptedContent, chatKey);
        try {
            decrypted = JSON.parse(decrypted);
            var {
                sender,
                signature,
                messageType
            } = decrypted;
            var message = decrypted.content ?? decrypted.message;
        } catch (_e) {
            var [sender, message, signature, messageType] = decrypted.split("::");
        }
        try {
            // console.warn("decrypted message:", {
            //     sender,
            //     message,
            //     signature,
            //     messageType,
            //     decrypted
            // });
            // decode content
            let content = forge.util.decodeUtf8(forge.util.hexToBytes(message));
            if (messageType == "file") {
                console.warn("message is a file");
                try {
                    let fileName = JSON.parse(JSON.parse(content).value).fileName;
                    console.warn(`fileName: ${fileName}`);
                    let mimeType = mime.getType("fileName.jpeg");
                    console.log(mimeType);
                    console.warn(`mime: ${mimeType}`);
                } catch (e) {
                    console.warn(e);
                }
            }
            // verify sender
            let verified, decryptMsg;
            try {
                let publickey = await this.getPublicKey(sender);
                let md = forge.md.sha1.create();
                md.update(content, 'utf8');
                verified = publickey.verify(md.digest().bytes(), forge.util.hexToBytes(signature));
            } catch (e) {
                console.log("error while verifying:", e);
                verified = false;
                decryptMsg = "The sender of this message could not be verified"
            }


            // parse content
            message = JSON.parse(content);
            return {
                sender,
                verified,
                messageType,
                message,
                direction: sender == this.kryptonInstance.config.get("credentials:username") ? "sent" : "recieved",
                ...((typeof decryptMsg !== "undefined") ? {
                    decryptMsg
                } : null)

            };

        } catch (e) {
            console.warn("decrypt_err", e);
            return {
                sender,
                verified: false,
                messageType,
                message: {
                    value: "_This message could not be decrypted correctly. Please ask the sender to send it again._"
                },
                direction: sender == this.kryptonInstance.config.get("credentials:username") ? "sent" : "recieved",
                decryptMsg: "This message could not be decrypted correctly. Please ask the sender to send it again.",
                ...((typeof decryptMsg !== "undefined") ? {
                    decryptMsg
                } : null)
            }
        }
    }

}
class Encryptor {
    constructor(kryptonInstance) {
        this.kryptonInstance = kryptonInstance;
    }
    aesEncrypt(message, password, iterations) {
        iterations = iterations ?? 12;

        var salt = forge.random.getBytesSync(128);
        var iv = forge.random.getBytesSync(16);

        var key = forge.pkcs5.pbkdf2(password, salt, iterations, 16);

        var cipher = forge.cipher.createCipher('AES-CBC', key);
        cipher.start({
            iv: iv
        });
        cipher.update(forge.util.createBuffer(message));
        cipher.finish();

        return JSON.stringify({
            iv: forge.util.bytesToHex(iv),
            iterations,
            salt: forge.util.bytesToHex(salt),
            message: cipher.output.toHex()
        });

    };
    async encryptMessage(value, chatKey, quote, messageType) {
        if (!value.length) throw {
            "error": "Can't send empty message"
        }
        let msgcontent = JSON.stringify({
            value,
            quote
        });
        let sk = await this.kryptonInstance.getPrivateKey();

        let md = forge.md.sha1.create().update(msgcontent, 'utf8');
        let signature = forge.util.bytesToHex(sk.sign(md));

        let content = this.aesEncrypt(JSON.stringify({
            sender: this.kryptonInstance.config.get("credentials:username"),
            content: forge.util.bytesToHex(forge.util.encodeUtf8(msgcontent)),
            signature,
            messageType: messageType ?? "text"
        }), chatKey);
        return content;
    }
}
exports.Decryptor = Decryptor;
exports.Encryptor = Encryptor;