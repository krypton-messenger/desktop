const kryptonBuild = {
    version: "Beta Version",
    title: "Krypton Desktop"
}

class sideMenu {
    constructor(actions) {
        this.container = document.createElement("div");
        this.container.classList.add("sideMenu");

        this.createFocuser();
        this.createActionButtons(actions);
        this.createFooter();
    }

    createFocuser() {
        this.focuser = document.createElement("div");
        this.focuser.classList.add("sideMenuFocuser");
        this.focuser.addEventListener("click", this.toggleSideMenu)

        this.container.appendChild(this.focuser);
    }

    createActionButtons(actions) {
        let actionContainer = document.createElement("div");
        actionContainer.classList.add("sidemenuActions");

        for (let i of actions) {
            let button = document.createElement("button");
            button.addEventListener("click", i.onclick);

            let icon = document.createElement("span");
            icon.classList.add("material-icons");
            icon.appendChild(document.createTextNode(i.icon));
            button.appendChild(icon);

            button.appendChild(document.createTextNode(i.text));
            actionContainer.appendChild(button);
        }

        this.container.appendChild(actionContainer);
    }
    createFooter() {
        let footerContainer = document.createElement("div");
        footerContainer.classList.add("sideMenuFooter");

        let titleSpan = document.createElement("span");
        titleSpan.appendChild(document.createTextNode(kryptonBuild.title));
        footerContainer.appendChild(titleSpan);

        let versionSpan = document.createElement("span");
        versionSpan.appendChild(document.createTextNode(kryptonBuild.version));
        footerContainer.appendChild(versionSpan);

        let themeToggler = document.createElement("button");
        themeToggler.addEventListener("click", toggleTheme);
        themeToggler.classList.add("toggleUI")
        footerContainer.appendChild(themeToggler)

        let brightnessIcon = document.createElement("span");
        brightnessIcon.classList.add("material-icons");
        brightnessIcon.appendChild(document.createTextNode("brightness_high"));
        themeToggler.appendChild(brightnessIcon);

    }
    open() {
        this.container.classList.add("open");
    }

    close() {
        this.container.classList.remove("open");
    }

    toggleSideMenu() {
        this.container.classList.toggle("open");
    }
}

class chatView {
    constructor(mainInstance, chats) {
        this.mainInstance = mainInstance;
        this.container = document.createElement("div");
        this.container.classList.add("chatView");

        this.createSearchBar();

        this.chatList = document.createElement("div");
        this.chatList.classList.add("chatList");

        this.chatTiles = chats ?? [];
    }

    createSearchBar() {
        let container = document.createElement("div");
        container.classList.add("searchBar");


        container.appendChild(
            new materialIconButton("menu", this.mainInstance.sideMenu.open, "open menu")
        );

        let searchInputContainer = document.createElement("div");
        searchInputContainer.classList.add("searchInputContainer");
        container.appendChild(searchInputContainer);

        let searchInput = document.createElement("input");
        searchInput.classList.add("searchInput");
        searchInput.setAttribute("placeholder", "Search");
        searchInput.setAttribute("type", "text");
        searchInputContainer.appendChild(searchInput);
        this.searchInput = searchInput;

        let clearSearchInput = new materialIconButton("close", this.clearSearchInput, "clear search");
        clearSearchInput.classList.add("clearSearchInput");
        searchInputContainer.appendChild(clearSearchInput);

        container.appendChild(
            new materialIconButton("search", this.openSearchBar, "search")
        );
        this.container.appendChild(container);

    }
    clearSearchInput() {
        this.searchInput.value = "";
        this.searchInput.blur();
    }
    openSearchBar() {
        this.searchInput.focus();
    }
    set chatTiles(value) {
        this._chatTiles = value;
        for (let i of value) {
            let chatTile = new ChatTile(i);
            this._chatTiles.push(chatTile);
            this.chatList.appendChild(chatTile);
        }
    }
    sortChatTiles() {
        for (let i of [].slice.call(this.chatTiles).sort(
                (a, b) => {
                    return b.lastMessageDate - a.lastMessageDate
                }
            )) {
            this.container.appendChild(i);
        }
    }

    deselectAll() {
        for (let i of this.chatTiles) {
            i.deselect();
        }
    }

    get chatTiles() {
        return this._chatTiles;
    }
}

