var regexCollection = {
    get urls(){
        return /(?<url>(?:(?<scheme>[a-zA-Z]+:\/\/)?(?<hostname>(?:(?:[-a-zA-Z0-9À-ÖØ-öø-ÿ@%_\+~#=]{1,256}\.){1,256}|(?<=(?:[a-zA-Z]):\/\/))(?:[-a-zA-Z0-9À-ÖØ-öø-ÿ@%_\+~#=]{1,256})))(?::(?<port>[[:digit:]]+))?(?<path>(?:\/[-a-zA-Z0-9!$&'()*+,\\\/:;=@\[\]._~%]*)*)(?<query>(?:(?:\#|\?)[-a-zA-Z0-9!$&'()*+,\\\/:;=@\[\]._~]*)*))/gi;
    }
}
export {regexCollection}