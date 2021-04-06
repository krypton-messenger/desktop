class ChatTile {
    constructor(data) {
        if (data) {
            this.lastMessageDate = new Date(data.lastMessage.timestamp);
            this.container = document.createElement("div");
            this.container.classList.add("chatContainer");
            this.container.dataset.lastMessageTime = this.lastMessageDate.getTime();
            this.container.dataset.chatid = data.lastMessage.chat_id;

            this.container.onclick = (e) => {
                this.deselectAll(true);
                this.container.classList.add("selected");
                window.ipc.send('getmessages', {
                    chatid: data.chatid,
                    chatKey: data.chatKey,
                    offset: 0
                });
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
        this.chatNameElement = document.createElement("span");
        this.chatNameElement.classList.add("contactName");
        this.chatNameElement.appendChild(document.createTextNode(value));
        this.container.appendChild(this.chatNameElement);
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
        }
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
                this.messagePreview.appendChild(document.createTextNode(value.message.value));
                break;
        }
        this.messageTime = document.createElement("span");
        this.messageTime.classList.add("messageTime");
        this.messageTime.appendChild(document.createTextNode(this.lastMessageDate.getHours, this.lastMessageDate.getMinutes));

        this.container.appendChild(this.messagePreview);

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
    constructor(data) {
        this.MarkdownConverter = new MarkdownConverter();
        this.date = new Date(data.timestamp);
        this.data = data;

        this.container = document.createElement("div");
        this.container.dataset.messageId = data.message_id;

        this.container.classList.add("message", data.direction ?? "unknownDirection");
        this.container.dataset.timestampMinutes = this.pad(this.date.getMinutes(), 2);
        this.container.dataset.timestampHours = this.pad(this.date.getHours(), 2);
        this.container.dataset.timestamp = this.date.getTime();
        this.container.dataset.verified = data.verified;
        this.container.classList.add(data.messageType ?? "text");

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
                    mimeType
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
    sortMessageElements() {
        if (this.container.parentElement) {
            for (var i of [].slice.call(this.container.parentElement.childNodes).sort((a, b) => {
                    return b.dataset.timestamp - a.dataset.timestamp
                })) {
                this.container.parentElement.appendChild(i);
            }
        }
    }
};

const ContextMenu = () => {
    console.log("ContextMenu");
};
