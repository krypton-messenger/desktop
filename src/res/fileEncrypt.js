const fs = require("fs"),
    {
        basename
    } = require("path"),
    forge = require("node-forge");

const aesEncrypt = (decrypted, key, iv) => {
    var cipher = forge.cipher.createCipher('AES-CBC', forge.util.hexToBytes(key));
    cipher.start({
        iv: forge.util.hexToBytes(iv)
    });
    cipher.update(forge.util.createBuffer(decrypted, 'binary'));
    cipher.finish();
    return cipher.output.getBytes()
}

encryptFile = async (quote, filePath, chatId, sendFile, sendMessage) => {
    console.log(quote, filePath, chatId);
    let fileParts = {};
    let fileKey = forge.util.bytesToHex(forge.random.getBytesSync(16));
    let iv = forge.util.bytesToHex(forge.random.getBytesSync(16));

    // split file in junks of 5mb  = 5e6 bytes
    const bufferSize = 5e6;

    // open file
    return new Promise((masterResolve, _reject) => {

        fs.open(filePath, 'r', async (status, fd) => {
            if (status) throw (status.message);
            // get size
            let fileSize = fs.statSync(filePath).size;
            let remainingSize = fileSize;

            // index of filePart
            let i = 0;
            while (remainingSize > 0) {
                let thisIndex = i++;
                // set to read n bytes, take the remaining size if it is smaller than the buffersize
                let n = Math.min(bufferSize, remainingSize);
                // define a buffer by the defined size or the remaining size if it is less
                let buffer = Buffer.alloc(n);
                // read n bytes
                fs.read(fd, buffer, 0, n, fileSize - remainingSize, function (err, num) {
                    if (err) throw err;
                    // for debugging show me what you've read
                    console.log(i);
                    // encrypt the buffer
                    // let encryptedString = buffer.toString("utf8", 0, num); // uncomment to bypass encryption for testing
                    // let encryptedString = aesEncrypt(forge.util.bytesToHex(buffer.toString("utf8", 0, num)), fileKey); // old not working variant
                    let encryptedString = forge.util.bytesToHex(
                        aesEncrypt(
                            buffer.toString("hex", 0, num),
                            fileKey,
                            iv
                        )
                    )

                    // upload the encrypted part and add the returned key to the list
                    // using promises for speed
                    fileParts[thisIndex] = false;
                    sendFile(encryptedString).then((response) => {
                        // because part 2 could return faster than part 1, we don't push the id, but place it at its index
                        fileParts[thisIndex] = response.data;
                    })
                });
                // we've advanced by bufferSize, update remaining size 
                remainingSize -= bufferSize;
            }
            // wait until all parts were sent
            await (() => {
                return new Promise((resolve, _reject) => {
                    let waitingInterval = setInterval(() => {
                        if (Object.values(fileParts).indexOf(false) === -1) {
                            clearInterval(waitingInterval);
                            resolve(true);
                        }
                    }, 200);
                });
            })();

            console.log({
                fileName: basename(filePath),
                fileKey,
                fileParts
            });
            // then send the user a message with the array of all parts
            masterResolve(await sendMessage({
                content: JSON.stringify({
                    fileName: basename(filePath),
                    fileKey,
                    iv,
                    fileSize,
                    fileParts
                }),
                chatId,
                quote,
                messageType: "file"
            }));
        });
    });
}
exports.fromPath = encryptFile;