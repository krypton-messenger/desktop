import { Input } from "./input.js";
import { Button } from "./button.js";
import { WindowScreen } from "./windowScreen.js";
export {
    FormScreen
};

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