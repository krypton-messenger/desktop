const fs = require("fs"),
    forge = require("node-forge");

const aesDecrypt = (encrypted, key, iv) => {
    var decipher = forge.cipher.createDecipher('AES-CBC', forge.util.hexToBytes(key));
    decipher.start({
        iv: forge.util.hexToBytes(iv)
    });
    decipher.update(forge.util.createBuffer(encrypted, 'binary'));
    decipher.finish();
    return decipher.output.getBytes();
}

/**
 * 
 * @param {Function} getFile 
 * @param {String} key 
 * @param {String} iv 
 * @param {Array} sourceFiles 
 * @param {String} targetFile 
 * @param {Function} percentageCallback 
 * @returns path to target file
 */
exports.decryptFromList = async (getFile, key, iv, sourceFiles, targetFile, percentageCallback) => {
    targetFileStream = fs.createWriteStream(targetFile, {
        encoding: "utf8"
    });
    if (percentageCallback) percentageCallback(0);
    // sort the object ascending by key [4,3,5,1] => [1,3,4,5]
    for (let i in Object.keys(sourceFiles).sort((a, b) => a - b)) {
        let response = await getFile(sourceFiles[i]);
        console.log(i, response);
        targetFileStream.write(
            Buffer.from(
                aesDecrypt(
                    forge.util.hexToBytes(
                        response.data
                    ),
                    key,
                    iv
                ),
                "hex"
            )
        );
        // send percentage of download
        if (percentageCallback) percentageCallback((Number(i) + 1) / Object.keys(sourceFiles).length * 100);
    }
    targetFileStream.close();
    return targetFile;
}