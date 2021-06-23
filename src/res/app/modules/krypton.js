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
        // <button class="material-icons" onclick="minimizeWindow()">minimize</button>
        // <button class="material-icons" onclick="toggleMaximizeWindow()">crop_square</button>
        // <button class="material-icons" id="closeWindow" onclick="closeWindow()">close</button>

        this.titleBar = document.createElement("nav");
        console.log(this.titleBarActions);
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
        switch (message.action) {
            case "showScreen":
                this.showScreen(message.data.screenID);
                break;
        }
    }

    /**
     * 
     * @param {Number} screenID 
     */
    showScreen(screenID) {
        switch (screenID) {
            case this.SCREENID.LOGIN:
                this.visibleScreen = new LoginScreen(this);
                break;
            case this.SCREENID.SIGNUP:
                this.visibleScreen = new SignupScreen(this);
                break;
            case this.SCREENID.MAIN:
                this.visibleScreen = new MainScreen(this);
                break;
        }
    }
}