class materialIconButton {
    constructor(iconName, onclick, title) {
        this.button = document.createElement("button");
        this.button.addEventListener("click", noImplementation);
        this.button.addEventListener("click", onclick);
        this.button.setAttribute("title", title);
        this.button.instance = this;

        this.icon = document.createElement("i");
        this.icon.classList.add("material-icons");
        this.icon.appendChild(document.createTextNode(iconName));
        this.button.appendChild(this.icon);

        return this.button
    }
}

class messageView {
    constructor(mainInstance) {
        this.mainInstance = mainInstance;
        this.container = document.createElement("div");
        this.container.classList.add("messageView");

        this.addMessageContainer();
        this.addContactInformation();
        this.addMessageActionArea();
        this.addSelectedMessageActionArea();
    }

    changeContactInformation(username) {
        this.chatTitle.innerHTML = "";
        this.chatTitle.appendChild(document.createTextNode(username))
    }

    addMessageContainer() {
        let messageContainer = document.createElement("div");
        messageContainer.classList.add("messageContainer");
        this.container.appendChild(messageContainer);
    }

    addContactInformation() {
        let contactInformation = document.createElement("div");
        contactInformation.classList.add("contactInformation");

        contactInformation.appendChild(
            new materialIconButton("arrow_back", () => {
                this.mainInstance.chatView.deselectAll()
            }, "back")
        );

        let chatTitle = document.createElement("span");
        chatTitle.classList.add("chatTitle");
        contactInformation.appendChild(chatTitle);
        this.chatTitle = chatTitle;

        let chatInfo = document.createElement("span");
        chatInfo.classList.add("chatInfo");


        contactInformation.appendChild(
            new materialIconButton("call", noImplementation, "call")
        );

        contactInformation.appendChild(
            new materialIconButton("more_vert", noImplementation, "more options")
        );

        this.container.appendChild(contactInformation);
    }

    addMessageActionArea() {
        let messageActionArea = document.createElement("div");
        messageActionArea.classList.add("messageActionArea");

        messageActionArea.appendChild(
            new materialIconButton("attach_file", noImplementation, "attach file")
        );


        let messageContent = document.createElement("textarea");
        messageContent.setAttribute("placeholder", "Write a message...");
        messageContent.classList.add("messageContent");
        messageActionArea.appendChild(messageContent);

        messageActionArea.appendChild(
            new materialIconButton("schedule", noImplementation, "schedule message")
        );

        messageActionArea.appendChild(
            new materialIconButton("send", sendMessage, "send")
        );
        this.container.appendChild(messageActionArea);
    }
    addSelectedMessageActionArea() {
        let container = document.createElement("div");
        container.classList.add("selectedMessageActionArea");

        container.appendChild(
            new materialIconButton("arrow_back", () => {}, "back")
        );

        let selectedMessageCount = document.createElement("span");
        selectedMessageCount.innerHTML = "0";
        selectedMessageCount.classList.add("selectedMessageCount");
        container.appendChild(selectedMessageCount);
        this.selectedMessageCount = selectedMessageCount;

        container.appendChild(
            new materialIconButton("reply", noImplementation, "reply")
        );

        container.appendChild(
            new materialIconButton("translate", noImplementation, "translate")
        );

        container.appendChild(
            new materialIconButton("volume_up", noImplementation, "translate")
        );

        container.appendChild(
            new materialIconButton("content_copy", noImplementation, "copy to clipboard")
        );

        container.appendChild(
            new materialIconButton("send", noImplementation, "forward")
        );
        this.container.appendChild(container);
    }
}

class main {
    constructor(windowType) {
        this.container = document.createElement("main");
        this.setupWindow();
        this.createNav();
        switch (windowType) {
            case this.windowTypes.mainWindow:
                this.mainContainer = this.createMainWindowView();
                break;
            case this.windowTypes.loginWindow:
                this.mainContainer = this.createLoginWindow();
                break;
            case this.windowTypes.signupWindow:
                this.mainContainer = this.createSignupWindow();
                break;
        }
        this.container.appendChild(this.mainContainer);
    }

    setupWindow() {
        this.window = {};
        this.window.minimize = () => {
            window.ipc.send("windowStateChange", "minimize");
        }
        this.window.toggleMaximize = () => {
            window.ipc.send("windowStateChange", "toggleMaximize");
        }
        this.window.close = () => {
            window.ipc.send("windowStateChange", "close");
        }
    }
    get windowTypes() {
        return {
            "loginWindow": 0,
            "signupWindow": 1,
            "mainWindow": 2
        }
    }

