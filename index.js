import { initialize } from "./src/app";
import { reportVersion } from "./src/system/report-version";
import { help } from "./src/system/help";
import { uploadVideo, copyVideoUrl, pickFile } from "./src/commands";
import { existsSync } from "fs";

run();

/** @type {() => void} */
function run() {
  const { command, uploadPath, permanent, clipboard, interactive } =
    processArgs();
  switch (command) {
    case "--version":
      reportVersion();
      return;
    case "--help":
      help();
      return;
    case "--upload":
      cliUpload(uploadPath, permanent, clipboard, interactive);
      return;
    default:
      initialize();
      return;
  }
}

/** @type {(filePath: string, permanent: boolean, clipboard: boolean, interactive: boolean) => Promise<void>} */
async function cliUpload(filePath, permanent, clipboard, interactive) {
  if (interactive && !filePath) {
    filePath = await pickFile();
    if (!filePath) {
      console.error("Error: no file selected");
      process.exit(1);
    }
  }
  if (!filePath) {
    console.error("Error: --upload requires a file path");
    process.exit(1);
  }
  if (!existsSync(filePath)) {
    console.error(`Error: file not found: ${filePath}`);
    process.exit(1);
  }
  const filename = filePath.split("/").pop();
  console.log(`Uploading "${filename}"${permanent ? " (permanent)" : ""}...`);
  try {
    const key = await uploadVideo(filePath, { permanent });
    console.log("Upload complete.");
    if (clipboard) {
      copyVideoUrl(key);
      console.log("Playback URL copied to clipboard.");
    }
  } catch (err) {
    console.error(`Upload failed: ${err.message}`);
    process.exit(1);
  }
}

/** @type {() => { command: string, uploadPath: string, permanent: boolean, clipboard: boolean, interactive: boolean }} */
function processArgs() {
  const args = process.argv.slice(2);
  const firstArg = parseCommand(args[0]);

  let uploadPath = "";
  let permanent = false;
  let clipboard = false;
  let interactive = false;

  for (let i = 0; i < args.length; i++) {
    const arg = parseCommand(args[i]);
    if (arg === "--upload") {
      const next = args[i + 1];
      if (next && !next.startsWith("-")) {
        uploadPath = next;
        i++;
      }
    } else if (arg === "--permanent") {
      permanent = true;
    } else if (arg === "--clipboard") {
      clipboard = true;
    } else if (arg === "--interactive") {
      interactive = true;
    }
  }

  const command = firstArg;
  return { command, uploadPath, permanent, clipboard, interactive };
}

/** @type {(command?: string) => string} */
function parseCommand(command) {
  if (!command) {
    return "";
  }

  const shortMap = new Map();
  shortMap.set("-v", "--version");
  shortMap.set("-h", "--help");
  shortMap.set("-u", "--upload");
  shortMap.set("-p", "--permanent");
  shortMap.set("-c", "--clipboard");
  shortMap.set("-i", "--interactive");

  const short = shortMap.get(command);
  return short ? short : command;
}
