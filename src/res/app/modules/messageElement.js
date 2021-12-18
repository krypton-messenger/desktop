import {
    markdown
} from "./markdown.js";
export {
    MessageElement
};

class MessageElement {
    constructor(messageData, kryptonInstance, socketMessage) {
        this.socketMessage = socketMessage ?? false;
        this.kryptonInstance = kryptonInstance;
        this.element = document.createElement("div");
        if (this.socketMessage) this.element.classList.add("socketMessage");
        this.element.classList.add("messageElement", messageData.direction);
        if (messageData.verified) this.element.classList.add("verified");
        else {this.element.classList.add("unverified"); this.element.setAttribute("title", "message verification failed")};
        this.element.instance = this;
        this.messageData = messageData;

        this.content = typeof (messageData.content == "string") ? JSON.parse(messageData.content) : message.content;

        this.meta = {
            sendTime: messageData.timestamp,
            sendState: "cloud"
        };
    }
    set meta(value) {
        if (!this.messageMeta) {
            this.messageMeta = document.createElement("span");
            this.messageMeta.classList.add("messageMeta");
            this.element.appendChild(this.messageMeta);
        }
        this.messageMeta.innerHTML = "";
        this.messageMeta.appendChild(document.createTextNode(new Date(value.sendTime * 1000).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit"
        })));
        this._meta = value;
    }
    get meta() {
        return this._meta;
    }
    set content(value) {
        this.value = value.value;
        this.quote = value.quote;
        this._content = value;
    }
    async getMimeType(fileName) {
        return "image/jpeg";
    }
    get content() {
        return this._content;
    }
    set value(value) {
        if (!this.messageContent) {
            this.messageContent = document.createElement("div");
            this.messageContent.classList.add("messageContent");
            this.element.appendChild(this.messageContent);
        }
        this.messageContent.innerHTML = "";
        switch (this.messageData.messageType) {
            case "file":
                this.fileInfo = JSON.parse(value);
                this.messageContent.classList.add("file");
                this.messageContent.addEventListener("click", (() => {
                    // https://stackoverflow.com/a/63081745/13001645 for oneliner random string
                    this.transactionId = Array.from({
                        length: 12
                    }, () => Math.random().toString(36)[2]).join('');
                    this.kryptonInstance.downloadFile(this.fileInfo.fileParts, this.fileInfo.fileKey, this.fileInfo.iv, this.fileInfo.fileName, this.transactionId);
                    this.kryptonInstance.downloadingFiles[this.transactionId] = this;
                    console.log(`donwloading ${this.fileInfo}`);
                }).bind(this));

                this.fileIcon = document.createElement("div");
                this.fileIcon.classList.add("fileIcon");
                (async () => {
                    this.fileIcon.dataset.mimeType = await this.getMimeType(this.fileInfo.fileName);
                })();
                this.fileIcon.dataset.fileIcon = "image";
                this.fileIcon.dataset.fileExtension = this.fileInfo.fileName.split(".").pop();
                this.messageContent.appendChild(this.fileIcon);

                this.fileName = document.createElement("span");
                this.fileName.classList.add("fileName");
                this.fileName.appendChild(document.createTextNode(this.fileInfo.fileName));
                this.messageContent.appendChild(this.fileName);

                this.fileSize = document.createElement("span");
                this.fileSize.classList.add("fileSize");
                this.fileSize.appendChild(document.createTextNode(this.formatBytes(this.fileInfo.fileSize)));
                this.messageContent.appendChild(this.fileSize);
                break;
            case "text":
            default:
                this.messageText = markdown(value, true);
                this.messageText.message = this;
                this.messageContent.appendChild(this.messageText);
                break;
        }
        this._value = value;
    }
    get value() {
        return this._value;
    }

    set quote(value) {
        if (value) {
            if (!this.quoteContent) {
                this.quoteContent = document.createElement("div");
                this.quoteContent.classList.add("quoteContent");
                this.element.appendChild(this.quoteContent);
            }
            this.quoteContent.innerHTML = "";
            this.quoteContent.appendChild(markdown(value));
            this._quoteContent = value;
        }
    }
    get quote() {
        return this._quoteContent;
    }
    /**
     * 
     * @author https://stackoverflow.com/a/18650828/13001645
     */
    formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }
    fadeIn() {
        if (this.socketMessage) {
            this.element.getBoundingClientRect(); // await next render
            setTimeout(()=>{
                this.element.classList.remove("socketMessage");
            }, 100);
        }
    }
}