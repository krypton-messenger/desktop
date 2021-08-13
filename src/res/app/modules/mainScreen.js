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
import {
    regexCollection
} from "./regexCollection.js";
import {
    MaterialIcon
} from "./materialIcon.js";
export {
    MainScreen
};

class MainScreen extends WindowScreen {
    createHeader(data) {
        // <div class="sideMenuHeader">
        //     <span class="server">
        //         kr.ttschnz.ch/
        //         <span class="username">@test</span>
        //     </span>
        //     <span class="material-icons" title="your connection is secure">https</span>
        // </div>
        this.sideMenuHeader = document.createElement("div");
        try {
            var regexMatch = regexCollection.urls.exec(data.server);
            var {
                hostname,
                scheme
            } = (regexMatch).groups;
        } catch (e) {
            console.log(data, regexCollection.urls, regexMatch);
        }
        let serverSpan = document.createElement("span");
        serverSpan.classList.add("server");
        serverSpan.appendChild(document.createTextNode(`${hostname}/`));
        this.sideMenuHeader.appendChild(serverSpan);

        let usernameSpan = document.createElement("span");
        usernameSpan.classList.add("username");
        usernameSpan.appendChild(document.createTextNode(`@${data.username}`));
        serverSpan.appendChild(usernameSpan);

        let connectionSecurity = new MaterialIcon(scheme == "https://" ? "https" : "no_encryption");
        connectionSecurity.element.setAttribute("title", scheme == "https://" ? "Your connection to the server is secure" : "Your connection to the server is not secure")
        connectionSecurity.element.classList.add(scheme == "https://" ? "connectionSecure" : "connectionInsecure")
        this.sideMenuHeader.appendChild(connectionSecurity.element);
    }
    generateScreen() {
        this.rootElement.classList.add("mainScreen");
        this.rootElement.instance = this;

        this.createHeader(this.data);

        this.sideMenu = new SideMenu(this, {
            header: this.sideMenuHeader,
            items: [{
                materialIcon: "create",
                label: "New Chat",
                events: [{
                    type: "click",
                    callback: (() => {
                        this.kryptonInstance.showOverlay(this.kryptonInstance.OVERLAYID.CREATECHAT, {
                            title: "New Chat"
                        });
                    }).bind(this)
                }]
            }, {
                materialIcon: "group",
                label: "Create Group",
                // events: [{
                //     type: "click",
                //     callback: (() => {}).bind(this)
                // }]
            }, {
                materialIcon: "qr_code",
                label: "Open on Mobile (beta)",
                events: [{
                    type: "click",
                    callback: (() => {
                        this.kryptonInstance.ipc.send("startRemoteServer")
                    }).bind(this)
                }]
            }, {
                materialIcon: "settings",
                label: "Settings",
                // events: [{
                //     type: "click",
                //     callback: (() => {}).bind(this)
                // }]
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
                materialIcon: "brightness_medium",
                label: "Toggle Theme",
                events: [{
                    type: "click",
                    callback: (() => {
                        this.kryptonInstance.toggleTheme()
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
            }]
        });
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