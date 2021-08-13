export {
    versionInfo,
    about
};

const versionInfo = {
    version: "0.0.0-beta",
    licence: "AGPL-3.0 License",
}
const about = (() => {
    let container = document.createElement("div");

    container.appendChild(document.createTextNode(`Version ${versionInfo.version} of the Krypton Messenger Desktop App.`));
    
    container.appendChild(document.createElement("br"));
    
    container.appendChild(document.createTextNode(`This software is distributed under the ${versionInfo.licence} and its source code is available on `));

    let githubLink = document.createElement("a");
    githubLink.classList.add("openUnsaveLink");
    githubLink.addEventListener("click", () => {
        openLink("https://github.com/krypton-messenger/");
    });
    githubLink.appendChild(document.createTextNode("GitHub."));
    container.appendChild(githubLink);

    container.appendChild(document.createElement("br"));

    container.appendChild(document.createTextNode(`By using Krypton, its software and/or API you agree to the `));

    let gtcLink = document.createElement("a");
    gtcLink.classList.add("openUnsaveLink");
    gtcLink.addEventListener("click", () => {
        openLink("https://kr.ttschnz.ch/gtc");
    });
    gtcLink.appendChild(document.createTextNode("GTC."));
    container.appendChild(gtcLink);

    return container;
})();