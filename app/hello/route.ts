// Vercel configs
export const runtime = 'nodejs';

// Dependencies
import { data } from "@/lib/utils";

export function GET(_r: Request) {
    return data(null, 200, "Hi there!");
}