import {
    ChatTile
} from "./chatTile.js";
export {
    ChatListSection
};
class ChatListSection {
    constructor(chats, title, chatListInstance, overrideCallback) {
        this.overrideCallback = overrideCallback;
        this.chatListInstance = chatListInstance;

        this.element = document.createElement("div");
        this.element.classList.add("chatListSection");
        this.element.instance = this;

        this.title = title;
        this.chats = chats;
    }

    set title(value) {
        this._title = value;
        this.titleElement = document.createElement("div");
        this.titleElement.classList.add("chatListSectionTitle");
        this.titleElement.appendChild(document.createTextNode(value));
        this.element.appendChild(this.titleElement);
    }

    get title() {
        return this._title;
    }
    /**
     * @param {boolean} val
     */
    set empty(val) {
        if (val) {
            this.element.classList.add("emptyChatListSection");
            if (this.element.parentElement) this.element.parentElement.removeChild(this.element);
        }
        this._empty = val;
    }
    get empty() {
        return this._empty

    }
    set chats(value) {
        console.info("creating chatlistsection", value);
        this._chats = value;
        this.chatTiles = [];
        this.chatTileContainer = document.createElement("div");
        this.chatTileContainer.classList.add("chatListSectionContainer", "chatTileContainer");
        if (value.length == 0) this.empty = true;
        for (let i of value) {
            console.log("generating chattile", i)
            let chatTile = new ChatTile(i, this);
            this.chatTileContainer.appendChild(chatTile.element);
            this.chatTiles.push(chatTile);
        }
        this.element.appendChild(this.chatTileContainer);
    }

    get chats() {
        return this._chats;
    }
}