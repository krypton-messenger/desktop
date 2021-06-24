import {
    MessageElement
} from "./messageElement.js";
import {
    MaterialIconButton
} from "./materialIconButton.js";
export {
    MessageView
};
class MessageView {
    constructor(screen) {
        this.screen = screen;
        this.rootElement = document.createElement("div");
        this.rootElement.classList.add("messageView");
        this.rootElement.instance = this;
        this.screen.rootElement.appendChild(this.rootElement);
        this.showDeselected();
    }
    showEmpty() {
        this.rootElement.classList.add("emptyMessageView");
        this.rootElement.classList.remove("deselectedMessageView");
        this.rootElement.classList.remove("filledMessageView");
    }
    selectChat(chatTile) {
        this.selectedChat = chatTile;
        this.generateContent(this.selectedChat.data.title);
    }
    deselectChat() {
        this.selectedChat = null;
        this.rootElement.innerHTML = "";
        this.showDeselected();
    }
    showDeselected() {
        this.rootElement.classList.add("deselectedMessageView");
        this.rootElement.classList.remove("emptyMessageView");
        this.rootElement.classList.remove("filledMessageView");
    }
    generateContent(title) {
        this.createContactInformationBar(title);
        this.createMessageActionBar();
        this.showEmpty();
    }
    displayMessages(messageList) {
        if (messageList.length == 0) this.showEmpty();
        else {
            this.rootElement.classList.remove("emptyMessageView");
            this.rootElement.classList.remove("deselectedMessageView");
            this.rootElement.classList.add("filledMessageView");
            this.messages = this.messages ?? []
            for (let i of messageList) {
                let msg = new MessageElement(i);
                this.messages.push(msg);
                this.messageContainer.appendChild(msg.element);
            }
        }
    }
    createContactInformationBar(title) {
        this.contactInformationBar = document.createElement("div");
        this.contactInformationBar.classList.add("contactInformationBar");
        this.rootElement.appendChild(this.contactInformationBar);

        this.contactInformationBar.appendChild(new MaterialIconButton({
            materialIcon: "arrow_back",
            events: [{
                type: "click",
                callback: (() => {
                    this.deselectChat();
                }).bind(this)
            }]
        }).element);
        this.chatTitle = document.createElement("div");
        this.chatTitle.classList.add("chatTitle");
        this.chatTitle.appendChild(document.createTextNode(title));
        this.contactInformationBar.appendChild(this.chatTitle)

        this.contactInformationBar.appendChild(new MaterialIconButton({
            materialIcon: "call",
            events: [{
                type: "click",
                callback: (() => {}).bind(this)
            }],
            attr: {
                disabled: true
            }
        }).element);

        this.contactInformationBar.appendChild(new MaterialIconButton({
            materialIcon: "more_vert",
            events: [{
                type: "click",
                callback: (() => {}).bind(this),

            }],
            attr: {
                disabled: true
            }
        }).element);
    }
    createMessageActionBar() {
        this.messageActionBar = document.createElement("div");
        this.messageActionBar.classList.add("messageActionBar");
        this.rootElement.appendChild(this.messageActionBar);

        this.messageActionBar.appendChild(new MaterialIconButton({
            materialIcon: "attach_file",
            events: [{
                type: "click",
                callback: (() => {}).bind(this)
            }]
        }).element);

        this.messageContent = document.createElement("textarea");
        this.messageContent.addEventListener("keypress", ((e) => {
            console.log(e)
        }).bind(this));
        this.messageActionBar.appendChild(this.messageContent);

        this.messageActionBar.appendChild(new MaterialIconButton({
            materialIcon: "schedule",
            events: [{
                type: "click",
                callback: (() => {}).bind(this),

            }],
            attr: {
                disabled: true
            }
        }).element);

        this.messageActionBar.appendChild(new MaterialIconButton({
            materialIcon: "send",
            events: [{
                type: "click",
                callback: (() => {
                    console.log(this.messageContent.value)
                }).bind(this),

            }]
        }).element);
    }
}