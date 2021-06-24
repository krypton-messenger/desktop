export {
    Input
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