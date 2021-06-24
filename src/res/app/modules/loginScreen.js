import {
    FormScreen
} from "./formScreen.js";

export {
    LoginScreen
};
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