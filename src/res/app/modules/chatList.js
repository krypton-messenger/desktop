import {
    MaterialIconButton
} from "./materialIconButton.js";
import {ChatListSection} from "./chatListSection.js"
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