export default class PageResult {

    constructor(results, pagingState, totalResults) {
        this.results = results;
        this.pagingState = pagingState;
        this.totalResults = totalResults;
    }
}
