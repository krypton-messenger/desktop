export {
    WindowScreen
};
class WindowScreen {
    constructor(kryptonInstance) {
        this.kryptonInstance = kryptonInstance;
        this.rootElement = document.createElement("div");
        this.rootElement.instance = this;
        this.generateScreen();
    }
    getElement() {
        return this.rootElement;
    }
    parseForm(form) {
        return Object.keys(form.elements)
            .reduce((obj, field) => {
                if (isNaN(field)) {
                    obj[field] = form.elements[field].value;
                }
                return obj;
            }, {});
    }
}