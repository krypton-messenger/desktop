import {
    MaterialIconButton
} from "./materialIconButton.js";
import {
    Button
} from "./button.js";
import {
    ChatListSection
} from "./chatListSection.js"
import {
    Input
} from "./input.js";

export {
    ChatList
};
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
        this.chatList.classList.remove("loading");
        this._chatListContent = value;
    }
    get chatListContent() {
        return this._chatListContent;
    }
    /**
     * @param {Boolean} value
     */
    set hasNoChats(value) {
        if (value) {
            console.log("has no chats!");
            this.chatList.classList.add("noChats");
            this.createChatButton = new Button({
                type: "button",
                label: "Create Chat",
                events: [{
                    type: "click",
                    callback: (() => {
                        this.screen.kryptonInstance.showOverlay(this.screen.kryptonInstance.OVERLAYID.CREATECHAT, {
                            title: "New Chat"
                        });
                    }).bind(this)
                }]
            });
            this.chatList.appendChild(this.createChatButton.element);
        } else if (this.createChatButton) {
            console.log("removed button");
            this.chatList.classList.remove("noChats");
            this.chatList.removeChild(this.createChatButton.element);
        }
        this._hasNoChats = value;
    }
    get hasNoChats() {
        return this._hasNoChats;
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
        this.chatList.classList.add("chatList", "loading");
        this.rootElement.appendChild(this.chatList);
        this.screen.kryptonInstance.requestChatList((chatList) => {
            this.chatListContent = chatList;
        })
    }

    async parseChatList(chats) {
        this.chatList.innerHTML = "";
        this.chatListSections = []
        var hasNoChats = true;
        console.log(`chatlist:`, chats);
        if (chats)
            for (let i of Object.keys(chats)) {
                console.log(i, chats[i]);
                let section = new ChatListSection(chats[i], i, this);
                hasNoChats = section.empty && hasNoChats; // we want to keep it to false if it is ever false
                this.chatListSections.push(section);
                this.chatList.appendChild(section.element);
            }
        console.log("hasNoChats", hasNoChats);
        this.hasNoChats = hasNoChats;
    }
}