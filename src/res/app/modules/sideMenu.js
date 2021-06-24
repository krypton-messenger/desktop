import {
    LabeledMaterialIconButton
} from "./labeledMaterialIconButton.js";
export {
    SideMenu
};
class SideMenu {
    constructor(screen, options) {
        this.screen = screen;
        this.element = document.createElement("div");
        this.element.classList.add("sideMenu");
        this.focuser = document.createElement("div");
        this.focuser.classList.add("sideMenuFocuser");
        this.focuser.addEventListener("click", this.close.bind(this));
        this.element.appendChild(this.focuser);
        this.screen.rootElement.appendChild(this.element);
        this.element.instance = this;
        this.options = []
        for (let i of options) {
            let button = new LabeledMaterialIconButton(i);;
            this.options.push(button)
            this.element.appendChild(button.element);
        }
    }
    open() {
        this.element.classList.add("openSideMenu");
    }
    close() {
        this.element.classList.remove("openSideMenu");
    }

}