export {
    ChatTile
};
import "../resources/script/dayjs.min.js";
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