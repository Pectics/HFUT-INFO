import config from "@/config";
import { DateTime } from "luxon";

export class APIError extends Error {
    constructor(message: string,
        public readonly code: number = 500,
        public readonly timestamp: number = DateTime.local(
            { zone: config.TIMEZONE || process.env.TIMEZONE || 'Asia/Shanghai' }
        ).toMillis(),
    ) {
        super(message);
        this.name = 'APIError';
    }
}

export class ParamError extends APIError {
    constructor(param: string, got: any) {
        super(got ? `Invalid parameter: ${param}, got ${got}` : `Missing parameter: ${param}`);
        this.name = 'ParamError';
    }
}

export class InvalidContentError extends APIError {
    constructor(message: string) {
        super(message);
        this.name = 'InvalidContentError';
    }
}