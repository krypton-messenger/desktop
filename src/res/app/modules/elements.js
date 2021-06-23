export {
    Input,
    Button,
    MaterialIconButton
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
        this.element.setAttribute("label", label);
        this.element.appendChild(document.createTextNode(label));
        for (let event of events ?? []) {
            this.element.addEventListener(event.type, event.callback);
        }
        for (let attribute of Object.keys(attr ?? {})) {
            this.element.setAttribute(attribute, attr[attribute]);
        }
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
            label: materialIcon,
            events,
            attr
        }).element;
        this.element.classList.add("material-icons");
    }
}