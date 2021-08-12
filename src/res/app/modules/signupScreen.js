import {
    FormScreen
} from "./formScreen.js";

export{
    SignupScreen
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
                placeholder: "server",
                attributes: {
                    value: this.data.servername ?? ""
                }
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
                    this.kryptonInstance.showScreen(this.kryptonInstance.SCREENID.LOGIN, this.data)
                }).bind(this)
            }]
        }];
    }
    submit(_event) {
        this.kryptonInstance.ipc.send("signUp", this.parseForm(this.mainForm));
    }
}