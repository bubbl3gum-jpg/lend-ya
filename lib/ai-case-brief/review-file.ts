import { constants } from "node:fs";
import { lstat, open } from "node:fs/promises";
import path from "node:path";

/** Read only a bounded regular file through a stable, non-symlink path.
 * Windows does not implement O_NOFOLLOW. Compare the opened handle's identity
 * with lstat and recheck every ancestor; never rely on an undefined flag.
 */
export async function readReviewFile(input: string): Promise<string> {
  if (!input || input.includes("\0") || (process.platform === "win32" &&
      (/^[\\/]{2}/.test(input) || input.slice(2).includes(":"))))
    throw Error("INVALID_REVIEW_FILE");
  const filename = path.resolve(input);
  const paths: string[] = [];
  for (let current = filename; ; current = path.dirname(current)) {
    paths.push(current);
    if (path.dirname(current) === current) break;
  }
  const inspect = async () => Promise.all(paths.map(async (entry, index) => {
    const stat = await lstat(entry, { bigint: true });
    if (stat.isSymbolicLink() || (index === 0 ? !stat.isFile() || stat.nlink !== BigInt(1) : !stat.isDirectory()))
      throw Error("INVALID_REVIEW_FILE");
    return stat;
  }));
  const before = await inspect();
  if (before[0].size > BigInt(512000)) throw Error("INVALID_REVIEW_FILE");
  const file = await open(filename, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0) | (constants.O_NONBLOCK ?? 0));
  try {
    const opened = await file.stat({ bigint: true });
    if (!opened.isFile() || opened.ino === BigInt(0) || opened.ino !== before[0].ino ||
        opened.dev !== before[0].dev || opened.size !== before[0].size)
      throw Error("INVALID_REVIEW_FILE");
    const buffer = Buffer.alloc(512001);
    let length = 0;
    while (length < buffer.length) {
      const { bytesRead } = await file.read(buffer, length, buffer.length - length, length);
      if (!bytesRead) break;
      length += bytesRead;
    }
    const after = await inspect();
    if (length > 512000 || after.some((stat, index) => stat.ino !== before[index].ino || stat.dev !== before[index].dev) ||
        after[0].size !== opened.size || after[0].mtimeNs !== opened.mtimeNs || after[0].ctimeNs !== opened.ctimeNs)
      throw Error("INVALID_REVIEW_FILE");
    return buffer.toString("utf8", 0, length);
  } finally {
    await file.close();
  }
}
