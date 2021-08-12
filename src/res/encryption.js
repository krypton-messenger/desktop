const forge = require("node-forge");

/**
 * 
 * @param {String} password password to hash
 * @returns 
 */
exports.processPassword = (password) => {
    return {
        sha256Password: forge.md.sha256.create().update(password).digest().toHex(),
        sha512Password: forge.md.sha512.create().update(password).digest().toHex()
    }
}
/**
 * 
 * @param {String} password password to encrypt private key with, as defined it sould be the sha256 of the users password
 * @returns {} {privateKey, publicKey}
 */
exports.generateKeyPair = (password) => {
    return new Promise(async (resolve, reject) => {
        forge.pki.rsa.generateKeyPair({
            bits: 2048,
            workers: 2
        }, async (err, keypair) => {
            if (err) reject({
                success: false,
                error: {
                    description: 'Error while generating keypair:' + err
                }
            });
            else {
                privateKey = forge.pki.encryptRsaPrivateKey(keypair.privateKey, password, {
                    legacy: true,
                    algorithm: 'aes256'
                });
                publicKey = forge.pki.publicKeyToRSAPublicKeyPem(keypair.publicKey);
                resolve({
                    privateKey,
                    publicKey
                });
            }

        });

    });
}
exports.parsePrivateKey = (pem, key) => {
    try {
        return forge.pki.decryptRsaPrivateKey(pem, key);
    } catch (e) {
        console.warn("error decrypting private key: ", e);
        return false;
    }
}
exports.parsePublicKey = (pem) => {
    try {
        return forge.pki.publicKeyFromPem(pem);
    } catch (e) {
        console.warn("unable to parse public key: ", e);
        console.warn("pem", pem);
        return false;
    }
}