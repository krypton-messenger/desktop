import { MaterialIcon } from "./materialIcon.js";

export {
    Input
};
class Input {
    constructor({
        name,
        type,
        placeholder,
        events,
        attributes
    }) {
        this.element = document.createElement("input");
        this.element.setAttribute("name", name);
        this.element.setAttribute("type", type ?? "text");
        if (placeholder) this.element.setAttribute("placeholder", placeholder);
        for (let event of events ?? []) {
            this.element.addEventListener(event.type, event.callback);
        }
        for(let attributeName in attributes ?? {}){
            this.element.setAttribute(attributeName, attributes[attributeName]);
        }
    }

    forbiddenValue(err){
        this.element.classList.add("forbidden");
        if(this.errorMessage){
            this.errorMessage.innerHTML="";
        }else{
            this.errorMessage  = document.createElement("span");
            this.errorMessage.classList.add("errorMessage");
        }
        this.errorMessage.appendChild(new MaterialIcon("error").element);
        this.errorMessage.appendChild(document.createTextNode(err));
        this.element.parentElement.insertBefore(this.errorMessage, this.element.nextSibling);
    }
    repair(){
        this.element.classList.remove("forbidden");
        this.errorMessage.outerHTML="";
    }
}