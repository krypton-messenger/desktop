try {
    const nconf = require("nconf"),
        fs = require("fs-extra");
    exports.userConfigFileLocation = (process.env.APPDATA ?? process.env.HOME) + "/.krypton/userData/userConfig.json";
    exports.setAndSave = async (key, value) => {
        exports.set(key, value);
        return exports.save();
    };
    exports.set = (key, value) => {
        return nconf.set(key, value);
    };
    exports.get = (key) => {
        return nconf.get(key);
    };
    exports.save = () => {
        let success = nconf.save();
        return success;
    };
    exports.reset = () => {
        exports.set("firstStart", false);
        exports.set("credentials", {});
        exports.set("server", exports.get("server") ?? "https://kr.ttschnz.ch");
        exports.setAndSave("signedIn", false);
    };


    fs.ensureFileSync(this.userConfigFileLocation);

    // read main config file
    nconf.file({
        file: exports.userConfigFileLocation,

        // to enable config encryption:

        //        secure: {
        //            secret: "secret-key",
        //            alg: "aes-256-ctr"
        //        }
    });

    nconf.defaults({
        firstStart: true,
    });

    if (nconf.get("firstStart")) {
        exports.reset();
        console.log("first start");
    }

    console.log("configuration storage is ready");

} catch (e) {
    console.log("failed to load configuration storage:", e);
}