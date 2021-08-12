import {
    LabeledMaterialIconButton
} from "./labeledMaterialIconButton.js";
export {
    SideMenu
};
class SideMenu {
    constructor(screen, {
        header,
        items
    }) {
        this.screen = screen;
        this.element = document.createElement("div");
        this.element.classList.add("sideMenu");
        this.focuser = document.createElement("div");
        this.focuser.classList.add("sideMenuFocuser");
        this.focuser.addEventListener("click", this.close.bind(this));
        this.element.appendChild(this.focuser);
        this.screen.rootElement.appendChild(this.element);
        this.element.instance = this;
        if (header) {
            this.header = header;
            this.header.classList.add("sideMenuHeader");
            this.element.appendChild(this.header);
        }
        this.items = []
        for (let i of items) {
            let button = new LabeledMaterialIconButton(i);;
            this.items.push(button)
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