    createNav() {
        this.nav = {}
        this.nav.container = document.createElement("nav");
        this.nav.options = [{
            class: "material-icons",
            onclick: this.window.minimize,
            content: "minimize"
        }, {
            class: "material-icons",
            onclick: this.window.toggleMaximize,
            content: "crop_square"
        }, {
            class: "material-icons",
            onclick: this.window.close,
            id: "closeWindow",
            content: "close"
        }]
        for (let i of this.nav.options) {
            let button = document.createElement("button");
            button.classList.add(i.class);
            button.addEventListener("click", i.onclick);
            if (i.id) button.id = i.id;
            button.appendChild(document.createTextNode(i.content));
            this.nav.container.appendChild(button);
        }
        this.container.appendChild(this.nav.container);
    }

    createMainWindowView() {
        let mainContainer = document.createElement("div");
        // add a sidemenu
        this.sideMenu = new sideMenu([{
            onclick: noImplementation,
            icon: "create",
            text: "New Chat"
            }, {
            onclick: noImplementation,
            icon: "group",
            text: "New Group"
            }, {
            onclick: showSettings,
            icon: "settings",
            text: "Settings"
            }, {
            onclick: logout,
            icon: "logout",
            text: "Sign Out"
            }, {
            onclick: () => {
                window.ipc.send("windowStateChange", "openDebug");
            },
            icon: "code",
            text: "Debug"
            }]);
        mainContainer.appendChild(this.sideMenu.container);

        this.messageView = new messageView(this);
        mainContainer.appendChild(this.messageView.container);

        this.chatView = new chatView(this);
        mainContainer.appendChild(this.chatView.container);

        this.createToastBarContainer();

        this.createPopupContainer();

        return mainContainer;
    }

    createToastBarContainer() {
        let container = document.createElement("div")
        container.setAttribute("id", "toastBarContainer");
        this.container.appendChild(container);
    }
    createPopupContainer() {
        let container = document.createElement("div")
        container.setAttribute("id", "popupContainer");
        this.container.appendChild(container);
    }

    createLoginWindow() {
        let mainContainer = document.createElement("div");
        return mainContainer;

    }

    createSignupWindow() {
        let mainContainer = document.createElement("div");
        return mainContainer;
    }

}

class ChatTile {
    constructor(data) {
        if (data) {
            this.lastMessageDate = new Date(data.lastMessage.timestamp);
            this.container = document.createElement("div");
            this.container.classList.add("chatContainer");
            this.container.setAttribute("tabindex", "0");
            this.container.dataset.lastMessageTime = this.lastMessageDate.getTime();
            this.container.dataset.chatid = data.lastMessage.chat_id;
            this.container.instance = this;
            this.container.onclick = (e) => {
                this.deselectAll(true);
                this.container.classList.add("selected");
                window.ipc.send('getmessages', {
                    chatid: data.chatid,
                    chatKey: data.chatKey,
                    offset: 0
                });
                document.getElementById("chatTitle").innerHTML = "";
                document.getElementById("chatTitle").appendChild(document.createTextNode(this.chatName));
            };

            this.profilePictureURI = data.profilePicture;
            this.chatName = data.username ?? data.chatName;
            this.lastMessage = data.lastMessage;

        }
    }

    set lastMessageDate(value) {
        this._lastMessageDate = value;

    }
    get lastMessageDate() {
        return this._lastMessageDate;
    }

    set chatName(value) {
        this._chatName = value;
        this.chatNameElement = document.createElement("span");
        this.chatNameElement.classList.add("contactName");
        this.chatNameElement.appendChild(document.createTextNode(value));
        this.container.appendChild(this.chatNameElement);
    }
    get chatName() {
        return this._chatName;
    }

    set profilePictureURI(value) {
        this.profilePicture = document.createElement("div");
        this.profilePicture.classList.add("profilePicture");
        if (value) this.profilePicture.style.setProperty("--profilePicture", "url(" + value + ")");
        this.container.appendChild(this.profilePicture);
    }

