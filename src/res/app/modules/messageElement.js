export {MessageElement};

class MessageElement{
    constructor(messageData){
        this.messageData = messageData;
        this.element = document.createElement("div");
    }
}