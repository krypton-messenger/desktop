import {
    MainScreen
} from "./mainScreen.js";
import {
    LoginScreen
} from "./loginScreen.js";
import {
    SignupScreen
} from "./SignupScreen.js";
import {
    MaterialIconButton
} from "./materialIconButton.js";
import {
    Overlay
} from "./overlay.js";
import {
    Input
} from "./input.js";
import {
    Button
} from "./button.js";
import {
    MessageElement
} from "./messageElement.js";

export {
    Krypton
};

class Krypton {
    /**
     * 
     * @param {Object} ipc 
     * @param {Element} targetElmnt 
     */
    constructor(ipc, targetElmnt) {
        this.root = targetElmnt;
        this.generateTitleBar();
        this.generateMainContainer();
        this.ipc = ipc;
        this.downloadingFiles = {};
        window.openLink = (url)=>{
            this.ipc.send("openLink", {url})
        }
    }

    get ipc() {
        return this._ipc;
    }

    /**
     * @param {Object} value
     */
    set ipc(value) {
        this._ipc = value;
        this.ipc.listen(this.handleIpcMessage.bind(this));
        this.ipc.send("startUp");
    }

    get SCREENID() {
        return {
            LOGIN: 0,
            SIGNUP: 1,
            MAIN: 2
        }
    }
    get OVERLAYID() {
        return {
            CREATECHAT: 0,
            SETTINGS: 1,
            STARTMOBILE: 2,
            MESSAGEDETAILS: 3,
            CHATDETAILS: 4,
            POPUP: 5
        }
    }
    set visibleScreen(screen) {
        this.mainContainer.innerHTML = "";
        this.mainContainer.appendChild(screen.getElement())
        this._visibleScreen = screen;
    }
    get visibleScreen() {
        return this._visibleScreen;
    }
    get titleBarActions() {
        return [{
            materialIcon: "minimize",
            events: [{
                type: "click",
                callback: () => {
                    this.ipc.send("minimizeWindow")
                }
            }]
        }, {
            materialIcon: "crop_square",
            events: [{
                type: "click",
                callback: () => {
                    this.ipc.send("toggleMaxinizeWindow")
                }
            }]
        }, {
            materialIcon: "close",
            attr: {
                class: "closeWindow"
            },
            events: [{
                type: "click",
                callback: () => {
                    this.ipc.send("closeWindow")
                }
            }]
        }, ];
    }
    generateTitleBar() {
        this.titleBar = document.createElement("nav");
        for (let i of this.titleBarActions) {
            this.titleBar.appendChild(new MaterialIconButton(i).element);
        }
        this.root.appendChild(this.titleBar);
    }
    generateMainContainer() {
        this.mainContainer = document.createElement("main");
        this.root.appendChild(this.mainContainer);
    }

    /**
     * 
     * @param {Event} _event 
     * @param {Object} message 
     */
    handleIpcMessage(_event, message) {
        console.log(`recieved new ipc:`, message);
        switch (message.command) {
            case "showScreen":
                this.showScreen(message.data.screenID, message.data.data ?? {});
                break;

            case "error":
                this.visibleScreen.showError(message.data.error);
                break;

            case "chatList":
                console.log("recieved chatlist", message.data);
                if (this.waitingForChatList) {
                    this.waitingForChatList(message.data);
                } else{
                    this.visibleScreen.chatList.chatListContent = chatListContent;
                }
                break;

            case "messages":
                // console.log(message);
                this.visibleScreen.messageView.displayMessages(message.data.messages);
                break;

            case "socketMessage":
                console.log("new socket message:", message);
                for (let i of message.data.messages) {
                    let msg = new MessageElement(i, this, true);
                    this.visibleScreen.messageView.appendMessage(msg, true);
                }
                this.requestChatList((chatListContent)=>{
                    this.visibleScreen.chatList.chatListContent = chatListContent;
                });
                break;

            case "downloadFile":
                console.log(this.downloadingFiles, message.data.transactionId);
                let messageContent = this.downloadingFiles[message.data.transactionId].element;
                switch (message.data.status) {
                    case "downloading":
                        console.log(message.data.percentage);
                        messageContent.classList.remove("aborted");
                        messageContent.classList.remove("downloaded");
                        messageContent.classList.add("downloading");
                        messageContent.style.setProperty("--percentage", message.data.percentage);
                        break;
                    case "done":
                        console.log(message.data.fileName, "downloaded");
                        messageContent.classList.remove("downloading");
                        messageContent.classList.remove("aborted");
                        messageContent.classList.add("downloaded");
                        messageContent.style.setProperty("--percentage", 100);
                        break;
                    case "abort":
                        console.log("file download aborted")
                        messageContent.classList.remove("downloading");
                        messageContent.classList.remove("downloaded");
                        messageContent.classList.add("aborted");
                        break;
                }
                break;

            case "selectChat":
                // if(this.visibleScreen)
                for (let chatListSection of this.visibleScreen.chatList.chatListSections) {
                    for (let chatTile of chatListSection.chatTiles) {
                        if (chatTile.data.username == message.data.username) this.visibleScreen.messageView.selectChat(chatTile)
                    }
                }
                break;
                
            default:
                console.log("unrecognized command:", message.command, message.data);
                break;
        }
    }