    set lastMessage(value) {
        this._lastMessage = value;

        if (!this.messagePreview) {
            this.messagePreview = document.createElement("span");
            this.messagePreview.classList.add("messagePreview");
            this.container.appendChild(this.messagePreview);
        } else {
            this.messagePreview.innerHTML = "";
        }
        this.messagePreview.classList.add(value.direction);
        switch (value.messageType) {
            case "file":
                let attachFileSpan = document.createElement("span");
                attachFileSpan.innerHTML = "attach_file";
                attachFileSpan.classList.add("material-icons");
                this.messagePreview.appendChild(attachFileSpan);

                let fileName = document.createElement("span");
                fileName.appendChild(document.createTextNode(value.message.value.split(":")[0]))
                this.messagePreview.appendChild(fileName);
                break;
            default:
                let prev = document.createElement("span");
                prev.appendChild(document.createTextNode(value.message.value));
                this.messagePreview.appendChild(prev);
                break;
        }
        if (!this.messageTime) {
            this.messageTime = document.createElement("span");
            this.messageTime.classList.add("messageTime");
        } else {
            this.messageTime.innerHTML = "";
        }
        this.messageTime.appendChild(document.createTextNode(this.lastMessageDate.getHours, this.lastMessageDate.getMinutes));

        this.sortChatTiles();
    }

    sortChatTiles() {
        console.log("sorting");
        if (this.container.parentElement) {
            for (var i of [].slice.call(this.container.parentElement.childNodes).sort((a, b) => {
                    return b.dataset.lastMessageTime - a.dataset.lastMessageTime
                })) {
                this.container.parentElement.appendChild(i);
            }
        }
    }

    deselectAll(loading) {
        document.querySelectorAll(".selected.chatContainer").forEach((elmt) => {
            elmt.classList.remove("selected");
        });
        if (loading) {
            document.getElementById("messageView").classList.add("loading");
        } else {
            document.getElementById("messageView").classList.remove("loading");
        }
        document.getElementById("messageView").classList.remove("hasMessages");
        document.getElementById("messageContainer").innerHTML = "";
    }
};

class MessageElement {
    constructor(data, trigger) {
        if (data) {
            this.trigger = trigger ?? "getmessages";
            this.MarkdownConverter = new MarkdownConverter();
            this.date = new Date(data.timestamp);
            this.data = data;
            this.sendState = data.sendState ?? true;
        }
    }
    reply() {
        return {
            "messageId": this.data.message_id,
            "text": this.data.message.value,
            "username": this.data.sender
        }
    }

    set sendState(value) {
        this._sendState = {};
        this._sendState.value = value;
        this._sendState.container = document.createElement("div");
        this._sendState.container.classList.add("messageSendState", "material-icons");
        this._sendState.container.innerHTML = value ? "done" : "schedule";
        this.container.appendChild(this._sendState.container);

    }

    get data() {
        return this._data;
    }

