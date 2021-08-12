export {
    Overlay
};
class Overlay {
    constructor(kryptonInstance) {
        this.kryptonInstance = kryptonInstance;
        this.rootContainer = document.createElement("div");
        this.rootContainer.classList.add("overlayContainer");

        this.element = document.createElement("div");
        this.element.classList.add("overlay");
        this.rootContainer.appendChild(this.element);

        this.overlayFocuser = document.createElement("div");
        this.overlayFocuser.classList.add("overlayFocuser");
        this.overlayFocuser.addEventListener("click", this.destroy.bind(this));
        this.rootContainer.appendChild(this.overlayFocuser);
    }
    show() {
        this.kryptonInstance.visibleScreen.rootElement.appendChild(this.rootContainer);
        this.rootContainer.getBoundingClientRect();
        this.rootContainer.classList.add("in");
    }
    hide() {
        this.rootContainer.classList.remove("in");
    }
    destroy() {
        this.rootContainer.classList.remove("in");
        setTimeout((() => {
            this.kryptonInstance.visibleScreen.rootElement.removeChild(this.rootContainer);
        }).bind(this), 200);
    }
}