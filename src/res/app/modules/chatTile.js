export {
    ChatTile
};
import {appropriateTime} from "./appropriateTime.js";
import {
    markdown
} from "./markdown.js";
class ChatTile {
    constructor(data, chatListSectionInstance) {
        this.data = data;

        this.chatListSectionInstance = chatListSectionInstance;

        this.element = document.createElement("div");
        this.element.classList.add("chatTile");
        this.element.addEventListener("click", (() => {
            this.chatListSectionInstance.chatListInstance.screen.messageView.selectChat(this);
        }).bind(this));
        this.element.instance = this;

        if (typeof (this.data.picture) !== "undefined") {
            this.element.classList.add("hasPicture");

            this.picture = document.createElement("div");
            this.picture.classList.add("chatTilePicture");
            if (this.checkDataURI(this.data.picture)) {
                this.picture.style.setProperty("--pictureSrc", `url(${this.data.picture})`);
            } else {
                this.picture.classList.add("failedPicture");
            }
            this.element.appendChild(this.picture);
        }

        this.title = document.createElement("span");
        this.title.classList.add("chatTileTitle");
        this.title.appendChild(document.createTextNode(this.data.username));
        this.title.setAttribute("title", this.title.innerText);
        this.element.appendChild(this.title);

        this.subtitle = document.createElement("span");
        this.subtitle.classList.add("chatTileSubtitle");
        this.subtitle.appendChild(markdown(JSON.parse(this.data.content).value));
        this.subtitle.setAttribute("title", this.subtitle.innerText);
        this.element.appendChild(this.subtitle);

        this.date = document.createElement("span");
        this.date.classList.add("chatTileTime");
        this.date.appendChild(document.createTextNode(appropriateTime(this.data.timestamp)));
        this.date.setAttribute("title", new Date(this.data.timestamp * 1000).toLocaleString([], {
            month: "2-digit",
            day: "2-digit",
            year: "numeric",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        }))
        this.element.appendChild(this.date);
    }
    checkDataURI(dataURI) {
        return /^\s*data:([a-z]+\/[a-z]+(;[a-z\-]+\=[a-z\-]+)?)?(;base64)?,[a-z0-9\!\$\&\'\,\(\)\*\+\,\;\=\-\.\_\~\:\@\/\?\%\s]*\s*$/i.test(dataURI)
    }
}