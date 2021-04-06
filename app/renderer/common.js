
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
