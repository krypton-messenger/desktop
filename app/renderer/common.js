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

// contextMenu

// just for testing purposes
window.addEventListener("contextmenu", (e) => {
    createContextMenu(e)
});

window.addEventListener("scroll", (e) => {
    if (!e.target.classList.contains("contextMenu")) removeAllContextMenus();
}, true)

const removeAllContextMenus = () => {
    for (var i of document.querySelectorAll(".contextMenu")) {
        i.parentElement.removeChild(i);
    }
}

const createContextMenu = (e, items) => {
    removeAllContextMenus();
    let contextMenu = document.createElement("div");
    contextMenu.style.setProperty("--x", e.x);
    contextMenu.style.setProperty("--y", e.y);
    contextMenu.classList.add("contextMenu");

    for (var i of items ?? [{
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
        }]) {
        let entry = document.createElement("button");
        entry.classList.add("entry");
        entry.onclick = (e) => {
            removeAllContextMenus();
            i.callback(e, ...i.args ?? []);
        };
        if (i.disabled) entry.setAttribute("disabled", "true");
        entry.appendChild(document.createTextNode(i.label));

        contextMenu.appendChild(entry);
    }
    document.body.appendChild(contextMenu);
    contextMenu.style.setProperty("--height", contextMenu.clientHeight + "px");


    window.addEventListener("click", (e) => {
        if (!e.target.classList.contains("contextMenu")) removeAllContextMenus();
    })
}

const toggleTheme = () => {
    document.querySelector(':root').classList.toggle('light');
}

const open = (url) => {
    window.ipc.send('openLink', {
        url: url
    });
}

const minimizeWindow = () => {
    window.ipc.send("windowStateChange", "minimize");
}
const toggleMaximizeWindow = () => {
    window.ipc.send("windowStateChange", "toggleMaximize");
}
const closeWindow = () => {
    window.ipc.send("windowStateChange", "close");
}
const debugMode = (e) => {
    console.log(e);
    window.ipc.send("windowStateChange", "openDebug");
}