    set data(data) {
        this._data = data;
        this.container = document.createElement("div");
        this.container.dataset.messageId = data.message_id;
        this.container.messageElement = this;
        this.container.classList.add("message", data.direction);


        this.container.addEventListener("mouseup", (e) => {
            if (this.longPress && this.container.parentElement.querySelector(".selected.message")) this.select()
            clearTimeout(this.longPress);
            this.longPress = false;
        });

        this.container.addEventListener("mouseleave", (e) => {
            clearTimeout(this.longPress);
        });
        this.container.addEventListener("mousedown", (e) => {
            if (e.which == 1) {
                this.longPress = setTimeout(() => {
                    this.longPress = false;
                    this.select()
                }, 500);
            }
        });

        this.container.addEventListener("select", e => {
            this.select()
        });
        this.container.addEventListener("deselect", e => {
            this.deselect()
        });

        this.container.addEventListener("contextmenu", e => {
            new ContextMenu(e, [{
                label: "Reply",
                callback: this.reply,
                disabled: false
                }, {
                label: "Select",
                callback: (e, obj) => {
                    obj.select();
                },
                args: [this],
                disabled: false
                }, {
                label: "Copy Text",
                callback: (e, value) => {
                    console.log("copy text");
                    navigator.clipboard.writeText(value);
                },
                args: [this.data.message.value],
                disabled: false
                }, {
                label: "Message information",
                callback: (e, messageData) => {
                    let tableData = Object.keys(messageData).map((key, index) => {
                        return [key, Object.values(messageData)[index]]
                    })
                    let table = document.createElement("table");
                    for (let i of tableData) {
                        let tr = document.createElement("tr");
                        for (let j of i) {
                            let td = document.createElement("td");
                            if (typeof (j) == "object") td.appendChild(document.createTextNode(JSON.stringify(j)));
                            else td.appendChild(document.createTextNode(j));
                            td.classList.add("messageInformation_" + i[0]);
                            td.dataset.value = j;
                            tr.appendChild(td);
                        }
                        table.appendChild(tr);
                    }

                    new Popup(table, {
                        cancel: false,
                        okButton: {
                            label: "Okay",
                            callback: () => {
                                new Popup().remove(true)
                            }
                        }
                    }).show();
                },
                args: [this.data],
                disabled: false
                }]);
        });

        this.container.dataset.timestampMinutes = this.pad(this.date.getMinutes(), 2);
        this.container.dataset.timestampHours = this.pad(this.date.getHours(), 2);
        this.container.dataset.timestamp = this.date.getTime();
        this.container.dataset.verified = data.verified;
        this.container.classList.add(data.messageType ?? "text");

        if (data.message.quote && Object.keys(data.message.quote).length > 0) {
            if (!Array.isArray(data.message.quote)) data.message.quote = [data.message.quote];

            let messageQuoteContainer = document.createElement("div");
            messageQuoteContainer.classList.add("messageQuoteContainer");


            this.quote = {
                data: data.message.quote,
                quoteObjects: [],
                container: messageQuoteContainer
            }
            for (let i of data.message.quote) {
                let messageQuote = document.createElement("div");
                messageQuote.classList.add("messageQuote");
                messageQuote.dataset.quotedMessage = i.messageId;

                let quoteSender = document.createElement("span");
                quoteSender.classList.add("quoteSender");
                quoteSender.appendChild(document.createTextNode(i.username));
                messageQuote.appendChild(quoteSender);

                let quoteContent = document.createElement("span");
                quoteContent.classList.add("quoteContent");
                quoteContent.appendChild(document.createTextNode(i.text));
                messageQuote.appendChild(quoteContent);


                this.quote.container.appendChild(messageQuote);
                this.quote.quoteObjects.push(messageQuote);
            }
            this.container.appendChild(this.quote.container);
        }

        this.messageContentElmt = document.createElement("div");
        this.messageContentElmt.classList.add("messageContent");
        this.container.appendChild(this.messageContentElmt);
        this.messageType = data.messageType;
        switch (this.messageType) {
            case "file":
                let [title, fileId, rawSize, encryptedSize, mimeType] = data.message.value.split(":");
                this.file = {
                    title,
                    fileId,
                    rawSize,
                    encryptedSize,
                    mimeType,
                    chatId: data.chat_id
                };
                this.container.onclick = () => {
                    if (!this.container.parentElement.querySelector(".selected.message")) this.downloadFile(this.file);
                };

                this.contentElement = document.createElement("div");
                this.contentElement.classList.add("file");
                this.contentElement.dataset.title = this.file.title;
                this.contentElement.dataset.fileId = this.file.fileId;
                this.contentElement.dataset.rawSize = this.file.rawSize;
                this.contentElement.dataset.encryptedSize = this.file.encryptedSize;
                this.contentElement.dataset.mimeType = this.file.mimeType;

                this.file.titleElement = document.createElement("span");
                this.file.titleElement.classList.add("fileTitle");
                this.file.titleElement.appendChild(document.createTextNode(this.file.title));
                this.contentElement.appendChild(this.file.titleElement);


                this.file.sizeSpan = document.createElement("span");
                this.file.sizeSpan.classList.add("fileSize");
                this.file.sizeSpan.appendChild(document.createTextNode(this.formatBytes(this.file.rawSize)));
                this.contentElement.appendChild(this.file.sizeSpan);


                this.messageContentElmt.appendChild(this.contentElement);

                break;
            default:
                this.contentElement = document.createElement("p");
                this.contentElement.appendChild(this.MarkdownConverter.convert(data.message.value));
                this.messageContentElmt.appendChild(this.contentElement);
                break;

        }
    }

    downloadFile(file) {
        window.ipc.send('downloadFile', {
            id: file.fileId,
            title: file.title,
            chatId: file.chatId
        });
    }

