import {
    MainScreen,
    LoginScreen,
    SignupScreen
} from "./screens.js";
import {
    MaterialIconButton
} from "./elements.js"
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
                    this.waitingForChatList(message.data.chatList);
                    this.waitingForChatList = false;
                } else console.log("chatlist recieved but not displayed, callback was removed");
                break;
        }
    }

    requestChatList(callback, query) {
        this.ipc.send("requestChatList", {
            query
        });
        this.waitingForChatList = callback;
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
}