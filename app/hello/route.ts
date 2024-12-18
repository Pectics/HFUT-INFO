// Vercel configs
export const runtime = 'nodejs';

// Dependencies
import { packJSON } from "@/lib/utils";

export function GET(request: Request) {
    return packJSON("Hello there!");
}