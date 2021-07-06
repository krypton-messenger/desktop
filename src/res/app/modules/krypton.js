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
                this.showScreen(message.data.screenID);
                break;
            case "error":
                this.visibleScreen.showError(message.data.error);
                break;
            case "chatList":
                // only show if request not aborted
                if (this.waitingForChatList) {
                    console.log("recieved chatlist", message.data.chatList)
                    this.waitingForChatList(message.data.chatList);
                    this.waitingForChatList = false;
                } else console.log("chatlist recieved but not displayed, callback was removed");
                break;
            case "messages":
                if (this.waitingForMessages) {
                    console.log(message);
                    this.waitingForMessages(message.data.messages);
                    this.waitingForMessages = false;
                } else console.log("messages recieved but not displayed, callback was removed");
                break;
            case "socketMessage":
                console.log("new socket message:", message);
                break;
            case "downloadFile":
                console.log(this.downloadingFiles,message.data.transactionId);
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
            default:
                console.log("unrecognized command:", command, message.data);
                break;
        }
    }

    requestChatList(callback, query) {
        this.ipc.send("requestChatList", {
            query
        });
        this.waitingForChatList = callback;
    }
    requestMessages(query, chatId, chatKey, callback, offset) {
        this.ipc.send("getMessages", {
            query,
            chatId,
            chatKey,
            offset
        });
        this.waitingForMessages = callback;
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
    showScreen(screenID) {
        console.log(`showing screen ${screenID}`);
        switch (screenID) {
            case this.SCREENID.LOGIN:
                this.visibleScreen = new LoginScreen(this);
                break;
            case this.SCREENID.SIGNUP:
                this.visibleScreen = new SignupScreen(this);
                break;
            case this.SCREENID.MAIN:
                this.visibleScreen = new MainScreen(this);
                console.log(this, this.visibleScreen);
                break;
            default:
                console.log(`unknown screen with id ${screenID}`);
                break;
        }
    }
    showOverlay(overlayID) {
        switch (overlayID) {
            case "":
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