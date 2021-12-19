const packager = require('electron-packager'),
    path = require("path"), fs = require("fs");

    
    async function bundleElectronApp(options) {
    fs.mkdirSync(options.dir, { recursive: true });
    const appPaths = await packager(options)
    console.log(`Electron app bundles created:\n${appPaths.join("\n")}`)
}

bundleElectronApp({
    platform: "darwin",
    arch: "x64",
    dir: process.cwd(),
    out: path.resolve(process.cwd(), "builds", "darvin", String(new Date().getTime()))
});