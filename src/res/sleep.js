const sleep = (duration)=>{
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve(true);
        }, duration);
    });
}
module.exports = sleep;