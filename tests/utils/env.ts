import { existsSync } from "fs";
import { resolve } from "path";
import dotenv from "dotenv";

const envPath = resolve(process.cwd(), ".env.local");
if (existsSync(envPath)) {
	dotenv.config({ path: envPath });
}
