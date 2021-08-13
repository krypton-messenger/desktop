class WebSocketIpc {
    constructor() {
        this.port = 8080;
        this.host = document.location.host;
        this.socket = new WebSocket(`ws://${this.host}:${this.port}`);
    }
    send(command, data) {
        this.socket.send(JSON.stringify({
            command,
            data
        }));
    }
    listen(callback) {
        this.socket.addEventListener("message", (e) => {
            callback(e, JSON.parse(e.data));
        });
    }
}
window.ipc = new WebSocketIpc();

/**
 * @author https://css-tricks.com/the-trick-to-viewport-units-on-mobile/
 */
// We listen to the resize event
window.addEventListener('resize', () => {
    // We execute the same script as before
    let vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
});

window.dispatchEvent(new Event("resize"));