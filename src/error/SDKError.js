export default class SDKError {
    constructor(code, reason, err = null) {
        this.code = code;
        this.reason = reason;
        this.error = err;
    }
}
