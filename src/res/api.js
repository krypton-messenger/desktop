const got = require("got"),
    config = require("./config"),
    encryption = require("./encryption");

const request = async (action, data, authenticate, method) => {
    try {
        data = {
            ...data,
            ...(authenticate) ? {
                username: config.get("credentials:username")
            } : {}
        };
        console.log(data);
        let response = await got.post(action, {
            // method: method ?? "POST",
            json: data,
            headers: (authenticate) ? {
                Authorization: "Bearer " + config.get("credentials:authToken")
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

exports.logIn = async ({
    serverUrl,
    username,
    password
}) => {
    config.setAndSave("server", serverUrl);
    let {
        sha256Password,
        sha512Password
    } = encryption.processPassword(password);

    let response = await request("authenticate", {
        username,
        password: sha512Password
    });
    if (response.success) {
        config.set("signedIn", true);
        config.setAndSave("credentials", {
            username,
            password: {
                sha512: sha512Password,
                sha256: sha256Password
            },
            authToken: response.data.token,
            privateKey: {
                encrypted: response.data.privateKey
            },
            publicKey: {
                encrypted: response.data.publicKey
            }
        });
    }
    return response;
}


exports.signUp = async ({
    serverUrl,
    username,
    password,
    licenceKey,
    createAccountSuccessCallback
}) => {
    config.setAndSave("server", serverUrl);

    let {
        sha256Password,
        sha512Password
    } = encryption.processPassword(password);

    let {
        privateKey,
        publicKey
    } = encryption.generateKeyPair(sha256Password);

    let response = await request("createaccount", {
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