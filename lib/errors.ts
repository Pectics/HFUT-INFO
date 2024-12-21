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
    constructor(key: string, got: any) {
        super(got ? `Invalid parameter: ${key}, got ${got}` : `Missing parameter: ${key}`, 400);
        this.name = 'ParamError';
    }
}

export class PropertyError extends APIError {
    constructor(path: string, got: any) {
        super(got ? `Invalid property from path: ${path}, got ${got}` : `Missing body property: ${path}${got}`, 400);
        this.name = 'BodyError';
    }
}

export class TypeError extends APIError {
    constructor(key: string, expected: string, got: any) {
        super(`Invalid type of ${key}: expected ${expected}, got ${typeof got}`, 400);
        this.name = 'TypeError';
    }
}

export class HeaderError extends APIError {
    constructor(key: string) {
        super(`Missing header: ${key}`, 400);
        this.name = 'HeaderError';
    }
}

export class UpstreamError extends APIError {
    constructor(message: string) {
        super(`An upstream error occurred: ${message}`, 502);
        this.name = 'UpstreamError';
    }
}

export class AuthenticationError extends APIError {
    constructor(message: string) {
        super(`Authentication failed: ${message}`, 401);
        this.name = 'AuthenticationError';
    }
}