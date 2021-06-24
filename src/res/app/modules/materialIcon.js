export {
    MaterialIcon
};
class MaterialIcon {
    constructor(materialIcon) {
        this.materialIcon = materialIcon;
        this.element = document.createElement("span");
        this.element.appendChild(document.createTextNode(materialIcon));
        this.element.classList.add("material-icons");
    }
}