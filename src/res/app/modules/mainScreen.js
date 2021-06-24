import {
    WindowScreen
} from "./windowScreen.js";
import {
    MessageView
} from "./messageView.js";
import {
    ChatList
} from "./chatList.js";
import {
    SideMenu
} from "./sideMenu.js";
export {
    MainScreen
};

class MainScreen extends WindowScreen {
    generateScreen() {
        this.rootElement.classList.add("mainScreen");
        this.rootElement.instance = this;
        this.sideMenu = new SideMenu(this, [{
            materialIcon: "create",
            label: "New Chat",
            events: [{
                type: "click",
                callback: (() => {}).bind(this)
            }]
        }, {
            materialIcon: "group",
            label: "Create Group",
            events: [{
                type: "click",
                callback: (() => {}).bind(this)
            }]
        }, {
            materialIcon: "qr_code",
            label: "Open on Mobile",
            events: [{
                type: "click",
                callback: (() => {
                    this.kryptonInstance.ipc.send("startRemoteServer")
                }).bind(this)
            }]
        }, {
            materialIcon: "settings",
            label: "Settings",
            events: [{
                type: "click",
                callback: (() => {}).bind(this)
            }]
        }, {
            materialIcon: "logout",
            label: "Log out",
            events: [{
                type: "click",
                callback: (() => {
                    this.kryptonInstance.ipc.send("logOut")
                }).bind(this)
            }]
        }, {
            materialIcon: "code",
            label: "Developer Options",
            events: [{
                type: "click",
                callback: (() => {
                    this.kryptonInstance.ipc.send("startDebug")
                }).bind(this)
            }]
        }]);
        this.chatList = new ChatList(this);
        this.messageView = new MessageView(this);
    }
    showError(errorMessage) {
        console.error(errorMessage);
    }
    openMenu() {
        this.sideMenu.open();
    }
}