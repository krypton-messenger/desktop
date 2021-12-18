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
        this.parseChatList(value, false);
        this.chatList.classList.remove("loading");
        this._chatListContent = value;
    }
    get chatListContent() {
        return this._chatListContent ?? {};
    }
    setChatListContent(value, isPreflight) {
        if (isPreflight) {
            this._chatListContent = value;
            this.parseChatList(value, true);
        } else this.chatListContent = value;
    }
    /**
     * @param {Boolean} value
     */
    set hasNoChats(value) {
        if (value && !this.createChatButton) {
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
            try {
                this.chatList.removeChild(this.createChatButton.element);
            } catch (_e) {
                console.warn("couldn't remove button:", this.chatList, this.createChatButton.element, this);
            }
            this.createChatButton = false;
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

    applySearchQuery() {
        console.log(`keypress on searchbar`);
        this.search(this.searchBar.element.value);
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
                    type: "keyup",
                    callback: this.applySearchQuery.bind(this)
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
                    this.applySearchQuery();
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
        this.screen.kryptonInstance.requestChatList();
    }

    async parseChatList(chats, isPreflight) {
        console.log("preflight chat list:", isPreflight);
        this.chatList.innerHTML = "";
        this.chatListSections = []
        var hasNoChats = !isPreflight;
        console.log(`chatlist:`, chats, Object.values(chats).length);
        if (chats) {
            if (Object.values(chats).length > 1) {
                this.chatList.classList.add("searchResult");
                this.hasNoChats = false;
            } else if (Object.values(chats).flat().length > 0) this.chatList.classList.remove("loading")
            else this.chatList.classList.remove("searchResult");
            for (let i of Object.keys(chats)) {
                console.log(i, chats[i], chats);
                let section;
                if(i == "Users") section = new ChatListSection(chats[i], i, this, ((chatTile) => {
                    console.log(chatTile);
                    this.screen.kryptonInstance.ipc.send("createChat", {
                        username: chatTile.data.username
                    });
                }).bind(this));
                else section = new ChatListSection(chats[i], i, this);
                hasNoChats = section.empty && hasNoChats; // we want to keep it to false if it is ever false
                this.chatListSections.push(section);
                this.chatList.appendChild(section.element);
            }
        }
        console.log("hasNoChats", hasNoChats);
        this.hasNoChats = Object.values(chats).length > 1 ? false : hasNoChats;
    }
}