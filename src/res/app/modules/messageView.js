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
    get scrollBottomTolerance() {
        return 70;
    }
    get scrollBottom() {
        return this.messageContainer.scrollHeight - this.messageContainer.clientHeight - this.messageContainer.scrollTop;
    }
    showEmpty() {
        this.rootElement.classList.add("emptyMessageView");
        this.rootElement.classList.remove("deselectedMessageView");
        this.rootElement.classList.remove("filledMessageView");
    }
    selectChat(chatTile, dontRequestMessages) {
        if (chatTile) {
            this.deselectChat();
            this.screen.sideMenu.close();
            this.rootElement.innerHTML = "";
            this.selectedChat = chatTile;
            if(!dontRequestMessages) this.generateContent();
        }
    }
    deselectChat() {
        this.messages = [];
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
        this.screen.kryptonInstance.requestMessages(undefined, this.selectedChat.data.chatId, this.selectedChat.data.chatKey);
    }
    displayMessages(messageList, isPreflight) {
        console.log(messageList);
        if (messageList.length == 0 && isPreflight) this.showEmpty();
        else {
            if (!this.selectedChat && isPreflight) this.selectChat(this.screen.chatList.chatListSections.flatMap(i => i.chatTiles).filter(j => j.data.chatId == messageList[0].chatId)[0], true) // no chat was selected but the backend was ordered to give messages => select chat
            // Boolean(this.selectedChat) should now be true if it is a preflight initiated by remote
            if (this.selectedChat) {
                this.rootElement.classList.remove("emptyMessageView");
                this.rootElement.classList.remove("deselectedMessageView");
                this.rootElement.classList.add("filledMessageView");
                this.messages = this.messages ?? [];
                // console.log(messageList);
                for (let i of messageList) {
                    if (this.selectedChat.data.chatId == i.chatId) {
                        let msg = new MessageElement(i, this.screen.kryptonInstance);
                        this.appendMessage(msg);
                    }
                }
                this.sortMessages();
                this.scrollToBottom()
            }
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
        if (this.scrollBottomTolerance >= this.scrollBottom) {
            this.scrollToBottom();
        }
        msg.fadeIn();
        if (onlyMessage) this.sortMessages();
    }
    scrollToBottom() {
        this.messageContainer.scrollBy(0, this.messageContainer.scrollHeight);
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
            this.rootElement.contains(el) &&
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
                callback: (() => {
                    this.screen.kryptonInstance.ipc.send("sendFile", {
                        chatId: this.selectedChat.data.chatId
                    });
                }).bind(this)
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