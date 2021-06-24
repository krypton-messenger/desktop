import {
    MaterialIconButton,
    Input,
    LabeledMaterialIconButton
} from "./elements.js";

import {
    MessageElement
} from "./messageElement.js"
import "../../../../node_modules/dayjs/dayjs.min.js";
import "../../../../node_modules/dayjs/plugin/localizedFormat.js";
dayjs.extend(dayjs_plugin_localizedFormat);

export {
    ChatList,
    MessageView,
    SideMenu
}
class ChatList {
    constructor(screen) {
        this.screen = screen;

        this.rootElement = document.createElement("div");
        this.rootElement.classList.add("chatListContainer");
        this.rootElement.instance = this;
        this.screen.rootElement.appendChild(this.rootElement);
        this.addMenuOpener();
        this.addSearchBar();
        this.addChatList();
    }
    /**
     * @param {Array} value {Chats:[{title:"Chat with Admin", subtitle:"good morning, i was thinking we could get a beer?", timestamp: 1605483215, picture:"data:"},{...}] }
     */
    set chatListContent(value) {
        this.parseChatList(value);
        this._chatListContent = value;
    }
    get chatListContent() {
        return this._chatListContent;
    }
    addMenuOpener() {
        this.menuOpener = new MaterialIconButton({
            materialIcon: "menu",
            events: [{
                type: "click",
                callback: (() => {
                    this.screen.openMenu()
                }).bind(this)
            }]
        });
        this.rootElement.appendChild(this.menuOpener.element);
    }
    openSearchBar() {
        this.searchBarContainer.classList.add("searchbarVisible");
        this.searchBar.element.focus();
    }
    addSearchBar() {
        this.searchBarContainer = document.createElement("div");
        this.searchBarContainer.classList.add("searchBarContainer");
        this.rootElement.appendChild(this.searchBarContainer);

        this.searchBar = new Input({
            name: "searchBar",
            type: "text",
            placeholder: "Search",
            events: [{
                    type: "keydown",
                    callback: ((e) => {
                        console.log(`keypress on searchbar:`, e);
                        this.search(this.searchBar.element.value);
                    }).bind(this)
                },
                {
                    type: "blur",
                    callback: ((_e) => {
                        if (this.searchBar.element.value == "") {
                            this.searchBarContainer.classList.remove("searchbarVisible");
                        }
                    }).bind(this)
                }, {
                    type: "focus",
                    callback: this.openSearchBar.bind(this)
                }
            ]
        });
        this.searchBarContainer.appendChild(this.searchBar.element);

        this.searchBarOpener = new MaterialIconButton({
            materialIcon: "search",
            events: [{
                type: "click",
                callback: this.openSearchBar.bind(this)
            }],
            attr: {
                class: "searchBarOpener"
            }
        });
        this.searchBarContainer.appendChild(this.searchBarOpener.element);

        this.closeSearchBar = new MaterialIconButton({
            materialIcon: "close",
            events: [{
                type: "click",
                callback: (() => {
                    this.searchBarContainer.classList.remove("searchbarVisible");
                    this.searchBar.element.value = "";
                    this.searchBar.element.blur();
                }).bind(this)
            }],
            attr: {
                class: "closeSearchBar"
            }
        });
        this.searchBarContainer.appendChild(this.closeSearchBar.element);


    }
    search(query) {
        console.log(`searching for ${query}`);
        this.screen.kryptonInstance.requestChatList((chatList) => {
            this.chatListContent = chatList;
        }, query);
        return [];
    }
    addChatList() {
        this.chatList = document.createElement("div");
        this.chatList.classList.add("chatList");
        this.rootElement.appendChild(this.chatList);
        this.screen.kryptonInstance.requestChatList((chatList) => {
            this.chatListContent = chatList;
        })
    }

    parseChatList(chats) {
        this.chatList.innerHTML = "";
        this.chatListSections = []
        for (let i of Object.keys(chats)) {
            console.log(i, chats[i]);
            let section = new ChatListSection(chats[i], i, this);
            this.chatListSections.push(section);
            this.chatList.appendChild(section.element);
        }
    }
}

class ChatListSection {
    constructor(chats, title, chatListInstance) {
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

    set chats(value) {
        this._chats = value;
        this.chatTiles = [];
        this.chatTileContainer = document.createElement("div");
        this.chatTileContainer.classList.add("chatListSectionContainer", "chatTileContainer");
        console.log(value);
        for (let i of value) {
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

class ChatTile {
    constructor({
        title,
        subtitle,
        timestamp,
        picture
    }, chatListSectionInstance) {
        this.data = {
            title,
            subtitle,
            timestamp,
            picture
        };
        this.chatListSectionInstance = chatListSectionInstance;

        this.element = document.createElement("div");
        this.element.classList.add("chatTile");
        this.element.instance = this;

        if (picture) {
            this.element.classList.add("hasPicture");

            this.picture = document.createElement("div");
            this.picture.classList.add("chatTilePicture");
            if (this.checkDataURI(picture)) {
                this.picture.style.setProperty("--pictureSrc", `url(${picture})`);
            } else {
                this.picture.classList.add("failedPicture");
            }
            this.element.appendChild(this.picture);
        }

        this.title = document.createElement("span");
        this.title.classList.add("chatTileTitle");
        this.title.appendChild(document.createTextNode(this.data.title));
        this.element.appendChild(this.title);

        this.subtitle = document.createElement("span");
        this.subtitle.classList.add("chatTileSubtitle");
        this.subtitle.appendChild(document.createTextNode(this.data.subtitle));
        this.element.appendChild(this.subtitle);

        this.date = document.createElement("span");
        this.date.classList.add("chatTileTime");
        this.date.appendChild(document.createTextNode(this.getAppropriateDate(this.data.timestamp)));
        this.element.appendChild(this.date);
    }
    checkDataURI(dataURI) {
        return /^\s*data:([a-z]+\/[a-z]+(;[a-z\-]+\=[a-z\-]+)?)?(;base64)?,[a-z0-9\!\$\&\'\,\(\)\*\+\,\;\=\-\.\_\~\:\@\/\?\%\s]*\s*$/i.test(dataURI)
    }
    getAppropriateDate(timestamp) {
        let targetDate = dayjs(timestamp * 1000); // because shitty javascript won't take UNIX-Timestamp in s but in ms
        let currentDate = dayjs();

        // same day
        if (targetDate.startOf("day").valueOf() == currentDate.startOf("day").valueOf()) return new Date(targetDate).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit"
        });

        // same week
        if (targetDate.startOf("week").valueOf() == currentDate.startOf("week").valueOf()) return new Date(targetDate).toLocaleDateString([], {
            weekday: "short"
        });

        // return "normal" date
        return new Date(targetDate).toLocaleDateString([], {
            day: "2-digit",
            month: "2-digit",
            year: "2-digit"
        });
    }
}

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

class SideMenu {
    constructor(screen, options) {
        this.screen = screen;
        this.element = document.createElement("div");
        this.element.classList.add("sideMenu");
        this.focuser = document.createElement("div");
        this.focuser.classList.add("sideMenuFocuser");
        this.focuser.addEventListener("click", this.close.bind(this));
        this.element.appendChild(this.focuser);
        this.screen.rootElement.appendChild(this.element);
        this.element.instance = this;
        this.options = []
        for (let i of options) {
            let button = new LabeledMaterialIconButton(i);;
            this.options.push(button)
            this.element.appendChild(button.element);
        }
    }
    open() {
        this.element.classList.add("openSideMenu");
    }
    close() {
        this.element.classList.remove("openSideMenu");
    }

}