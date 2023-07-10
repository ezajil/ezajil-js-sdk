export default class SDKError {
    constructor(message, code, err = null) {
        this.message = message;
        this.code = code;
        this.error = err;
    }
}