    requestChatList(callback, query) {
        this.ipc.send("requestChatList", {
            query
        });
        this.waitingForChatList = callback;
    }
    requestMessages(query, chatId, chatKey, offset) {
        this.ipc.send("getMessages", {
            query,
            chatId,
            chatKey,
            offset
        });
    }

    sendMessage({
        message,
        delay,
        quote,
        chatId,
        chatKey
    }) {
        console.log("sending message", {
            message,
            delay,
            quote,
            chatId,
            chatKey
        });
        this.ipc.send("sendMessage", {
            message,
            delay,
            quote,
            chatId,
            chatKey,
            messageType: "text"
        });
    }

    /**
     * 
     * @param {Number} screenID 
     */
    showScreen(screenID, data) {
        console.log(`showing screen ${screenID}, ${JSON.stringify(data)}`);
        switch (screenID) {
            case this.SCREENID.LOGIN:
                this.visibleScreen = new LoginScreen(this, data);
                break;
            case this.SCREENID.SIGNUP:
                this.visibleScreen = new SignupScreen(this, data);
                break;
            case this.SCREENID.MAIN:
                this.visibleScreen = new MainScreen(this, data);
                console.log(this, this.visibleScreen);
                break;
            default:
                console.log(`unknown screen with id ${screenID}`);
                break;
        }
    }
    showOverlay(overlayID, options) {
        let overlay = new Overlay(this);

        if (options.title) {
            let title = document.createElement("span");
            title.classList.add("overlayTitle");
            title.appendChild(document.createTextNode(options.title));
            overlay.element.appendChild(title);
        }

        switch (overlayID) {
            case this.OVERLAYID.CREATECHAT:
                let usernameInput = new Input({
                    name: "username",
                    type: "text",
                    placeholder: "enter username",
                    events: []
                });
                overlay.element.appendChild(usernameInput.element);

                let createChatButton = new Button({
                    type: "button",
                    label: "Create Chat",
                    events: [{
                        type: "click",
                        callback: ((_e) => {
                            if (usernameInput.element.value == "") usernameInput.forbiddenValue("Username not allowed");
                            else {
                                this.ipc.send("createChat", {
                                    username: usernameInput.element.value
                                });
                                overlay.destroy();
                            }
                        }).bind(this)
                    }]
                });
                overlay.element.appendChild(createChatButton.element);

                let cancelButton = new Button({
                    type: "button",
                    label: "Cancel",
                    events: [{
                        type: "click",
                        callback: ((_e) => {
                            overlay.destroy();
                        }).bind(this)
                    }]
                });
                overlay.element.appendChild(cancelButton.element);

                overlay.show();
                break;
            case this.OVERLAYID.SETTINGS:
            case this.OVERLAYID.STARTMOBILE:
            case this.OVERLAYID.MESSAGEDETAILS:
            case this.OVERLAYID.CHATDETAILS:
            case this.OVERLAYID.POPUP:
                break;
        }
    }
    toggleTheme() {
        document.querySelector(":root").classList.toggle("light");
    }
    downloadFile(fileParts, fileKey, iv, fileName, transactionId) {
        this.ipc.send("downloadFile", {
            fileParts,
            fileKey,
            iv,
            fileName,
            transactionId
        });
    }
}