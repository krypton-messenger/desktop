export {
    Input,
    Button,
    MaterialIcon,
    MaterialIconButton,
    LabeledMaterialIconButton
};
class Input {
    constructor({
        name,
        type,
        placeholder,
        events
    }) {
        this.element = document.createElement("input");
        this.element.setAttribute("name", name);
        this.element.setAttribute("type", type ?? "text");
        if (placeholder) this.element.setAttribute("placeholder", placeholder);
        for (let event of events ?? []) {
            this.element.addEventListener(event.type, event.callback);
        }
    }
}

class Button {
    constructor({
        type,
        label,
        events,
        attr
    }) {
        this.element = document.createElement("button");
        this.element.setAttribute("type", type);
        if (typeof (label) == "string") {
            this.element.appendChild(document.createTextNode(label));
            this.element.setAttribute("label", label);
        } else {
            this.element.appendChild(label);
            this.element.setAttribute("label", label.innerHTML);
        }

        // blur after click
        this.element.addEventListener("click", (() => {
            this.element.blur()
        }).bind(this));
        for (let event of events ?? []) {
            this.element.addEventListener(event.type, event.callback);
        }
        for (let attribute of Object.keys(attr ?? {})) {
            this.element.setAttribute(attribute, attr[attribute]);
        }
    }
}
class MaterialIcon {
    constructor(materialIcon) {
        this.materialIcon = materialIcon;
        this.element = document.createElement("span");
        this.element.appendChild(document.createTextNode(materialIcon));
        this.element.classList.add("material-icons");
    }
}
class MaterialIconButton {
    constructor({
        materialIcon,
        events,
        attr
    }) {
        this.element = new Button({
            type: "button",
            label: new MaterialIcon(materialIcon).element,
            events,
            attr
        }).element;
        this.element.classList.add("materialIconButton");
    }
}
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

        for (let event of events ?? []) {
            this.element.addEventListener(event.type, event.callback);
        }

        for (let attribute of Object.keys(attr ?? {})) {
            this.element.setAttribute(attribute, attr[attribute]);
        }
    }
}