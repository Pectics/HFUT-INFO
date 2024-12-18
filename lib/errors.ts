export class ParamError extends Error {
    constructor(param: string, got: any) {
        super(got ? `Invalid parameter: ${param}, got ${got}` : `Missing parameter: ${param}`);
        this.name = 'ParamError';
    }
}