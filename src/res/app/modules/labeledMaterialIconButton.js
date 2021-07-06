import {
    MaterialIcon
} from "./materialIcon.js";
export {
    LabeledMaterialIconButton
};
class LabeledMaterialIconButton {
    constructor({
        materialIcon,
        label,
        events,
        attr
    }) {
        this.element = document.createElement("button");
        this.element.classList.add("labbeledButton");

        this.icon = new MaterialIcon(materialIcon).element;
        this.icon.classList.add("labbeledButtonIcon");
        this.element.appendChild(this.icon);

        this.label = document.createElement("span");
        this.label.appendChild(document.createTextNode(label));
        this.label.classList.add("labbeledButtonLabel");
        this.element.appendChild(this.label);
        if (!events || events.length == 0) this.element.setAttribute("disabled", true);
        for (let event of events ?? []) {
            this.element.addEventListener(event.type, event.callback);
        }

        for (let attribute of Object.keys(attr ?? {})) {
            this.element.setAttribute(attribute, attr[attribute]);
        }
    }
}