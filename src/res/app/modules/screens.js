import {
    Input,
    Button
} from "./elements.js";

export {
    SignupScreen,
    LoginScreen,
    MainScreen
};

class windowScreen {
    constructor(kryptonInstance) {
        this.kryptonInstance = kryptonInstance;
        this.rootElement = document.createElement("div");
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
class FormScreen extends windowScreen {
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
        this.mainForm.onsubmit = ((event)=>{
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
        this.mainForm.appendChild(this.errorElement);
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
class MainScreen extends windowScreen {

}