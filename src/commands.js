/**
 * @typedef {import('../types/types').StringKeyedObject} StringKeyedObject
 * */

import { appendFileSync, existsSync, mkdirSync } from "fs";
import { config } from "./config/config";

const isMac = process.platform === "darwin";

function log(...args) {
  appendFileSync(
    "/tmp/castui-debug.log",
    args
      .map((a) => (typeof a === "object" ? JSON.stringify(a, null, 2) : a))
      .join(" ") + "\n",
  );
}

/** @type {(key: string) => void} */
export function getWatchUrl(key) {
  const [type, ...rest] = key.split("/");
  const filename = rest.join("/");
  const encoded = btoa(filename);
  const autoplay = config.autoplay ? "&autoplay=1" : "";
  return `https://${config.baseWatchUrl}/?t=${type}&s=${encoded}${autoplay}`;
}

export function viewVideo(key) {
  Bun.spawn([isMac ? "open" : "xdg-open", getWatchUrl(key)]);
}

export function copyVideoUrl(key) {
  const url = getWatchUrl(key);
  const candidates = [
    { bin: "wl-copy", cmd: `echo -n ${JSON.stringify(url)} | wl-copy` },
    {
      bin: "xclip",
      cmd: `echo -n ${JSON.stringify(url)} | xclip -selection clipboard`,
    },
    {
      bin: "xsel",
      cmd: `echo -n ${JSON.stringify(url)} | xsel --clipboard --input`,
    },
    { bin: "pbcopy", cmd: `echo -n ${JSON.stringify(url)} | pbcopy` },
  ];
  const tool = candidates.find(
    ({ bin }) => Bun.spawnSync(["which", bin]).exitCode === 0,
  );
  if (tool) Bun.spawn(["sh", "-c", tool.cmd]);
}

/** @type {(key: string) => Promise<boolean>} */
async function s3KeyExists(key) {
  const bucket = config.bucket;
  const proc = Bun.spawn(
    ["aws", "s3api", "head-object", "--bucket", bucket, "--key", key],
    { stdout: "ignore", stderr: "ignore" },
  );
  const exitCode = await proc.exited;
  return exitCode === 0;
}

/** @type {(key: string, newName: string) => Promise<void>} */
export async function renameVideo(key, newName) {
  const type = key.split("/")[0];
  const originalName = key.split("/").pop();
  const originalExt = originalName.includes(".")
    ? "." + originalName.split(".").pop()
    : "";
  const newExt = newName.includes(".") ? "." + newName.split(".").pop() : "";
  const finalName = newExt ? newName : newName + originalExt;
  const newKey = `${type}/${finalName}`;
  if (await s3KeyExists(newKey)) {
    throw new Error(`A file named "${finalName}" already exists.`);
  }
  const bucket = config.bucket;
  await runCommand([
    "sh",
    "-c",
    `aws s3 cp "s3://${bucket}/${key}" "s3://${bucket}/${newKey}" && aws s3 rm "s3://${bucket}/${key}"`,
  ]);
}

/** @type {() => Promise<string>} */
export async function pickFile() {
  if (config.filePickerCommand) {
    const result = await runCommand(["sh", "-c", config.filePickerCommand]);
    return result.trim();
  }
  if (isMac) {
    const alias = await runCommand([
      "osascript",
      "-e",
      'POSIX path of (choose file with prompt "Select video to upload")',
    ]);
    return alias.trim();
  }
  return await runCommand([
    "zenity",
    "--file-selection",
    "--title=Select video to upload",
  ]);
}

/** @type {(filePath: string, options?: { permanent?: boolean }) => Promise<void>} */
export async function uploadVideo(filePath, options = {}) {
  const filename = filePath.split("/").pop();
  const bucket = config.bucket;
  const prefix = options.permanent ? "permanent" : "expires";
  const targetKey = `${prefix}/${filename}`;
  if (await s3KeyExists(targetKey)) {
    throw new Error(`A file named "${filename}" already exists.`);
  }
  await runCommand([
    "sh",
    "-c",
    `aws s3 cp "${filePath}" "s3://${bucket}/${targetKey}"`,
  ]);
}

/** @type {(key: string) => Promise<void>} */
export async function deleteVideo(key) {
  const bucket = config.bucket;
  await runCommand(["sh", "-c", `aws s3 rm "s3://${bucket}/${key}"`]);
}

