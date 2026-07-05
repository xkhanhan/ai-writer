import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const dataDir = path.join(process.cwd(), "data");

export async function ensureDataDir() {
  await mkdir(dataDir, { recursive: true });
}

export async function readJsonFile<T>(fileName: string, fallback: T): Promise<T> {
  await ensureDataDir();

  const filePath = path.join(dataDir, fileName);

  try {
    const content = await readFile(filePath, "utf8");
    return JSON.parse(content) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      await writeJsonFile(fileName, fallback);
      return fallback;
    }

    throw error;
  }
}

export async function writeJsonFile<T>(fileName: string, value: T) {
  await ensureDataDir();
  const filePath = path.join(dataDir, fileName);
  const content = JSON.stringify(value, null, 2);
  await writeFile(filePath, `${content}\n`, "utf8");
}
