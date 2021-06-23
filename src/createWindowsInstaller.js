const electronInstaller = require('electron-winstaller');
(async () => {
    try {
        await electronInstaller.createWindowsInstaller({
            appDirectory: './',
            outputDirectory: './release-builds/krypton-desktop-msi/installer',
            authors: 'github:ttschnz',
            exe: 'krypton.exe'
        });
        console.log('Done.');
    } catch (e) {
        console.log(`No dice: ${e.message}`);
    }

})();