import {
    Button
} from "./button.js";
import {
    MaterialIcon
} from "./materialIcon.js";
export {
    MaterialIconButton
};
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