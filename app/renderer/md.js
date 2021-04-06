class MarkdownConverter {
    constructor() {
        this.regex = /(?<url>(?:(?<scheme>[a-zA-Z]*:\/\/)(?<hostnameWithScheme>[-a-zA-Z0-9À-ÖØ-öø-ÿ@:%._\+~#=]{1,256})|(?<hostnameNoScheme>(?:[-a-zA-Z0-9À-ÖØ-öø-ÿ@:%_\+~#=]{1,256}\.){1,256}(?:[-a-zA-Z0-9À-ÖØ-öø-ÿ@:%_\+~#=]{1,256})))(?<path>(?:\/[-a-zA-Z0-9!$&'()*+,\\\/:;=@\[\]._~%]*)*)(?<query>(?:(?:\#|\?)[-a-zA-Z0-9!$&'()*+,\\\/:;=@\[\]._~]*)*))|(?<email>(?<username>[-a-zA-Z0-9À-ÖØ-öø-ÿ@:%._\+~#=]{1,256})@(?<hostname>[-a-zA-Z0-9À-ÖØ-öø-ÿ@:%._\+~#=]{1,256}(\.[a-zA-Z0-9()])?))/gi
    }
    filterLinks(elmt) {
        var matches = elmt.innerHTML.matchAll(this.regex);
        for (const match of matches) {
            if (match.groups.email) {
                elmt.innerHTML = (elmt.innerHTML.split(match.groups.email).join("<a href='javascript:open(\"mailto:" + match.groups.email + "\")'>" + match.groups.email + "</a>"));
            } else if (match.groups.scheme) {
                elmt.innerHTML = (elmt.innerHTML.split(match.groups.url).join("<a href='javascript:open(\"" + match.groups.url + "\")'>" + match.groups.url + "</a>"));
            } else if (match.groups.url) {
                elmt.innerHTML = (elmt.innerHTML.split(match.groups.url).join("<a href='javascript:open(\"http://" + match.groups.url + "\")'>" + match.groups.url + "</a>"));
            }
        }
        return elmt;
    }

    convert(mdString) {
        mdString = Array.from(mdString);
        var htmlElement = document.createElement("span");

        var state = {
            "*": {
                tagName: "b"
            }, // bold
            "~": {
                tagName: "s"
            }, // strikethrough
            "`": {
                tagName: "code"
            }, // code
            "_": {
                tagName: "i"
            }, // italic
        };
        var escapeCharacter = "\\";

        var escapeNextChar = false;

        var activeElement = htmlElement;

        while (mdString.length > 0) {
            let i = mdString.shift();
            if (i == escapeCharacter) {
                escapeNextChar = true;
            } else {
                if (state[i] && !escapeNextChar) {
                    if (state[i].element) {
                        activeElement = state[i].element.parentElement;
                        state[i].element = undefined;
                    } else {
                        state[i].element = document.createElement(state[i].tagName);
                        activeElement.appendChild(state[i].element);
                        activeElement = state[i].element;
                    }
                } else {
                    if (activeElement.lastChild && activeElement.lastChild.nodeName == "#text") {
                        activeElement.lastChild.nodeValue += i;
                    } else {
                        activeElement.appendChild(document.createTextNode(i));
                    }
                }
                escapeNextChar = false;
            }
        }
        htmlElement = this.filterLinks(htmlElement);
        return htmlElement;
    }
}