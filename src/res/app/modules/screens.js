import {
    Input,
    Button
} from "./elements.js";
import {
    ChatList,
    MessageView,
    SideMenu
} from "./chatElements.js";
export {
    SignupScreen,
    LoginScreen,
    MainScreen
};

class WindowScreen {
    constructor(kryptonInstance) {
        this.kryptonInstance = kryptonInstance;
        this.rootElement = document.createElement("div");
        this.rootElement.instance = this;
        this.generateScreen();
    }
    getElement() {
        return this.rootElement;
    }
    parseForm(form) {
        return Object.keys(form.elements)
            .reduce((obj, field) => {
                if (isNaN(field)) {
                    obj[field] = form.elements[field].value;
                }
                return obj;
            }, {});
    }
}
class FormScreen extends WindowScreen {
    get formTitle() {
        return "Form";
    }
    get rootClass() {
        return "formScreen";
    }
    get inputFields() {
        return [];
    }
    get buttons() {
        return [];
    }
    generateScreen() {
        this.rootElement.classList.add(...this.rootClass.split(" "));

        this.mainForm = document.createElement("form");
        this.mainForm.onsubmit = ((event) => {
            event.preventDefault();
            this.submit();
        }).bind(this);
        this.rootElement.appendChild(this.mainForm);

        let formTitle = document.createElement("h1");
        formTitle.appendChild(document.createTextNode(this.formTitle));
        this.mainForm.appendChild(formTitle);

        for (let i of this.inputFields) {
            this.mainForm.appendChild(new Input(i).element);
        }

        for (let i of this.buttons) {
            this.mainForm.appendChild(new Button(i).element);

        }

        this.errorElement = document.createElement("p");
        this.errorElement.classList.add("errorElement");
        this.mainForm.appendChild(this.errorElement);
    }
    showError(errorMessage) {
        this.errorElement.innerHTML = "";
        this.errorElement.appendChild(document.createTextNode(errorMessage));
    }
    submit(_event) {
        console.log(this.parseForm(this.mainForm))
    }
}

class SignupScreen extends FormScreen {
    get formTitle() {
        return "Sign up";
    }
    get rootClass() {
        return "formScreen signupScreen";
    }
    get inputFields() {
        return [{
                name: "serverUrl",
                type: "text",
                placeholder: "server"
            },
            {
                name: "username",
                type: "text",
                placeholder: "username"
            }, {
                name: "password",
                type: "password",
                placeholder: "password"
            }, {
                name: "licenceKey",
                type: "text",
                placeholder: "licence key"
            }
        ];
    }
    get buttons() {
        return [{
            type: "submit",
            label: "Sign up"
        }, {
            type: "button",
            label: "Log in",
            events: [{
                type: "click",
                callback: (() => {
                    this.kryptonInstance.showScreen(this.kryptonInstance.SCREENID.LOGIN)
                }).bind(this)
            }]
        }];
    }
    submit(_event) {
        this.kryptonInstance.ipc.send("signUp", this.parseForm(this.mainForm));
    }
}

class LoginScreen extends FormScreen {
    get formTitle() {
        return "Login";
    }
    get rootClass() {
        return "formScreen loginScreen";
    }
    get inputFields() {
        return [{
                name: "serverUrl",
                type: "text",
                placeholder: "server"
            },
            {
                name: "username",
                type: "text",
                placeholder: "username"
            }, {
                name: "password",
                type: "password",
                placeholder: "password"
            }
        ];
    }
    get buttons() {
        return [{
            type: "submit",
            label: "Log in"
        }, {
            type: "button",
            label: "Sign up",
            events: [{
                type: "click",
                callback: (() => {
                    this.kryptonInstance.showScreen(this.kryptonInstance.SCREENID.SIGNUP)
                }).bind(this)
            }]
        }];
    }
    submit(_event) {
        this.kryptonInstance.ipc.send("logIn", this.parseForm(this.mainForm));
    }
}
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