export {
    WindowScreen
};
class WindowScreen {
    constructor(kryptonInstance, data) {
        this.kryptonInstance = kryptonInstance;
        this.rootElement = document.createElement("div");
        this.rootElement.instance = this;
        console.log(data);
        this.data = data;
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