    select() {
        if (this.selected) return this.deselect()
        this.selected = true;
        window.addEventListener("click", (e) => {
            if (!e.target.parentElement.querySelector(".message *") && this.selected) this.deselectAll();
        }, true, {
            once: true
        });
        this.container.classList.add("selected");
        this.container.parentElement.classList.add("hasSelectedMessage");
        this.updateSelectCount();
    }

    deselect() {
        this.selected = false;
        this.container.classList.remove("selected");
        if (!this.container.parentElement.querySelector(".selected.message")) this.container.parentElement.classList.remove("hasSelectedMessage");
        this.updateSelectCount();
    }

    updateSelectCount() {
        document.getElementById("selectedMessageCount").innerHTML = document.querySelectorAll(".selected.message").length;
    }

    deselectAll() {
        console.log(this.container.parentElement);
        for (let i of this.container.parentElement.querySelectorAll(".selected.message")) {
            i.dispatchEvent(new Event("deselect"));
        }
    }

    append() {
        let chatTile = document.querySelector(`[data-chatid='${this.data.chat_id}']`);
        if (chatTile.classList.contains("selected")) {
            if (this.trigger == "socket_message") this.container.classList.add("socket_message_introTransition");
            document.getElementById("messageContainer").appendChild(this.container);
            this.sortMessageElements();
            if (this.trigger == "socket_message") setTimeout(() => {
                this.container.classList.remove("socket_message_introTransition");
            }, 200);
        }
        if (chatTile.instance.lastMessageDate < new Date(this.data.timestamp)) chatTile.instance.lastMessage = this.data;

    }

    sortMessageElements() {
        if (this.container.parentElement) {
            for (var i of [].slice.call(this.container.parentElement.childNodes).sort((a, b) => {
                    return b.dataset.timestamp - a.dataset.timestamp
                })) {
                this.container.parentElement.appendChild(i);
            }
        }
    }

    // based on https://stackoverflow.com/a/10073788/13001645
    pad(n, width = 3, z = 0) {
        return (String(z).repeat(width) + String(n)).slice(String(n).length)
    }


    // from https://stackoverflow.com/a/18650828/13001645
    formatBytes(a, b = 2) {
        if (0 === a) return "0 Bytes";
        const c = 0 > b ? 0 : b,
            d = Math.floor(Math.log(a) / Math.log(1024));
        return parseFloat((a / Math.pow(1024, d)).toFixed(c)) + " " + ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"][d]
    }
};

class ContextMenu {
    constructor(e, items) {
        this.removeAllContextMenus();
        window.addEventListener("scroll", (e) => {
            if (!e.target.classList.contains("contextMenu")) this.removeAllContextMenus();
        }, true, {
            once: true
        });
        this.container = document.createElement("div");
        this.container.style.setProperty("--x", e.x);
        this.container.style.setProperty("--y", e.y);
        this.container.classList.add("contextMenu");

        this.items = items ?? [{
            label: "lorem ipsum",
            callback: console.log,
            disabled: false,
        }, {
            label: "lorem ipsum 2",
            callback: console.log,
            disabled: true,
        }, {
            label: "lorem ipsum 3",
            callback: console.log,
            disabled: false,
        }];
        for (let i of this.items) {
            i.elmt = document.createElement("button");
            i.elmt.classList.add("entry");
            i.elmt.onclick = (e) => {
                this.removeAllContextMenus();
                console.log("running callback of i:", i);
                i.callback(e, ...i.args ?? []);
            };
            if (i.disabled) i.elmt.setAttribute("disabled", "true");
            i.elmt.appendChild(document.createTextNode(i.label));

            this.container.appendChild(i.elmt);
        }
        document.body.appendChild(this.container);
        this.container.style.setProperty("--height", this.container.clientHeight + "px");


        window.addEventListener("click", (e) => {
            if (!e.target.classList.contains("contextMenu")) this.removeAllContextMenus();
        })
    }
    removeAllContextMenus() {
        for (var i of document.querySelectorAll(".contextMenu")) {
            i.parentElement.removeChild(i);
        }
    }
}

