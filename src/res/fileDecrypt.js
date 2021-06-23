const fs = require("fs"),
    {
        getFile
    } = require("./apiConnection"),
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

exports.decryptFromList = async (key, iv, sourceFiles, targetFile) => {
    targetFileStream = fs.createWriteStream(targetFile, {
        encoding: "utf8"
    });

    // sort the object ascending by key [4,3,5,1] => [1,3,4,5]
    for (let i in Object.keys(sourceFiles).sort((a, b) => a - b)) {
        let response = await getFile(sourceFiles[i]);
        console.log(i, response);
        // targetFileStream.write(forge.util.hexToBytes(aesDecrypt(response.data, key))); // old not working variant
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
    }
    targetFileStream.close();
    return targetFile;
}