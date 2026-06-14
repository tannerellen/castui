import { initialize } from "./src/app";
import { reportVersion } from "./src/system/report-version";
import { help } from "./src/system/help";
import { uploadVideo } from "./src/commands";
import { existsSync } from "fs";

run();

/** @type {() => void} */
function run() {
  const { command, uploadPath, permanent } = processArgs();
  switch (command) {
    case "--version":
      reportVersion();
      return;
    case "--help":
      help();
      return;
    case "--upload":
      cliUpload(uploadPath, permanent);
      return;
    default:
      initialize();
      return;
  }
}

/** @type {(filePath: string, permanent: boolean) => Promise<void>} */
async function cliUpload(filePath, permanent) {
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
    await uploadVideo(filePath, { permanent });
    console.log("Upload complete.");
  } catch (err) {
    console.error(`Upload failed: ${err.message}`);
    process.exit(1);
  }
}

/** @type {() => { command: string, uploadPath: string, permanent: boolean }} */
function processArgs() {
  const args = process.argv.slice(2);
  const firstArg = parseCommand(args[0]);

  let uploadPath = "";
  let permanent = false;

  for (let i = 0; i < args.length; i++) {
    const arg = parseCommand(args[i]);
    if (arg === "--upload") {
      uploadPath = args[i + 1] || "";
      i++;
    } else if (arg === "--permanent") {
      permanent = true;
    }
  }

  const command = firstArg === "--upload" ? "--upload" : firstArg;
  return { command, uploadPath, permanent };
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

  const short = shortMap.get(command);
  return short ? short : command;
}