/** @type {(key: string) => Promise<void>} */
export async function toggleVideoPermanence(key) {
  const isPermanent = key.startsWith("permanent");
  const newType = isPermanent ? "expires" : "permanent";
  const filename = key.split("/").slice(1).join("/");
  const newKey = `${newType}/${filename}`;
  const bucket = config.bucket;
  await runCommand([
    "sh",
    "-c",
    `aws s3 cp "s3://${bucket}/${key}" "s3://${bucket}/${newKey}" && aws s3 rm "s3://${bucket}/${key}"`,
  ]);
}

/** @type {(offset?: number, count?: number) => Promise<any[]>} */
export async function getRecentVideos(offset = 0, count = config.pageSize) {
  try {
    const slice =
      offset === 0 ? `[-${count}:]` : `[-${offset + count}:-${offset}]`;
    const videoResponse = await runCommand([
      "sh",
      "-c",
      `set -o pipefail; aws s3api list-objects-v2 --bucket ${config.bucket} --query 'sort_by(Contents[?LastModified], &LastModified)${slice}.[Key, LastModified, Size]' --output text | tac`,
    ]);
    const videoListLines = videoResponse
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const [key, date, size] = line.split("\t");
        const name = key.split("/").pop();
        const isPermanent = key.startsWith("permanent");
        const permanent = isPermanent ? "✔" : "";
        const sizeMB = (parseInt(size) / (1024 * 1024)).toFixed(2) + " MB";
        const displayDate = new Date(date).toLocaleString().replace(",", "");
        return { name, permanent, key, date, displayDate, size: sizeMB };
      });
    return videoListLines;
  } catch (err) {
    // log("getRecentVideos error:", err.message);
    throw err;
  }
}

/** @type {(command: string[]) => Promise<string>} */
async function runCommand(command) {
  try {
    const proc = Bun.spawn(command, {
      stdout: "pipe",
      stderr: "pipe",
    });

    const [stdout, stderr] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
    ]);

    const exitCode = await proc.exited;
    if (exitCode !== 0) {
      throw new Error(commandErrorToString(stderr));
    }

    return stdout ? stdout.trim() : stdout;
  } catch (err) {
    throw err;
  }
}

/** @type {(errorMessage: string) => string} */
function commandErrorToString(errorMessage) {
  if (errorMessage.includes("Error: ")) {
    return errorMessage.split("Error: ")[1].trim();
  } else {
    return errorMessage.trim();
  }
}

const THUMB_DIR = '/tmp/castui-thumbs';

function hasCommand(cmd) {
  return Bun.spawnSync(['which', cmd]).exitCode === 0;
}

/** Returns a shell command string to display an image at the given path, or null if unsupported */
export function getImageDisplayCmd(imagePath) {
  const safe = JSON.stringify(imagePath);
  if (process.env.KITTY_WINDOW_ID || process.env.TERM === 'xterm-kitty') {
    if (hasCommand('kitten')) return `kitten icat --align center ${safe}`;
  }
  if (process.env.TERM_PROGRAM === 'iTerm.app') {
    if (hasCommand('imgcat')) return `imgcat ${safe}`;
  }
  if (hasCommand('chafa')) return `chafa --align center ${safe}`;
  return null;
}

/** @type {(key: string) => Promise<string|null>} */
export async function generateThumbnail(key) {
  if (!existsSync(THUMB_DIR)) mkdirSync(THUMB_DIR, { recursive: true });
  const safeKey = key.replace(/\//g, '_');
  const thumbPath = `${THUMB_DIR}/${safeKey}.jpg`;
  if (!existsSync(thumbPath)) {
    const url = `https://${config.baseAwsUrl}/${key}`;
    const proc = Bun.spawn([
      'ffmpeg',
      '-probesize', '500000',
      '-analyzeduration', '500000',
      '-fflags', '+discardcorrupt+nobuffer',
      '-ss', '1',
      '-i', url,
      '-vframes', '1',
      '-q:v', '8',
      '-y', thumbPath,
    ], { stdout: 'ignore', stderr: 'ignore' });
    const exitCode = await proc.exited;
    if (exitCode !== 0) return null;
  }
  return thumbPath;
}
