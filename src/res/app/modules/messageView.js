import {
    MessageElement
} from "./messageElement.js";
import {
    MaterialIconButton
} from "./materialIconButton.js";
import {
    markdown
} from "./markdown.js";
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
        this.rootElement.innerHTML = "";
        this.selectedChat = chatTile;
        this.generateContent();
    }
    deselectChat() {
        this.selectedChat = null;
        this.showDeselected();
        this.rootElement.innerHTML = "";
    }
    showDeselected() {
        this.rootElement.classList.add("deselectedMessageView");
        this.rootElement.classList.remove("emptyMessageView");
        this.rootElement.classList.remove("filledMessageView");
    }
    generateContent() {
        this.createContactInformationBar(this.selectedChat.data.username);
        this.createMessageContainer();
        this.createMessageActionBar();
        this.showEmpty();
        this.screen.kryptonInstance.requestMessages(undefined, this.selectedChat.data.chatId, this.selectedChat.data.chatKey, this.displayMessages.bind(this));
    }
    displayMessages(messageList) {
        // console.log(messageList);
        if (messageList.length == 0) this.showEmpty();
        else {
            this.rootElement.classList.remove("emptyMessageView");
            this.rootElement.classList.remove("deselectedMessageView");
            this.rootElement.classList.add("filledMessageView");
            this.messages = this.messages ?? [];
            // console.log(messageList);
            for (let i of messageList) {
                let msg = new MessageElement(i, this.screen.kryptonInstance);
                this.appendMessage(msg);
            }
            this.sortMessages()
            // scroll to bottom
            this.messageContainer.scrollBy(0, this.messageContainer.scrollHeight - this.messageContainer.clientHeight - this.messageContainer.scrollTop)
        }
    }
    sortMessages() {
        Array.from(this.messageContainer.childNodes)
            .filter(childNode => childNode != childNode.ELEMENT_NODE)
            .sort((a, b) => a.instance.meta.sendTime > b.instance.meta.sendTime)
            .forEach(node => this.messageContainer.appendChild(node));
    }
    appendMessage(msg, onlyMessage) {
        this.messages.push(msg);
        this.messageContainer.appendChild(msg.element);
        this.messageContainer.scrollBy(0, msg.element.clientHeight);
        if (onlyMessage) this.sortMessages()
    }
    createMessageContainer() {
        this.messageContainer = document.createElement("div");
        this.messageContainer.classList.add("messageContainer");

        this.messageContainer.addEventListener("scroll", ((_event) => {
            for (let message of this.messages) {
                if (this.isElementInViewport(message.element)) {
                    this.messageContainer.dataset.firstMessageDate = new Date(message.meta.sendTime * 1000).toLocaleDateString([], {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric"
                    })
                    break;
                }
            }
        }).bind(this));

        this.rootElement.appendChild(this.messageContainer);
    }

    /**
     * 
     * @author https://stackoverflow.com/a/7557433/13001645
     */
    isElementInViewport(el) {
        var rect = el.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) && /* or $(window).height() */
            rect.right <= (window.innerWidth || document.documentElement.clientWidth) /* or $(window).width() */
        );
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
        this.messageContent.placeholder = "Write something..."
        this.messageContent.addEventListener("keypress", ((e) => {
            if (["\n", "Enter"].indexOf(e.key) > -1 && !e.shiftKey) {
                this.hitSend();
                e.preventDefault();
            }
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
                    this.hitSend();
                }).bind(this),

            }]
        }).element);
    }
    hitSend() {
        let value = this.messageContent.value;
        // quote:[messageId, username, text]

        // put text to markdown and remove all escaped characters such as \n --> if it is an empty string afterwards, don't send it
        if (JSON.parse(JSON.stringify(markdown(value).innerText).replace(/\\./g, "")) != "") {
            this.messageContent.value = "";
            this.screen.kryptonInstance.sendMessage({
                message: value,
                quote: this.quotedMessages,
                chatId: this.selectedChat.data.chatId,
                chatKey: this.selectedChat.data.chatKey
            });
        }
    }
}