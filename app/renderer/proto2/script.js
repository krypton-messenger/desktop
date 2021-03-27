{
    var messenger = {};

    // session
    {
        messenger.session = {};

        messenger.session.chatInformation = {};
        messenger.session.publicKeys = {};

        messenger.session.clear = function () {
            messenger.session = {
                clear: messenger.session.clear
            };
        }
        messenger.session.selectedContact = {};

        messenger.session.selectedContact.deselect = function () {
            this.username = undefined;
            this.chatKey = undefined;
            this.chatId = undefined;
            this.publicKey = undefined;
        };

        messenger.session.selectedContact.select = async function (username) {

            this.username = username;
            var chatInformation = messenger.session.chatInformation[username] ?? (await messenger.session.getChatInformation(true))[username];
            if (!chatInformation) {
                //quite a brutal solution...
                document.location.reload();
                return false;
            }
            this.chatId = chatInformation.chatId;
            this.chatKey = chatInformation.chatKey;
            this.publicKey = await messenger.session.getPublicKey(username);
            return true;

        };

        messenger.session.open = function (serverAddress) {
            messenger.session.serverAddress = serverAddress;
        }

        messenger.session.request = function (action, data, requiresAuthorisation, serverAddress, doneFunction, failFunction, retryFunction) {
            if ((requiresAuthorisation && !this.authToken)) {
                return this.getAuthToken().then(function () {
                    messenger.session.request(action, data, requiresAuthorisation, serverAddress, doneFunction, failFunction, retryFunction);
                });

            } else {

                var request = $.ajax(((serverAddress ?? messenger.session.serverAddress) ?? document.location.origin) + "/" + action, {
                    data: requiresAuthorisation ? {
                        ...data,
                        "username": this.username
                    } : data,
                    method: "POST",
                    headers: requiresAuthorisation ? {
                        "Authorisation": "Bearer " + this.authToken.token
                    } : {}
                });
                request.always(function (a, b, c) {
                    if (messenger.gui.backgroundLog.elmnt) {
                        var previousLength = messenger.gui.backgroundLog.elmnt.innerHTML.length;
                        //                        console.debug(previousLength);
                        messenger.gui.backgroundLog.elmnt.innerHTML += c.responseText ?? a.responseText;
                        if (messenger.gui.backgroundLog.elmnt.offsetHeight >= visualViewport.height) {
                            console.debug("removing parts");
                            messenger.gui.backgroundLog.elmnt.innerHTML = messenger.gui.backgroundLog.elmnt.innerHTML.substr(-previousLength);
                        }
                    }
                });
                request.done(doneFunction ?? console.debug);
                request.fail(failFunction ?? function (request) {
                    if (request.statusText != "abort") {
                        //                        console.debug("connection failed: " + action);
                        messenger.gui.popup.show("Error Reaching Server", "We were unable to establish a connection to the server. Make shure you are connected to the internet and check your firewall and proxy.", [{
                            label: "ok",
                            autofocus: true,
                            callback: function (e) {
                                messenger.gui.popup.hide();
                            }
                }, retryFunction ? ({
                            label: "try again",
                            callback: function (e) {
                                retryFunction();
                                messenger.gui.popup.update.disableButtons();
                                messenger.gui.popup.hide();
                            }
                        }) : ({
                            label: "try again",
                            disabled: true
                        })]);
                    } else {
                        //                        console.debug("request aborted: " + action);
                    }
                });
                return request;
            }
        }

        messenger.session.logIn = function (username, password, serverAddress, dontSetCredentials) {
            if (!dontSetCredentials) {
                this.setCredentials(username, password, serverAddress);
            }
            this.getAuthToken();
            this.getChatInformation(true);
            this.listenChatKeyInbox();
            this.listenMessages();
            messenger.gui.toggle().then(function () {
                messenger.gui.messages.notification.init();
                messenger.gui.contacts.refresh();
            });
        }

        messenger.session.isLoggedIn = function () {
            messenger.session._password = messenger.session.password ?? sessionStorage["password"] ? JSON.parse(sessionStorage["password"]) : undefined;
            messenger.session._username = messenger.session.username ?? sessionStorage["username"] ? JSON.parse(sessionStorage["username"]) : undefined;
            return (messenger.session.password && messenger.session.username);
        }

        messenger.session._resetSession = messenger.session;

        messenger.session.logout = function () {
            sessionStorage.clear();
            messenger.session = messenger.session._resetSession;
            messenger.gui.toggle("signin");
            messenger.gui.theme.change(messenger.gui.theme.currentTheme);
        }

        messenger.session.setCredentials = function (username, password, serverAddress) {
            //            console.debug("setcredentials - start");
            this.serverAddress = serverAddress ?? this.serverAddress ?? document.location.origin;
            this.username = username;
            this.password = {
                sha512: forge.md.sha512.create().update(password).digest().toHex(),
                sha256: forge.md.sha256.create().update(password).digest().toHex()
            };
            //            console.debug("setcredentials - end:", this.password);
        }

        messenger.session.createAccount = function (username, password, licenceKey, serverAddress) {
            messenger.gui.popup.show("Generating Keypair", "This might take some time depending on your device's performance.", undefined, false);
            // waiting for redraw
            setTimeout(async function () {
                messenger.session.serverAddress = serverAddress ?? this.serverAddress ?? document.location.origin;

                messenger.session.keypair = await messenger.encryption.generateKeyPair();

                messenger.gui.popup.hide();
                messenger.session.pem = {};
                messenger.session.pem.privateKey = forge.pki.encryptRsaPrivateKey(messenger.session.keypair.privateKey, forge.md.sha256.create().update(password).digest().toHex(), {
                    legacy: true,
                    algorithm: 'aes256'
                });
                messenger.session.pem.publicKey = forge.pki.publicKeyToRSAPublicKeyPem(messenger.session.keypair.publicKey);

                await messenger.session.request("createaccount", {
                    username: username,
                    password: forge.md.sha512.create().update(password).digest().toHex(),
                    publicKey: messenger.session.pem.publicKey,
                    privateKey: messenger.session.pem.privateKey,
                    licenceKey: licenceKey ?? "",
                }, false, undefined, function (response) {
                    if (response.success) {
                        messenger.session.setCredentials(username, password);
                        messenger.session.logIn(username, password);
                    } else {
                        messenger.gui.popup.show("Error Creating User", JSON.stringify(response.error, null, 3), [{
                            label: "ok",
                            autofocus: true,
                            callback: function (e) {
                                messenger.gui.popup.hide();
                                messenger.gui.formHandling.autoFillServer();
                            }
                        }]);
                        return false;
                    }
                }, undefined, messenger.session.createAccount);
            }, 100);
        }

        messenger.session.getAuthToken = function () {
            return new Promise(async function (resolve, reject) {
                if (!await messenger.session.isLoggedIn()) {
                    reject("not logged in");
                }
                messenger.session.request("auth", {
                    username: messenger.session.username ?? "",
                    password: messenger.session.password.sha512 ?? ""
                }, false, undefined, function (response) {
                    if (response.success) {
                        resolve(response.data);
                        messenger.session.authToken = response.data;
                        messenger.session.keypair = {
                            privateKey: forge.pki.decryptRsaPrivateKey(response.data.privateKey, messenger.session.password.sha256)
                        };
                        messenger.gui.popup.hide();
                    } else {
                        reject(response.error);
                        messenger.gui.popup.show("Error Authenticating", JSON.stringify(response.error, null, 3), [{
                            label: "ok",
                            autofocus: true,
                            callback: function (e) {
                                messenger.gui.popup.hide();
                                messenger.session.logout();
                            }
                        }, {
                            label: "try again",
                            callback: function (e) {
                                messenger.session.getAuthToken();
                                messenger.gui.popup.update.heading("Retrying...", true);
                                messenger.gui.popup.update.disableButtons();
                            }
                        }]);
                    }
                }, undefined, messenger.session.getAuthToken);
            });
        }

        messenger.session.setChatKeys = function (newChatKeys) {
            return new Promise(function (resolve, reject) {
                var newData = messenger.encryption.aes.encrypt(JSON.stringify(newChatKeys ?? messenger.session.chatInformation), messenger.session.password.sha256);
                var retryData = newData;
                messenger.session.request("updatechatkeys", {
                    content: newData
                }, true, undefined, function (response) {
                    if (response.success) {
                        resolve(true);
                        messenger.session.listenMessages();
                    } else {
                        reject(response.error);
                        messenger.gui.popup.show("Error Updating Chatkeys", JSON.stringify(response.error, null, 3), [
                            {
                                label: "ok",
                                autofocus: true,
                                callback: function (e) {
                                    messenger.gui.popup.hide();
                                }
                            }
                        ]);
                    }
                }, undefined, function () {
                    messenger.session.setChatKeys(retryData);
                });
            });
        }

        messenger.session.getChatInformation = function (forceReload) {
            return new Promise(function (resolve, reject) {
                if (messenger.session.chatInformation && !forceReload) {
                    //                    console.debug("delivering chat keys from session");
                    resolve(messenger.session.chatInformation);
                } else {
                    //                    console.debug("reloading chat keys");
                    messenger.session.request("getchatkeys", {}, true, undefined, function (response) {
                        if (response.success) {
                            messenger.session.chatInformation = response.data == null ? {} : JSON.parse(messenger.encryption.aes.decrypt(response.data, messenger.session.password.sha256));
                            messenger.gui.contacts.updateList();
                            resolve(messenger.session.chatInformation);
                        } else {
                            reject(response.error);
                            messenger.gui.popup.show("Error Getting ChatKey", JSON.stringify(response.error, null, 3), [
                                {
                                    label: "ok",
                                    autofocus: true,
                                    callback: function (e) {
                                        messenger.gui.popup.hide();
                                    }
                                }
                            ]);
                        }
                    }, undefined, messenger.session.getChatInformation);
                }
            });
        }

        messenger.session.listenChatKeyInbox = async function (lastKnown) {
            if (messenger.session.chatKeyInboxListener && messenger.session.chatKeyInboxListener.abort) {
                messenger.session.chatKeyInboxListener.abort();
            }
            messenger.session.chatKeyInboxListener = await messenger.session.request("awaitinbox", {
                lastKnown: JSON.stringify(lastKnown) ?? "[]"
            }, true, undefined, async function (response) {
                if (response.success) {
                    if (response.data != JSON.stringify(lastKnown)) {
                        var inboxData = JSON.parse(response.data);
                        if (inboxData.length > 0) {
                            messenger.gui.audio.playNewChat();
                            for (var i of inboxData) {
                                var [encryptedUsername, encryptedChatKey, signature] = i.split("::");
                                var username = messenger.session.keypair.privateKey.decrypt(forge.util.hexToBytes(encryptedUsername));
                                var chatKey = messenger.session.keypair.privateKey.decrypt(forge.util.hexToBytes(encryptedChatKey));
                                var publicKey = await messenger.session.getPublicKey(username);
                                var md = forge.md.sha1.create();
                                md.update(chatKey, 'utf8');
                                if (!publicKey.verify(md.digest().bytes(), forge.util.hexToBytes(signature))) {
                                    console.warn("could not verify chatkey from user: " + username);
                                } else {
                                    //                                console.debug("chatkey verified :)");
                                    messenger.session.chatInformation[username] = {
                                        chatKey: chatKey,
                                        chatId: forge.md.sha512.create().update(chatKey).digest().toHex()
                                    };
                                    //                                console.debug("calling refresh after listenChatKeyInbox");

                                }

                            }
                            messenger.gui.contacts.refresh();
                            messenger.session.setChatKeys();

                            messenger.session.request("removechatkeys", {
                                content: response.data
                            }, true);
                        }
                    }
                    messenger.session.listenChatKeyInbox(JSON.parse(response.data));
                } else {
                    var retryLastKnown = lastKnown;
                    messenger.gui.popup.show("Error Awaiting Chatkeys", JSON.stringify(response.error, null, 3), [{
                            label: "ok",
                            autofocus: true,
                            callback: function (e) {
                                messenger.gui.popup.hide();
                            }
                        },
                        {
                            label: "retry",
                            callback: function (e) {
                                messenger.session.listenChatKeyInbox(retryLastKnown);
                                messenger.gui.popup.hide();
                            }
                        }]);
                }
            }, undefined, messenger.session.listenChatKeyInbox);
        }

        messenger.session.listenMessages = async function () {
            if (messenger.session.messageListener && messenger.session.messageListener.abort) {
                messenger.session.messageListener.abort();
            }
            var chatIds = [];
            var chatInformation = await messenger.session.getChatInformation(true);
            console.debug(["listening for messages with chatinformation:", chatInformation]);
            for (var i in chatInformation) {
                chatIds.push(chatInformation[i].chatId);
            }
            console.debug(["listening for messages with chatIds:", chatIds]);
            if (chatIds.length != 0) {
                messenger.session.messageListener = messenger.session.request("awaitmessages", {
                    chatids: chatIds
                }, true, undefined, async function (response) {
                    if (response.success) {
                        if (response.data != []) {
                            console.debug(["recieved new messages at", new Date().getTime()]);
                            messenger.session.handleMessages(response.data, true);
                        }
                        messenger.session.listenMessages();
                    } else {
                        messenger.gui.popup.show("Error Awaiting Messages", JSON.stringify(response.error, null, 3), [{
                                label: "ok",
                                autofocus: true,
                                callback: function (e) {
                                    messenger.gui.popup.hide();
                                }
                        },
                            {
                                label: "retry",
                                callback: function (e) {
                                    messenger.session.listenMessages();
                                    messenger.gui.popup.hide();
                                }
                        }]);
                    }
                }, undefined, messenger.session.listenMessages);
            }else{
                console.debug(["prevented sending due to empty chadId-list", chatIds]);
            }
        }

        messenger.session.getMessages = async function (chatId, offset, limit) {
            return new Promise(function (resolve, reject) {
                var retryChatId = chatId;
                messenger.session.request("getmessages", {
                    chatid: chatId,
                    limit: limit ?? 20,
                    offset: offset ?? 0,
                    desc: true
                }, true, undefined, async function (response) {
                        if (response.success) {
                            //                            console.debug("got messages:", response.data);
                            resolve(response.data);
                        } else {
                            reject(false);
                            var retryChatId = chatId;
                            messenger.gui.popup.show("Error Getting Messages", JSON.stringify(response.error, null, 3), [{
                                    label: "ok",
                                    autofocus: true,
                                    callback: function (e) {
                                        messenger.gui.popup.hide();
                                    }
                        },
                                {
                                    label: "retry",
                                    callback: function (e) {
                                        messenger.session.getMessages(retryChatId);
                                        messenger.gui.popup.hide();
                                    }
                        }]);
                        }
                    }, undefined,
                    function () {
                        messenger.session.getMessages(retryChatId);
                    });
            });
        }

        messenger.session.handleMessages = async function (messages, showNotification) {
            console.debug(["handling Messages", messages]);
            console.log(messenger.session.selectedContact);
            // is all undefined
            for (var i of messages ?? []) {
                if (!document.querySelector("div.message[data-message-id='" + i.message_id + "']")) {
                    try {
                        console.time("msgrecieve #" + i.message_id);
                    } catch (e) {

                    }
                    let messageData = {
                        timestamp: i.timestamp,
                        messageId: i.message_id,
                        encryptionType: i.encryptionType,
                        chatId: i.chat_id,
                        ...(await messenger.encryption.message.decrypt(i.content, i.chat_id)),
                    };
                    console.timeLog("msgrecieve #" + i.message_id);

                    if (messageData.chatId == messenger.session.selectedContact.chatId) {
                        messenger.gui.messages.append(messageData);
                    } else {}
                    if (showNotification) {
                        messenger.gui.contacts.recievedNewMessage(i.chat_id);
                        messenger.gui.audio.playNewMessage();
                        if (!document.hasFocus()) {
                            messenger.gui.messages.notification.show(messageData.chatId, messageData.content, messageData.messageId);
                        }
                    }
                }
            }

        }

        messenger.session.sendMessage = async function (content, reciever, encryptionType) {
            var data = {
                chatid: messenger.session.chatInformation[reciever].chatId,
                encType: encryptionType ?? "RSA-AES_CBC",
                content: content
            };
            messenger.session.request("sendmessage", data, function (response) {
                var retryArguents = arguments;
                if (!response.success) {
                    messenger.gui.popup.show("Error Sending Message", JSON.stringify(response.error, null, 3), [{
                            label: "ok",
                            autofocus: true,
                            callback: function (e) {
                                messenger.gui.popup.hide();
                            }
                        },
                        {
                            label: "retry",
                            callback: function (e) {
                                messenger.session.sendMessage(...retryArguments);
                                messenger.gui.popup.hide();
                            }
                        }]);
                }
            })
        }

        messenger.session.createChat = function (user) {
            return new Promise(async function (resolve, reject) {
                var currentKeys = messenger.session.chatInformation;
                if (currentKeys[user]) {
                    resolve(currentKeys[user]);
                    console.warn("tried to overwrite a chatkey");
                    return;
                }

                var chatKey = forge.random.getBytesSync(200);
                var chatInformation = {
                    chatKey: chatKey,
                    chatId: forge.md.sha512.create().update(chatKey).digest().toHex()
                };
                messenger.session.chatInformation[user] = chatInformation;
                //                console.debug("calling refresh after createChat");
                messenger.gui.contacts.refresh();
                messenger.session.setChatKeys();
                resolve(chatInformation);

                var recieverPublickey = await messenger.session.getPublicKey(user);
                var encryptedChatKey = forge.util.bytesToHex(recieverPublickey.encrypt(chatKey));
                var encryptedUsername = forge.util.bytesToHex(recieverPublickey.encrypt(messenger.session.username));

                var md = forge.md.sha1.create();
                md.update(chatKey, 'utf8');
                var signature = forge.util.bytesToHex(messenger.session.keypair.privateKey.sign(md));

                var encryptedBundle = [encryptedUsername, encryptedChatKey, signature].join("::");
                var retryUser = user;

                messenger.session.request("addchatkey", {
                    user: user,
                    content: encryptedBundle
                }, false, undefined, undefined, undefined, function () {
                    messenger.session.createChat(retryUser);
                });
            });
        }

        messenger.session.getPublicKey = function (user) {
            if (user == messenger.session.selectedContact.username && messenger.session.selectedContact.publicKey) {
                return messenger.session.selectedContact.publicKey;
            } else if (messenger.session.publicKeys[user]) {
                return messenger.session.publicKeys[user];
            } else {
                console.debug([user, "is not", messenger.session.selectedContact.username]);
                return new Promise(async function (resolve, reject) {
                    var retryUser = user;
                    messenger.session.request("getpublickey", {
                        user: user
                    }, false, undefined, function (response) {
                        if (response.success) {
                            messenger.session.publicKeys[user] = forge.pki.publicKeyFromPem(response.data);
                            resolve(messenger.session.publicKeys[user]);
                        } else {
                            reject(response.error)
                        }
                    }, undefined, function () {
                        messenger.session.getPublicKey(retryUser);
                    })
                })
            }
        }


        Object.defineProperty(messenger.session, 'chatInformation', {
            get: function () {
                return messenger.session._chatInformation;
            },
            set: function (value) {

                if (JSON.stringify(messenger.session._chatInformation) != JSON.stringify(value)) {
                    //                    console.debug(messenger.session._chatInformation);
                    messenger.gui.contacts.refresh();
                }

                return messenger.session._chatInformation = value;
            }
        });

        // sync pwd and username to session storage
        {

            Object.defineProperty(messenger.session, 'password', {
                get: function () {
                    return messenger.session._password;
                },
                set: function (value) {
                    sessionStorage["password"] = JSON.stringify(value);
                    return messenger.session._password = value;
                }
            });

            Object.defineProperty(messenger.session, 'username', {
                get: function () {
                    return messenger.session._username;
                },
                set: function (value) {
                    sessionStorage["username"] = JSON.stringify(value);
                    return messenger.session._username = value;
                }
            });
        }
    }

    // encrytion
    {
        messenger.encryption = {};

        messenger.encryption.isKeySet = function (publicKey, privateKey) {
            var value = forge.random.getBytesSync(128);
            return privateKey.decrypt(publicKey.encrypt(value)) == value;
        }
        messenger.encryption.showOwnFingerprint = async function () {
            var ownPublicKey = await messenger.session.getPublicKey(messenger.session.username);

            if (await this.isKeySet(ownPublicKey, messenger.session.keypair.privateKey)) {
                messenger.gui.popup.show("Your Public Key Fingerprint", forge.util.bytesToHex(forge.ssh.getPublicKeyFingerprint(ownPublicKey).data).match(/.{1,4}/g).join(" "), [{
                    label: "ok",
                    autofocus: true,
                    callback: function (e) {
                        messenger.gui.popup.hide();
                    }
                }], false);

            } else {
                messenger.gui.popup.show("Security Breach", "Your public key has been changed by the server and it doesn't match your private key. This should not happen. Please contact us to find out what happened with your account.\nTherefore we can't show your public key fingerprint.", [{
                    label: "ok",
                    autofocus: true,
                    callback: function (e) {
                        messenger.gui.popup.hide();
                    }
                }]);
            }

        }

        messenger.encryption.generateKeyPair = function () {
            return new Promise(function (resolve, reject) {
                try {
                    var keypair = forge.pki.rsa.generateKeyPair({
                        bits: 2048,
                        workers: 2
                    });
                } catch (error) {
                    messenger.gui.popup.show("Failed to generate Keypair", "Detailed information: \n" + JSON.stringify(error, null, 3));
                    reject("failed to generate keypair: " + JSON.stringify(error));
                }
                resolve(keypair);
            });
        }

        // aes
        {

            messenger.encryption.aes = {};

            messenger.encryption.aes.encrypt = function (message, password, numIterations) {
                numIterations = numIterations ?? 12;
                // 1

                var salt = forge.random.getBytesSync(128);
                var iv = forge.random.getBytesSync(16);

                // 2
                var key = forge.pkcs5.pbkdf2(password, salt, numIterations, 16);

                // 3
                var cipher = forge.cipher.createCipher('AES-CBC', key);
                cipher.start({
                    iv: iv
                });
                cipher.update(forge.util.createBuffer(message));
                cipher.finish();

                // 4
                return [
                forge.util.bytesToHex(iv),
                numIterations,
                forge.util.bytesToHex(salt),
                cipher.output.toHex(),
            ].join("$");

            }

            messenger.encryption.aes.decrypt = function (message, password) {
                // 1
                var [iv, numIterations, salt, encrypted] = message.split("$");
                iv = forge.util.hexToBytes(iv);
                salt = forge.util.hexToBytes(salt);
                encrypted = forge.util.hexToBytes(encrypted);

                // 2
                var key = forge.pkcs5.pbkdf2(password, salt, numIterations, 16);

                // 3
                var decipher = forge.cipher.createDecipher('AES-CBC', key);
                decipher.start({
                    iv: iv
                });
                decipher.update(forge.util.createBuffer(encrypted));

                // 4
                var result = decipher.finish();
                return decipher.output.data;
            };
        }

        // message
        {
            messenger.encryption.message = {};

            messenger.encryption.message.encrypt = function (content, targetUser, msgType, numIterations) {
                return new Promise(async function (resolve, reject) {
                    var chatInformation = (messenger.session.chatInformation[targetUser]) ?? (await messenger.session.createChat(targetUser));
                    var chatKey = chatInformation.chatKey;
                    var md = forge.md.sha1.create();
                    md.update(content, 'utf8');
                    var signature = forge.util.bytesToHex(messenger.session.keypair.privateKey.sign(md));

                    resolve(messenger.encryption.aes.encrypt([messenger.session.username, forge.util.bytesToHex(forge.util.encodeUtf8(content)), messenger.fakesignature ? "fakesignature" : signature, msgType].join("::"), chatKey));
                });
            }

            messenger.encryption.message.decrypt = function (encryptedContent, chatId) {
                return new Promise(async function (resolve, reject) {
                    var chatInformation = messenger.session.chatInformation;
                    var chatKey;
                    for (var i in chatInformation) {
                        if (chatInformation[i].chatId == chatId) {
                            chatKey = chatInformation[i].chatKey;
                            break;
                        }
                    }
                    if (!chatKey) {
                        reject("chatid unknown -  not in key list");
                    }
                    var fragments = messenger.encryption.aes.decrypt(encryptedContent, chatKey).split("::");
                    var sender = fragments[0];
                    var content = forge.util.decodeUtf8(forge.util.hexToBytes(fragments[1]));
                    var contentJSON = JSON.parse(content);
                    var value = contentJSON["value"];
                    var quote = contentJSON["quote"];
                    var signature = forge.util.hexToBytes(fragments[2]);
                    var msgType = fragments[3] ?? "text";
                    var publickey = await messenger.session.getPublicKey(sender);
                    var md = forge.md.sha1.create();
                    md.update(content, 'utf8');

                    var verified;
                    try {
                        verified = publickey.verify(md.digest().bytes(), signature);
                    } catch {
                        verified = false;
                    }
                    if (!verified) {
                        console.warn("could not verify sender");
                        console.log([sender, publickey, md.digest().bytes()]);
                    }
                    resolve({
                        content: value,
                        sender: sender,
                        verified: verified,
                        msgType: msgType,
                        quote: quote
                    });

                });
            }
        }

        // files
        {
            messenger.encryption.file = {};
            messenger.encryption.file.loader = function () {
                let fileLoader = document.createElement("input");
                fileLoader.setAttribute("type", "file");
                fileLoader.click();
                return fileLoader
            }

            messenger.encryption.file.createThumbnail = function (file) {
                if (file.type.startsWith("image/")) {
                    var maxDimension = 150;
                    var scaleRatio = maxDimension / Math.max(file.width, file.height);
                    var reader = new FileReader();
                    var thumbnailCanvas = document.createElement("canvas");
                    var canvasContext = thumbnailCanvas.getContext('2d');
                    return new Promise((resolve, reject) => {
                        reader.onload = function (event) {
                            var img = new Image();
                            img.onload = function () {
                                var scaleRatio = maxDimension / Math.max(img.width, img.height);
                                let w = img.width * scaleRatio;
                                let h = img.height * scaleRatio;
                                thumbnailCanvas.width = w;
                                thumbnailCanvas.height = h;
                                canvasContext.drawImage(img, 0, 0, w, h);
                                console.debug(["thumbnail", thumbnailCanvas.toDataURL(file.type)]);
                                return resolve(thumbnailCanvas.toDataURL(file.type));
                            }
                            img.src = event.target.result;
                        }
                        reader.readAsDataURL(file);
                    });
                } else {
                    return false;
                }

            }

            messenger.encryption.file.load = function (elmt) {
                if (!elmt.getAttribute("disabled")) {
                    let fileLoader = messenger.encryption.file.loader();
                    fileLoader.onchange = async function () {
                        let reader = new FileReader();
                        let chatInformation = messenger.session.chatInformation;
                        messenger.gui.popup.show("Encrypting file", "Please wait until the file is encrypted. The current encryption method increases the files size by a factor of 4 to 6, which might make your device quite slow for some time.", undefined, false);
                        reader.onload = async function () {

                            let encryptedPackage = await messenger.encryption.aes.encrypt(reader.result, chatInformation[messenger.session.selectedContact.username].chatKey);
                            messenger.encryption.file.send(encryptedPackage, chatInformation[messenger.session.selectedContact.username].chatId, fileLoader.files[0].name, fileLoader.files[0].size, fileLoader.files[0].type, await messenger.encryption.file.createThumbnail(fileLoader.files[0]));
                        }

                        reader.readAsDataURL(fileLoader.files[0]);
                    }
                }
            }

            messenger.encryption.file.formatBytes = function (bytes, decimals = 2) {
                // (c) by https://stackoverflow.com/a/18650828/13001645
                if (bytes === 0) return '0 Bytes';

                const k = 1024;
                const dm = decimals < 0 ? 0 : decimals;
                const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

                const i = Math.floor(Math.log(bytes) / Math.log(k));

                return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
            }

            messenger.encryption.file.send = function (data, chatId, fileName, fileSize, mimeType, thumbnail) {
                console.debug(["sending file:", data, chatId, fileName]);
                messenger.gui.popup.show("Sending file", "Please wait until the file has reached the server. This might take a moment.", undefined, false);
                messenger.session.request("sendfile", {
                    content: data
                }, false, undefined, async function (response) {
                        messenger.gui.popup.hide();
                        if (response.success) {
                            var encryptedMessage = await messenger.encryption.message.encrypt(JSON.stringify({
                                "value": [fileName, response.data, fileSize, data.length, mimeType, forge.util.bytesToHex(thumbnail)].join(":"),
                                "quote": messenger.gui.messages.quote
                            }), messenger.session.selectedContact.username, "file");
                            messenger.session.sendMessage(encryptedMessage, messenger.session.selectedContact.username);
                        } else {
                            messenger.gui.popup.show("Error sending file", "The Server responded with an error\n" + JSON.stringify(response, null, 3), [{
                                label: "ok",
                                callback: function () {
                                    messenger.gui.popup.hide();
                                }
                        }]);
                        }
                    }, undefined,
                    function () {
                        messenger.encryption.file.send(data, chatId, fileName);
                    });
            }
            messenger.encryption.file.download = function (fileId, chatId, fileName) {
                console.debug(fileId);
                messenger.gui.popup.show("Downloading file", "Please wait until the file has downloaded. This might take a moment.", undefined, false);
                messenger.session.request("getfile", {
                    id: fileId
                }, false, undefined, async function (response) {
                        messenger.gui.popup.hide();
                        if (response.success) {
                            messenger.gui.popup.show("Decrypting file", "This can take a moment, depenging on your devices performance and the size of the file.", undefined, false);
                            let chatInformation = messenger.session.chatInformation;
                            let chatKey;
                            for (var i in chatInformation) {
                                if (chatInformation[i].chatId == chatId) {
                                    chatKey = chatInformation[i].chatKey;
                                    break;
                                }
                            }
                            try {
                                let decryptedFile = messenger.encryption.aes.decrypt(response.data, chatKey);
                                console.debug(decryptedFile);
                                messenger.encryption.file.startDownload(decryptedFile, fileName);
                            } catch (e) {
                                messenger.gui.popup.show("Error Decrypting file", "We could not decrypt the File.");
                                console.debug(e);
                            }
                        } else {
                            messenger.gui.popup.show("Error Fetching your File", "The request could not be satisfied.\n" + JSON.stringify(response, null, 3));
                        }
                    }, undefined,
                    function () {
                        messenger.encryption.file.download(fileId, chatId, fileName);
                    });
            }
            messenger.encryption.file.startDownload = function (file, fileName) {
                let link = document.createElement("a");
                link.download = fileName;
                link.href = file;
                link.click();
                messenger.gui.popup.hide();
            }
        }
    }

    // gui
    {
        messenger.gui = {};

        // backgroundLog
        {
            messenger.gui.konami = {};
            messenger.gui.konami.sequence = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"].reverse();
            messenger.gui.konami.progress = messenger.gui.konami.sequence.length;
            messenger.gui.konami.done = false;

            messenger.gui.konami.listener = function (e) {
                if (!messenger.gui.konami.done) {
                    if (e.key == messenger.gui.konami.sequence[messenger.gui.konami.progress - 1]) {
                        messenger.gui.konami.progress--;
                    } else {
                        messenger.gui.konami.progress = messenger.gui.konami.sequence.length;
                    }
                    if (messenger.gui.konami.progress == 0) {
                        messenger.gui.konami.done = true;
                        messenger.gui.backgroundLog.enable();
                        console.debug("background log enabled");
                    }
                }
            }
            messenger.gui.backgroundLog = {};

            messenger.gui.backgroundLog.enable = function () {
                messenger.gui.backgroundLog.disable();
                messenger.gui.backgroundLog.elmnt = document.createElement("div");
                messenger.gui.backgroundLog.elmnt.classList.add("backgroundLog");
                document.body.appendChild(messenger.gui.backgroundLog.elmnt);
            }

            messenger.gui.backgroundLog.disable = function () {
                if (messenger.gui.backgroundLog.elmnt) {
                    document.body.removeChild(messenger.gui.backgroundLog.elmnt);
                    messenger.gui.backgroundLog.elmnt = false;

                }

            }
            messenger.gui.backgroundLog.elmnt = false;
        }
        // audio
        {

            messenger.gui.audio = {};
            messenger.gui.audio.playNewMessage = function () {
                var audio = new Audio('soundEffects/new_message.wav');
                audio.play();
            }

            messenger.gui.audio.playError = function () {
                var audio = new Audio('soundEffects/error.wav');
                audio.play();
            }

            messenger.gui.audio.playNewChat = function () {
                var audio = new Audio('soundEffects/new_chat.wav');
                audio.play();
            }
        }



        // settings
        {
            messenger.gui.toggle = async function (target) {
                return new Promise(async function (resolve, reject) {


                    if (messenger.session.chatKeyInboxListener && messenger.session.chatKeyInboxListener.abort) {
                        messenger.session.chatKeyInboxListener.abort();
                    }

                    messenger.gui.popup.hide();

                    target = target ?? (await messenger.session.isLoggedIn() ? "main" : "signin");

                    target = ["signin", "signup", "main"].indexOf(target) > -1 ? target : "signin";


                    $.ajax(target + ".htm?v=0.8.4.alpha").always(
                        function (a, textStatus, c) {
                            let response = textStatus == "success" ? a : c;

                            if (textStatus == "success") {

                                document.querySelector("body > main").innerHTML = response;
                                document.querySelector("body > main").dataset.state = target;
                                messenger.gui.formHandling.autoFillServer();
                                resolve(true);
                            } else {
                                messenger.gui.popup.show("Error During Request", c);
                                resolve(false);
                            }
                        });

                });

            }
            messenger.gui.showSettings = function () {
                document.querySelector("main").classList.add("settingsOpen");
                document.getElementById("theme").value = messenger.gui.theme.currentTheme;
                document.getElementById("jsHeapSize").innerHTML = messenger.encryption.file.formatBytes(window.performance.memory.totalJSHeapSize, 3) + " of " + messenger.encryption.file.formatBytes(window.performance.memory.jsHeapSizeLimit, 3) + " used.";
            }

            messenger.gui.hideSettings = function () {
                document.querySelector("main").classList.remove("settingsOpen");
            }
        }

        // popup
        {
            messenger.gui.popup = {};

            messenger.gui.popup.show = function (heading, body, buttons, noError) {
                if (!noError) {
                    messenger.gui.audio.playError();
                }
                console.debug(heading + ": " + body);
                this.hide();

                this.currentPopup = {};

                this.currentPopup.wrapper = document.createElement("div");
                this.currentPopup.wrapper.classList.add("fullsize", "popup", "centered", "container");
                document.body.appendChild(this.currentPopup.wrapper);

                this.currentPopup.container = document.createElement("div");
                this.currentPopup.container.classList.add("container");
                this.currentPopup.wrapper.appendChild(this.currentPopup.container);

                this.update.heading(heading);

                this.update.body(body);

                this.update.buttons(buttons);

                return;

            }

            messenger.gui.popup.hide = function () {
                if (this.currentPopup && this.currentPopup.wrapper.parentElement) {
                    document.body.removeChild(this.currentPopup.wrapper);
                }
            }

            // update
            {

                messenger.gui.popup.update = {};

                messenger.gui.popup.update.heading = function (newHeading, append) {
                    messenger.gui.popup.currentPopup.headingParagraph = messenger.gui.popup.currentPopup.headingParagraph ?? document.createElement("h2");
                    if (!append) {
                        messenger.gui.popup.currentPopup.headingParagraph.innerHTML = "";
                    }
                    messenger.gui.popup.currentPopup.headingParagraph.appendChild(document.createTextNode(newHeading ?? ""));
                    if (!messenger.gui.popup.currentPopup.headingParagraph.parentElement) {
                        messenger.gui.popup.currentPopup.container.appendChild(messenger.gui.popup.currentPopup.headingParagraph);
                    }
                }

                messenger.gui.popup.update.body = function (newBody, append) {
                    messenger.gui.popup.currentPopup.bodyParagraph = messenger.gui.popup.currentPopup.bodyParagraph ?? document.createElement("p");
                    messenger.gui.popup.currentPopup.bodyParagraph.innerHTML = "";

                    if (append) {
                        messenger.gui.popup.currentPopup.bodySpans = messenger.gui.popup.currentPopup.bodySpans ?? [];
                    } else {
                        messenger.gui.popup.currentPopup.bodySpans = [];
                    }

                    var newSpan = document.createElement("span");
                    newSpan.appendChild(document.createTextNode(newBody ?? ""));
                    messenger.gui.popup.currentPopup.bodySpans.push(newSpan);

                    for (var i of messenger.gui.popup.currentPopup.bodySpans) {
                        messenger.gui.popup.currentPopup.bodyParagraph.appendChild(i);
                    }

                    if (!messenger.gui.popup.currentPopup.bodyParagraph.parentElement) {
                        messenger.gui.popup.currentPopup.container.appendChild(messenger.gui.popup.currentPopup.bodyParagraph);
                    }
                }

                messenger.gui.popup.update.buttons = function (newButtons, append) {
                    messenger.gui.popup.currentPopup.buttons = [];

                    if (!append) {
                        for (var i of messenger.gui.popup.currentPopup.container.querySelectorAll("input")) {
                            i.outerHTML = "";
                        }
                    }

                    for (var i of newButtons ?? []) {
                        var button = document.createElement("input");
                        button.setAttribute("type", "submit");
                        button.setAttribute("value", i.label);
                        button.onclick = i.callback;
                        if (i.disabled) {
                            button.setAttribute("disabled", "true");
                        }
                        messenger.gui.popup.currentPopup.container.appendChild(button);

                        messenger.gui.popup.currentPopup.buttons.push(button);

                        if (i.autofocus) {
                            button.focus();
                        }
                    }
                }

                messenger.gui.popup.update.disableButtons = function (indexes) {
                    if (indexes) {
                        for (var i of indexes) {
                            messenger.gui.popup.currentPopup.buttons[i].setAttribute("disabled", true);
                        }
                    } else {
                        for (var i of messenger.gui.popup.currentPopup.buttons) {
                            i.setAttribute("disabled", true);
                        }
                    }
                }
                messenger.gui.popup.update.enableButtons = function (indexes) {
                    if (indexes) {
                        for (var i of indexes) {
                            messenger.gui.popup.currentPopup.buttons[i].removeAttribute("disabled");
                        }
                    } else {
                        for (var i of messenger.gui.popup.currentPopup.buttons) {
                            i.removeAttribute("disabled", true);
                        }
                    }
                }
            }


        }

        //contextMenu
        {

            messenger.gui.contextMenu = {};

            messenger.gui.contextMenu.create = function (messageElement, e) {
                if (e.target.nodeName == "A") {
                    return;
                }
                e.preventDefault();

                messenger.gui.contextMenu.remove();

                document.getElementById("messages").addEventListener("scroll", messenger.gui.contextMenu.remove);
                document.body.addEventListener("click", function (e) {
                    console.log(e.path);
                    if (e.path.indexOf(document.querySelector(".contextmenu")) == -1 || e.path[0].dataset.closeonclick == "true") {
                        messenger.gui.contextMenu.remove();
                    }
                });

                var [x, y] = [e.clientX, e.clientY];
                var contextMenu = document.createElement("div");

                if (document.body.clientWidth / 2 - x < 0) {
                    x = document.body.clientWidth - x;
                    contextMenu.classList.add("right");

                }

                contextMenu.classList.add("contextmenu");
                contextMenu.style.setProperty("--x", x);
                contextMenu.style.setProperty("--y", y);
                contextMenu.dataset["message"] = messageElement.dataset["messageId"];

                document.body.appendChild(contextMenu);

                var items = [
                    {
                        text: "message id: " + messageElement.dataset["messageId"]
                    }, {
                        text: "send-time: " + messageElement.dataset["timestamp"]
                    },
                    {
                        text: "sender verified: " + messageElement.dataset["verified"]
                    },
                    {
                        text: "encryption type: " + messageElement.dataset["encryptiontype"]
                    },
                    {
                        text: "quote",
                        "action": function () {
                            messenger.gui.messages.quote = {
                                text: messageElement.dataset["sourcetext"],
                                username: messageElement.dataset["sender"],
                                messageId: messageElement.dataset["messageId"]
                            }
                        }
        },
                    {
                        text: "copy text",
                        "action": function () {
                            navigator.clipboard.writeText(messageElement.dataset["sourcetext"]);
                        }
        }
            ];

                if (messageElement.dataset["success"] == "false") {
                    items.splice(0, 0, {
                        text: "error decrypting"
                    });
                }

                if (messageElement.parentElement.classList.value.split(" ").indexOf("sent") >= 0) {
                    contextMenu.classList.add("sent");
                    // can't delete messages
                    //                    items.push({
                    //                        text: "delete",
                    //                        action: function () {
                    //                            chat.connection.apiRequest("deletemsg", {
                    //                                username: sessionStorage["username"],
                    //                                messageid: messageElement.dataset["messageId"]
                    //                            }, function () {
                    //                                messenger.gui.contextMenu.remove();
                    //                                messageElement.parentElement.classList.add("deleting");
                    //                                setTimeout(function () {
                    //                                    messageElement.style.display = "none";
                    //                                }, isNaN(parseFloat(getComputedStyle(document.body).getPropertyValue('--transitionduration'))) ? 0.4 : parseFloat(getComputedStyle(document.body).getPropertyValue('--transitionduration')));
                    //                            }, false);
                    //                        }
                    //                    });
                } else {
                    contextMenu.classList.add("recieved");
                }

                for (var i of items) {
                    var item = document.createElement("div");
                    item.appendChild(document.createTextNode(i.text));
                    if (i.action != undefined) {
                        item.addEventListener("click", i.action);
                        item.dataset.closeonclick = "true";
                    } else {
                        item.classList.add("info");
                    }
                    contextMenu.appendChild(item);
                }
            };

            messenger.gui.contextMenu.remove = function () {
                while (document.querySelector("div.contextmenu") != null) {
                    document.querySelector("div.contextmenu").outerHTML = "";
                }
            };
        }

        // form-handling
        {
            messenger.gui.formHandling = {};

            messenger.gui.formHandling.autoFillServer = function () {
                if (document.querySelector("input[name=serverurl]")) {
                    document.querySelector("input[name=serverurl]").value = document.location.origin;
                }
            }

            messenger.gui.formHandling.triggerLogin = function (e) {
                var serverName = document.querySelector("input[name=serverurl]").value;
                var username = document.querySelector("input[name=username]").value;
                var password = document.querySelector("input[name=password]").value;
                messenger.session.logIn(username, password, serverName);
                if (document.querySelector("#login form")) {
                    document.querySelector("#login form").reset();
                }
            }

            messenger.gui.formHandling.triggerSignUp = async function (e) {
                var serverName = document.querySelector("input[name=serverurl]").value;
                var username = document.querySelector("input[name=username]").value;
                var password = document.querySelector("input[name=password]").value;
                var licenceKey = document.querySelector("input[name=licenceKey]").value;
                await messenger.session.createAccount(username, password, licenceKey, serverName);
                if (document.querySelector("#signup form")) {
                    document.querySelector("#signup form").reset();
                }
            }
        }


        // markdown
        {
            messenger.gui.markdown = {};
            messenger.gui.markdown.regexUrlEmail = /(?<url>(?:(?<scheme>[a-zA-Z]*:\/\/)(?<hostnameWithScheme>[-a-zA-Z0-9À-ÖØ-öø-ÿ@:%._\+~#=]{1,256})|(?<hostnameNoScheme>(?:[-a-zA-Z0-9À-ÖØ-öø-ÿ@:%_\+~#=]{1,256}\.){1,256}(?:[-a-zA-Z0-9À-ÖØ-öø-ÿ@:%_\+~#=]{1,256})))(?<path>(?:\/[-a-zA-Z0-9!$&'()*+,\\\/:;=@\[\]._~%]*)*)(?<query>(?:(?:\#|\?)[-a-zA-Z0-9!$&'()*+,\\\/:;=@\[\]._~]*)*))|(?<email>(?<username>[-a-zA-Z0-9À-ÖØ-öø-ÿ@:%._\+~#=]{1,256})@(?<hostname>[-a-zA-Z0-9À-ÖØ-öø-ÿ@:%._\+~#=]{1,256}(\.[a-zA-Z0-9()])?))/gi;

            messenger.gui.markdown.filterLinks = function (elmt) {
                var matches = elmt.innerHTML.matchAll(messenger.gui.markdown.regexUrlEmail);
                for (const match of matches) {
                    if (match.groups.email) {
                        elmt.innerHTML = (elmt.innerHTML.split(match.groups.email).join("<a href='mailto:" + match.groups.email + "'>" + match.groups.email + "</a>"));
                    } else if (match.groups.scheme) {
                        elmt.innerHTML = (elmt.innerHTML.split(match.groups.url).join("<a href='" + match.groups.url + "'>" + match.groups.url + "</a>"));
                    } else if (match.groups.url) {
                        elmt.innerHTML = (elmt.innerHTML.split(match.groups.url).join("<a href='http://" + match.groups.url + "'>" + match.groups.url + "</a>"));
                    }
                }
                return elmt;
            }

            messenger.gui.markdown.toHTML = function (mdString) {
                mdString = Array.from(mdString);
                var htmlElement = document.createElement("span");

                var state = {
                    "*": {
                        tagName: "b"
                    }, // bold
                    "~": {
                        tagName: "s"
                    }, // strikethrough
                    "`": {
                        tagName: "code"
                    }, // code
                    "_": {
                        tagName: "i"
                    }, // italic
                };
                var escapeCharacter = "\\";

                var escapeNextChar = false;

                var activeElement = htmlElement;

                while (mdString.length > 0) {
                    let i = mdString.shift();
                    if (i == escapeCharacter) {
                        escapeNextChar = true;
                    } else {
                        if (state[i] && !escapeNextChar) {
                            if (state[i].element) {
                                activeElement = state[i].element.parentElement;
                                state[i].element = undefined;
                            } else {
                                state[i].element = document.createElement(state[i].tagName);
                                activeElement.appendChild(state[i].element);
                                activeElement = state[i].element;
                            }
                        } else {
                            if (activeElement.lastChild && activeElement.lastChild.nodeName == "#text") {
                                activeElement.lastChild.nodeValue += i;
                            } else {
                                activeElement.appendChild(document.createTextNode(i));
                            }
                        }
                        escapeNextChar = false;
                    }
                }
                htmlElement = this.filterLinks(htmlElement);
                return htmlElement;
            }
        }

        // messages 
        {
            messenger.gui.messages = {};

            Object.defineProperty(messenger.gui.messages, 'quote', {
                get: function () {
                    return messenger.gui.messages._quote;
                },
                set: function (value) {
                    var quoter = document.getElementById("quotedMessage");
                    console.debug([value, quoter]);
                    if (quoter) {
                        if (value) {
                            quoter.innerHTML = "";
                            quoter.classList.add("quotingMessage");
                            quoter.dataset.quoteText = value.text;
                            quoter.appendChild(messenger.gui.markdown.toHTML(value.text));
                            quoter.dataset.quoteUsername = value.username;
                        } else {
                            quoter.innerHTML = "";
                            quoter.classList.remove("quotingMessage");
                            quoter.dataset.quoteText = undefined;
                            quoter.dataset.quoteUsername = undefined;
                        }
                    }

                    return messenger.gui.messages._quote = value;
                }
            });


            messenger.gui.messages.notification = {};

            messenger.gui.messages.notification.notified = {};

            messenger.gui.messages.notification.init = async function () {
                if (location.protocol == 'https:') {
                    var permission = await Notification.requestPermission();
                    if (permission == "granted") {

                    } else {
                        messenger.gui.popup.show("Permission Denied for Notifications", "If you wish to recieve notifications for incoming messages, you must allow notifications for this website.", [{
                            label: "ok",
                            callback: function () {
                                messenger.gui.popup.hide();
                            }
                        }, {
                            label: "retry",
                            callback: function () {
                                messenger.gui.messages.notification.init();
                            }
                        }]);
                    }
                }
            }
            messenger.gui.messages.notification.show = async function (chatId, content, messageId) {
                if (!messenger.gui.messages.notification.notified[messageId]) {
                    messenger.gui.messages.notification.notified[messageId] = true;
                    var chatInformation = messenger.session.chatInformation;
                    var username;
                    for (var i in chatInformation) {
                        if (chatInformation[i].chatId == chatId) {
                            username = i;
                            break;
                        }
                    }

                    new Notification(username, {
                        body: messenger.gui.markdown.toHTML(content).innerText,
                        tag: messageId
                    }).onclick = function () {
                        messenger.gui.messages.goTo(username, messageId);
                    };
                }
            }


            messenger.gui.messages.goTo = function (contact, messageId, n) {
                if ((n ?? 0) > 5) {
                    messenger.gui.popup.show("Message not found", "The message from '" + contact + "' with ID #" + messageId + " could not be found within the loaded messages.", [{
                        label: "ok",
                        autofocus: true,
                        callback: function (e) {
                            messenger.gui.popup.hide();
                        }
                }], false);
                } else if (document.querySelector(".message[data-message-id='" + messageId + "']")) {
                    document.querySelector(".message[data-message-id='" + messageId + "']").scrollIntoView();
                    document.querySelector(".message[data-message-id='" + messageId + "']").parentElement.classList.add("goTo");
                    setTimeout(function () {
                        document.querySelector(".message[data-message-id='" + messageId + "']").parentElement.classList.remove("goTo");
                    }, 1000);
                } else if (messenger.session.selectedContact.username != contact && document.querySelector("div.contact[data-username='" + contact + "']")) {
                    messenger.gui.contacts.select(document.querySelector("div.contact[data-username='" + contact + "']"));
                    setTimeout(function () {
                        messenger.gui.messages.goTo(contact, messageId, n + 1);
                    }, 200);
                } else {
                    messenger.gui.messages.goTo(contact, messageId, Infinity);
                }


            }

            messenger.gui.messages.findPlace = function (timestamp, targetElmt) {
                var targetTimestanp = new Date(timestamp).getTime();
                for (var i of targetElmt.children) {
                    if (i.firstChild.dataset["timestampUnix"] < targetTimestanp) {
                        return i;
                    }
                }
                return false;

            }

            messenger.gui.messages.noOlderMessages = false;
            messenger.gui.messages.requestingOlderMessages = false;

            messenger.gui.messages.handleScroll = async function (elmt) {
                if (Math.abs(elmt.scrollTop) < 20) {
                    document.getElementById("newMessageIndicator").classList.remove("visible");
                } else {
                    document.getElementById("newMessageIndicator").classList.add("visible");
                }
                if (!messenger.gui.messages.noOlderMessages && !messenger.gui.messages.requestingOlderMessages && messenger.session.selectedContact.username && Math.abs(elmt.scrollHeight - elmt.clientHeight + elmt.scrollTop) <= 20) {
                    messenger.gui.messages.requestingOlderMessages = true;
                    elmt.classList.add("loadingOlder");
                    var messages = await messenger.session.getMessages(messenger.session.chatInformation[messenger.session.selectedContact.username].chatId, elmt.childElementCount + 1);
                    messenger.gui.messages.noOlderMessages = messages.length == 0;
                    messenger.session.handleMessages(messages, false);
                    messenger.gui.messages.requestingOlderMessages = false;
                    elmt.classList.remove("loadingOlder");
                } else if (messenger.gui.messages.noOlderMessages) {
                    elmt.classList.add("noOlder");
                }
            }
            messenger.gui.messages.append = function (messageData) {
                var target = document.getElementById("messages");
                var message = this.createMessageElement(messageData.content, messageData.sender == messenger.session.username ? "sent" : "recieved", messageData.timestamp, messageData.messageId, messageData.verified, messageData.encryptionType, messageData.msgType, messageData.chatId, messageData.quote);
                var scroll = Math.abs(target.scrollTop) <= 100;
                if (!target.querySelector("div.message[data-message-id='" + messageData.messageId + "']")) {
                    var place = messenger.gui.messages.findPlace(messageData.timestamp, target);
                    if (!place) {
                        target.append(message)
                    } else {
                        target.insertBefore(message, place);
                    }

                    if (scroll) {
                        target.scrollTop = target.scrollHeight;
                    }
                }
                console.timeLog("msgrecieve #" + messageData.messageId);
                console.timeEnd("msgrecieve #" + messageData.messageId);
            }

            messenger.gui.messages.createMessageElement = function (content, direction, timestamp, messageId, verified, encryptionType, msgType, chatId, quote) {
                var container = document.createElement("div");
                container.classList.add(direction);
                var message = document.createElement("div");
                message.dataset["verified"] = verified ?? false;
                message.dataset["sourcetext"] = content;
                message.dataset["sender"] = direction == "sent" ? messenger.session.username : messenger.session.selectedContact.username;
                message.dataset["encryptiontype"] = encryptionType ?? false;
                message.classList.add("message", msgType);
                //                console.debug(quote);
                if (quote && quote.text) {
                    message.classList.add("hasQuote");
                    var quoteElement = document.createElement("div");
                    quoteElement.classList.add("quote");
                    quoteElement.dataset.username = quote["username"];
                    quoteElement.appendChild(messenger.gui.markdown.toHTML(quote["text"]));
                    quoteElement.onclick = function () {
                        messenger.gui.messages.goTo(quote["username"], quote["messageId"]);
                    }
                    message.appendChild(quoteElement);
                }
                if (msgType == "file") {
                    console.debug(content.split(":"));
                    message.dataset["fileName"] = content.split(":")[0];
                    message.dataset["fileId"] = content.split(":")[1];
                    message.dataset["fileSizeUnencrypted"] = messenger.encryption.file.formatBytes(content.split(":")[2] ?? 0);
                    message.dataset["fileSizeEncrypted"] = messenger.encryption.file.formatBytes(content.split(":")[3] ?? 0);
                    var fileContainer = document.createElement("div");
                    fileContainer.dataset["fileMimeType"] = content.split(":")[4];
                    fileContainer.classList.add("fileContainer");
                    var thumbnail = forge.util.hexToBytes(content.split(":")[5]);
                    if (thumbnail != false) {
                        var thumbnailContainer = document.createElement("div");
                        thumbnailContainer.classList.add("thumbnailContainer");

                        thumbnailContainer.style.backgroundImage = "url(" + thumbnail + ")";
                        fileContainer.appendChild(thumbnailContainer);
                        fileContainer.classList.add("hasThumbnail");
                    }
                    fileContainer.appendChild(document.createTextNode(content.split(":")[0]));
                    message.appendChild(fileContainer);
                    message.onclick = function () {
                        messenger.encryption.file.download(message.dataset["fileId"], chatId, message.dataset["fileName"])
                    }
                } else {
                    message.appendChild(messenger.gui.markdown.toHTML(content));
                }
                var date = new Date(timestamp);
                message.dataset.timestamp = timestamp;
                message.dataset.timestampYear = date.getFullYear();
                message.dataset.timestampYearShort = String(date.getFullYear()).substr(-2);
                message.dataset.timestampMonth = ("00" + (date.getMonth() + 1)).substr(-2);
                message.dataset.timestampDay = ("00" + date.getDate()).substr(-2);
                message.dataset.timestampHours = ("00" + date.getHours()).substr(-2);
                message.dataset.timestampMinutes = ("00" + date.getMinutes()).substr(-2);
                message.dataset.timestampSeconds = ("00" + date.getSeconds()).substr(-2);
                message.dataset.timestampMilliseconds = ("00" + date.getMilliseconds()).substr(-2);
                message.dataset.timestampUnix = date.getTime();
                message.dataset.messageId = messageId;
                message.addEventListener("contextmenu", function (e) {
                    messenger.gui.contextMenu.create(message, e);
                });

                container.appendChild(message);

                return container;
            }
        }

        // contacts
        {

            messenger.gui.contacts = {};

            messenger.gui.contacts.elements = [];

            messenger.gui.contacts.refresh = async function () {
                var chatinfo = await messenger.session.getChatInformation(true);
                this.elements = [];
                for (var i in chatinfo) {
                    this.append(i, chatinfo[i].chatId);
                }
                this.updateList();
                return true;
            }

            messenger.gui.contacts.append = function (username, chatId) {
                var contactElement = this.createContactElement(username);
                contactElement.dataset.chatId = chatId;
                this.elements.push(contactElement);
                return contactElement;
            }


            messenger.gui.contacts.updateList = function (target) {
                var target = target ?? document.getElementById("currentContacts");
                target.innerHTML = "";
                for (var i of this.elements) {
                    target.appendChild(i);
                }
            }

            messenger.gui.contacts.pushFront = function (elements, target) {
                target = target ?? document.getElementById("currentContacts");
                for (var i of elements) {
                    console.log(["pushing", i]);
                    if (target.firstChild) {
                        target.insertBefore(i, target.firstElementChild);
                    } else {
                        target.appendChild(i);
                    }
                }
            }

            messenger.gui.contacts.createContactElement = function (username, extraClassList) {
                var contact = document.createElement("div");
                //                console.debug(username, messenger.session.selectedContact.username);
                if (username == messenger.session.selectedContact.username) {
                    contact.classList.add("selected");
                    //                    console.debug("selected");

                }
                contact.classList.add("contact");
                contact.setAttribute("role", "listitem");
                contact.setAttribute("title", username);
                contact.dataset.username = username;
                if (extraClassList) {
                    contact.classList.add(...extraClassList);
                }

                var namespan = document.createElement("span");
                namespan.appendChild(document.createTextNode(username));
                namespan.classList.add("name");
                contact.appendChild(namespan);

                contact.addEventListener("click", function (e) {

                    if (Object.values(e.srcElement.classList).indexOf("fingerprint") == -1) {
                        messenger.gui.contacts.select(contact);
                    }
                });

                var fingerprint = document.createElement("div");
                fingerprint.classList.add("fingerprint");
                fingerprint.addEventListener("click", function () {
                    messenger.gui.contacts.verifyFingerprint(username);
                })
                namespan.appendChild(fingerprint);

                return contact;
            }

            messenger.gui.contacts.verifyFingerprint = async function (username) {
                messenger.gui.popup.show("Public Key Fingerprint of " + username, forge.util.bytesToHex(forge.ssh.getPublicKeyFingerprint(await messenger.session.getPublicKey(username)).data).match(/.{1,4}/g).join(" "), [{
                    label: "ok",
                    autofocus: true,
                    callback: function (e) {
                        messenger.gui.popup.hide();
                    }
                }], false);

            }

            messenger.gui.contacts.select = async function (contactElement) {
                document.getElementById("contactName").click();
                var username = contactElement.dataset.username;
                contactElement.classList.remove("newMessage");
                for (var i of document.querySelectorAll(".contact.selected")) {
                    i.classList.remove("selected");
                }
                contactElement.classList.add("selected");
                console.debug(contactElement);
                if (contactElement.classList.contains("searchResult") && !messenger.session.chatInformation[username]) {
                    messenger.gui.popup.show("Do You Want to Create a Chat?", "Do you really want to create a chat with '" + username + "'? The recipient will see the empty chat as soon as you create it, even if you have not yet sent any message.", [{
                        label: "yes, create chat",
                        callback: async function () {
                            messenger.gui.contacts.search("");
                            messenger.gui.popup.hide();
                            var chatInformation = await messenger.session.createChat(username);
                            messenger.gui.contacts.select(messenger.gui.contacts.append(username, chatInformation.chatId));
                        }
                        }, {
                        label: "no, abort",
                        callback: function () {
                            messenger.gui.popup.hide();
                        }
                        }], false);
                } else {
                    await messenger.session.selectedContact.select(username);

                }


                var chatInformation = messenger.session.chatInformation;
                if (chatInformation[username]) {

                    document.getElementById("contactName").innerHTML = "";
                    document.getElementById("messages").innerHTML = "";

                    document.getElementById("contactName").appendChild(document.createTextNode(username));
                    document.querySelector("main > .main").classList.remove("contactsVisible");
                    document.querySelector("textarea#messageContent").removeAttribute("disabled", "true");
                    document.querySelector("div#attach").removeAttribute("disabled", "true");
                    document.querySelector("div#send").removeAttribute("disabled", "true");
                    document.getElementById("contactName").addEventListener("click", function (e) {
                        for (var i of document.querySelectorAll(".contact.selected")) {
                            i.classList.remove("selected");
                        }

                        document.getElementById("messages").innerHTML = "";
                        document.getElementById("messages").classList.remove("loadingOlder", "noOlder");
                        messenger.gui.messages.noOlderMessages = false;
                        messenger.gui.messages.requestingOlderMessages = false;

                        document.getElementById("contactName").innerHTML = "";
                        messenger.session.selectedContact.deselect();
                        document.querySelector("main > .main").classList.add("contactsVisible");
                        document.querySelector("textarea#messageContent").setAttribute("disabled", "true");
                        document.querySelector("div#attach").setAttribute("disabled", "true");
                        document.querySelector("div#send").setAttribute("disabled", "true");
                    }, {
                        once: true
                    });
                    contactElement.parentElement.insertBefore(contactElement.parentElement.firstChild, contactElement);
                    var messages = await messenger.session.getMessages(contactElement.dataset.chatId);
                    messenger.session.handleMessages(messages, false);

                    document.getElementById("messages").scrollTop = document.getElementById("messages").scrollHeight;
                }

            }

            messenger.gui.contacts.search = function (query) {
                messenger.session.request("search", {
                    user: query
                }, false, undefined, function (response) {
                    var searchResults = [];
                    for (var i of response.data ?? []) {
                        searchResults.push(messenger.gui.contacts.createContactElement(i, ["searchResult"]));
                    }

                    messenger.gui.contacts.updateList();
                    document.querySelector("div #searchResults").innerHTML = "";
                    messenger.gui.contacts.pushFront(searchResults, document.querySelector("div #searchResults"));
                }, undefined, function () {
                    messenger.gui.contacts.search(query);
                })
            }

            messenger.gui.contacts.triggerSearch = function (event, elmt) {
                if (event.key == "Enter") {
                    this.search(elmt.value);
                }
            }
            messenger.gui.contacts.triggerSend = async function (event, elmt) {
                if ((event.key == "Enter" || event.type == "click") && messenger.gui.markdown.toHTML(document.getElementById("messageContent").value).innerText.replaceAll("\n", "") == "") {
                    // to do
                    event.preventDefault();
                } else if (event.key == "Enter" && messenger.session.selectedContact.username && !event.shiftKey) {
                    event.preventDefault();
                    var encryptedMessage = await messenger.encryption.message.encrypt(JSON.stringify({
                        "value": elmt.value,
                        "quote": messenger.gui.messages.quote
                    }), messenger.session.selectedContact.username, "text")
                    messenger.session.sendMessage(encryptedMessage, messenger.session.selectedContact.username);
                    elmt.value = "";
                    messenger.gui.messages.quote = false;

                } else if (event.type == "click" && elmt.id == "send" && !elmt.getAttribute("disabled")) {
                    elmt = document.getElementById("messageContent");
                    var encryptedMessage = await messenger.encryption.message.encrypt(JSON.stringify({
                        "value": elmt.value,
                        "quote": messenger.gui.messages.quote
                    }), messenger.session.selectedContact.username, "text");
                    messenger.session.sendMessage(encryptedMessage, messenger.session.selectedContact.username);
                    elmt.value = "";
                    messenger.gui.messages.quote = false;
                }
            }

            messenger.gui.contacts.recievedNewMessage = async function (chatId) {
                var contactElement = document.querySelector("div.contact[data-chat-id='" + chatId + "']");
                if (!contactElement) {
                    console.log(["cE0", chatId]);
                    var chatInformation = messenger.session.chatInformation;
                    var username;
                    for (var i in chatInformation) {
                        if (chatInformation[i].chatId == chatId) {
                            username = i;
                            console.log(["cE1", i]);
                            break;
                        }
                    }
                    if (username) {
                        console.log(["cE2", username]);
                        contactElement = messenger.gui.contacts.append(username, chatId);
                    } else {
                        console.log(["cE3", chatId]);
                        return;
                    }
                }
                console.log(["cE", contactElement]);
                messenger.gui.contacts.pushFront([contactElement]);
                contactElement.classList.add("newMessage");
            }
        }

        // fadecolor
        {
            messenger.gui.fadecolor = {};


            messenger.gui.fadecolor.values = {
                accentcolor: [0, 69, 81],
                backgroundcolor: [207, 30, 12]
            };
            messenger.gui.fadecolor.update = function () {
                if (document.querySelector("body.fadecolor")) {
                    messenger.gui.fadecolor.values.accentcolor[0] += 46;
                    //                    messenger.gui.fadecolor.values.backgroundcolor[0] += 1;

                    document.querySelector("body.fadecolor").style.setProperty("--accent", messenger.gui.fadecolor.values["accentcolor"][0] + "deg, " + messenger.gui.fadecolor.values["accentcolor"][1] + "%, " + messenger.gui.fadecolor.values["accentcolor"][2] + "%");
                    document.querySelector("body.fadecolor").style.setProperty("--background", messenger.gui.fadecolor.values["backgroundcolor"][0] + "deg, " + messenger.gui.fadecolor.values["backgroundcolor"][1] + "%, " + messenger.gui.fadecolor.values["backgroundcolor"][2] + "%");
                }
            }


            setInterval(messenger.gui.fadecolor.update, 200);

        }

        // themes
        {
            messenger.gui.theme = {};

            messenger.gui.theme.currentTheme = "dark";

            Object.defineProperty(messenger.gui.theme, 'currentTheme', {
                get: function () {
                    return messenger.gui.theme._currentTheme;
                },
                set: function (value) {
                    sessionStorage["theme"] = value;

                    return messenger.gui.theme._currentTheme = value;
                }
            });

            messenger.gui.theme.change = function (theme) {

                if (messenger.gui.theme.themes[theme]) {
                    for (var i in messenger.gui.theme.themes[theme]) {
                        if (document.body) {
                            document.body.style.setProperty(i, messenger.gui.theme.themes[theme][i]);
                            document.body.onkeydown = messenger.gui.konami.listener;
                        } else {
                            setTimeout(function () {
                                messenger.gui.theme.change(theme)
                            }, 20);
                        }
                    }
                }
                messenger.gui.theme.currentTheme = theme;


            }
            messenger.gui.theme.themes = {
                "green": {
                    "--background": "210deg, 33%, 9%",
                    "--accent": "151deg, 100%, 21%",
                    "--background-image": ""
                },
                "red": {
                    "--background": "26deg, 3%, 15%",
                    "--accent": "5deg, 80%, 57%",
                    "--background-image": ""
                },
                "dark": {
                    "--background": "0deg, 0%, 0%",
                    "--accent": "0deg, 0%, 70%",
                    "--background-image": ""
                },
                "light": {
                    "--background": "0deg, 0%, 100%",
                    "--accent": "0deg, 0%, 0%",
                    "--background-image": ""
                },
                "orange": {
                    "--background": "209deg, 32%, 10%",
                    "--accent": "34deg, 86%, 62%",
                    "--background-image": ""
                },
                "cyan": {
                    "--background": "207deg, 30%, 12%",
                    "--accent": "152deg, 69%, 81%",
                    "--background-image": ""
                },
                "space": {
                    "--background": "210deg, 25%, 16%",
                    "--accent": "199deg, 47%, 37%",
                    "--background-image": "url(https://images.unsplash.com/photo-1508402476522-c77c2fa4479d?ixid=MXwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHw=&ixlib=rb-1.2.1&auto=format&width=1920)",
                }
            }

            if (sessionStorage["theme"]) {
                messenger.gui.theme.change(sessionStorage["theme"]);
            }
        }

    }
    // init

    if (messenger.session.isLoggedIn()) {
        messenger.session.logIn(undefined, undefined, undefined, true);
    } else {
        messenger.gui.toggle();
    }
}
