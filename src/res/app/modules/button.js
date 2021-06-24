export {Button}

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