class Toast {
    constructor(message, options) {
        this.options = options ?? {};
        let actionOpts = this.options.actions ?? [];

        let closeOpts = this.options.close ?? {
            show: true,
            callback: false
        };

        let timerOpts = this.options.timer ?? false;

        let toast = document.createElement("div");
        toast.classList.add("toast");

        let toastMessage = document.createElement("span");
        toastMessage.classList.add("toastMessage");
        toastMessage.appendChild(document.createTextNode(message));
        toast.appendChild(toastMessage);

        for (var i of actionOpts) {
            let toastAction = document.createElement("button");
            toastAction.classList.add("toastAction");
            toastAction.appendChild(document.createTextNode(i.text));
            toastAction.onclick = (e) => {
                e.target.parentElement.classList.add("removing");
                setTimeout(() => {
                    e.target.parentElement.parentElement.removeChild(e.target.parentElement);
                }, 200);
                i.callback(e);
            };
            toast.appendChild(toastAction);
        }
        if (closeOpts.show) {
            console.log("showing");
            this.closeBtn = document.createElement("button");
            this.closeBtn.classList.add("close");
            if (closeOpts.callback) {
                this.closeBtn.onclick = closeOpts.callback;
            } else {
                this.closeBtn.onclick = (e) => {
                    e.target.parentElement.classList.add("removing");
                    setTimeout(() => {
                        e.target.parentElement.parentElement.removeChild(e.target.parentElement);
                    }, 200);
                }
            }
            this.closeBtn.appendChild(document.createTextNode("close"));
            toast.appendChild(this.closeBtn);
        }
        document.getElementById("toastBarContainer").appendChild(toast);

        if (timerOpts) {
            toast.classList.add("timed");
            toast.style.setProperty("--timeout", timerOpts - 200);
            setTimeout(() => {
                this.closeBtn.click();
            }, timerOpts);
            setTimeout(() => {
                toast.classList.add("timerStarted");
            }, 200);
        }
    }
}

class Popup {
    constructor(title, buttons) {
        if (title) this.content = title;
        if (buttons) this.buttons = buttons;
    }
    set content(value) {
        this.container = document.createElement("div");
        this.container.classList.add("popup");

        this._content = {
            text: value,
            elmt: document.createElement("div")
        }
        this._content.elmt.classList.add("popupContent");
        if (typeof (value) == "object") {
            this._content.elmt.appendChild(value);
        } else {
            this._content.elmt.appendChild(document.createTextNode(value));

        }
        this.container.appendChild(this._content.elmt);
    }
    get content() {
        return this._content.text;
    }

    set buttons(value) {
        this.popupActions = document.createElement("div");
        this.popupActions.classList.add("popupActions")
        this.container.appendChild(this.popupActions);
        this._buttons = {};

        if (value.cancel) {
            this._buttons.cancelButton = {
                label: value.cancel.label ?? "cancel",
                callback: value.cancel.callback ?? this.remove,
                elmt: document.createElement("button")
            };
            this._buttons.cancelButton.elmt.appendChild(document.createTextNode(this._buttons.cancelButton.label));
            this._buttons.cancelButton.elmt.onclick = this._buttons.cancelButton.callback;
            this.popupActions.appendChild(this._buttons.cancelButton.elmt);
        }

        if (value.okButton) {
            this._buttons.okButton = {
                label: value.okButton.label,
                callback: value.okButton.callback ?? this.remove,
                elmt: document.createElement("button")
            }
            this._buttons.okButton.elmt.appendChild(document.createTextNode(this._buttons.okButton.label));
            this._buttons.okButton.elmt.classList.add("suggestedAction");
            this._buttons.okButton.elmt.onclick = this._buttons.okButton.callback;
            this.popupActions.appendChild(this._buttons.okButton.elmt);
        }
    }

    get buttons() {
        return this._buttons
    }
    remove(all) {
        if (all) {
            for (let i of document.querySelectorAll(".popup")) {
                i.parentElement.removeChild(i);
            }

            // remove all event listeners by replacing container with a clone
            let container = document.getElementById("popupContainer"),
                containerClone = container.cloneNode(true);
            container.replaceWith(containerClone);


        } else {
            this.container.parentElement.removeChild(this.container);
            document.getElementById("popupContainer").removeEventListener("click", popup.removeViaContainer);
        }
    }

    removeViaContainer(e) {
        if (e.target.id == "popupContainer") new Popup().remove(true)
    }

    show() {
        document.getElementById("popupContainer").appendChild(this.container);
        let popup = this;
        // prevent unwanted closing of popup
        setTimeout(() => {
            document.getElementById("popupContainer").addEventListener("click", popup.removeViaContainer)
        }, 200);
    }

}
