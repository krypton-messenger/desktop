// toast
const createToast = (message, options) => {
    options = options ?? {};
    let actionOpts = options.actions ?? [];

    let closeOpts = options.close ?? {
        show: true,
        callback: false
    };

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
        let close = document.createElement("button");
        close.classList.add("close");
        if (closeOpts.callback) {
            close.onclick = closeOpts.callback;
        } else {
            close.onclick = (e) => {
                e.target.parentElement.classList.add("removing");
                setTimeout(() => {
                    e.target.parentElement.parentElement.removeChild(e.target.parentElement);
                }, 200);
            }
        }
        close.appendChild(document.createTextNode("close"));
        toast.appendChild(close);
    }
    return toast;




    //    <div class="toast">
    //    <span class="toastMessage">You are offline</span>
    //    <span class="toastAction">Retry</span>
    //    <span class="close">close</span>
    //</div>
}

const toggleTheme=()=>{
    document.querySelector(':root').classList.toggle('light');
}


// linking and md
const urlAndEmailRegex = /(?<url>(?:(?<scheme>[a-zA-Z]*:\/\/)(?<hostnameWithScheme>[-a-zA-Z0-9À-ÖØ-öø-ÿ@:%._\+~#=]{1,256})|(?<hostnameNoScheme>(?:[-a-zA-Z0-9À-ÖØ-öø-ÿ@:%_\+~#=]{1,256}\.){1,256}(?:[-a-zA-Z0-9À-ÖØ-öø-ÿ@:%_\+~#=]{1,256})))(?<path>(?:\/[-a-zA-Z0-9!$&'()*+,\\\/:;=@\[\]._~%]*)*)(?<query>(?:(?:\#|\?)[-a-zA-Z0-9!$&'()*+,\\\/:;=@\[\]._~]*)*))|(?<email>(?<username>[-a-zA-Z0-9À-ÖØ-öø-ÿ@:%._\+~#=]{1,256})@(?<hostname>[-a-zA-Z0-9À-ÖØ-öø-ÿ@:%._\+~#=]{1,256}(\.[a-zA-Z0-9()])?))/gi;

const filterLinks = (elmt) => {
    var matches = elmt.innerHTML.matchAll(urlAndEmailRegex);
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
const open = (url) => {
    window.ipc.send('openLink', {
        url: url
    });
}
const markdownConverter = (mdString) => {
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
    htmlElement = filterLinks(htmlElement);
    return htmlElement;

}


// based on https://stackoverflow.com/a/10073788/13001645
const pad = (n, width = 3, z = 0) => {
    return (String(z).repeat(width) + String(n)).slice(String(n).length)
}

// from https://stackoverflow.com/a/18650828/13001645
const formatBytes = (a, b = 2) => {
    if (0 === a) return "0 Bytes";
    const c = 0 > b ? 0 : b,
        d = Math.floor(Math.log(a) / Math.log(1024));
    return parseFloat((a / Math.pow(1024, d)).toFixed(c)) + " " + ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"][d]
}
