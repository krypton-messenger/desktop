const config = require("./config");
try {
    config.reset();
    config.setAndSave("firstStart",true);
    config.setAndSave("firstStart",true);
    console.log("success reseting application");
    process.exit(0);    
} catch (e) {
    console.log(["failed to reset application", e]);
    process.exit(1);
}