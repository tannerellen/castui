import { readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";

/**
 * @typedef {Object} CastuiFileConfig
 * @property {{ bucket: string, region: string }} [aws]
 * @property {string} [watchUrl]
 * @property {string} [includeTypeInUrl]
 * @property {number} [pageSize]
 * @property {string} [filePickerCommand]
 * @property {{ autoplay: boolean }} [playback]
 */

const CONFIG_PATH = join(homedir(), ".config", "castui", "config.json");

/** @type {CastuiFileConfig} */
let fileConfig = {};
try {
  fileConfig = JSON.parse(readFileSync(CONFIG_PATH, "utf8"));
} catch (err) {
  const isNotFound =
    /** @type {NodeJS.ErrnoException} */ (err).code === "ENOENT";
  if (isNotFound) {
    console.error(`Error: Config file not found at ${CONFIG_PATH}`);
    console.error(`Create it with the following format:`);
    console.error(
      JSON.stringify(
        {
          aws: { bucket: "your-bucket", region: "us-west-1" },
          watchUrl: "videos.example.com",
          pageSize: 50,
        },
        null,
        2,
      ),
    );
  } else {
    console.error(
      `Error reading config file: ${/** @type {Error} */ (err).message}`,
    );
  }
  process.exit(1);
}

const bucket = fileConfig.aws?.bucket ?? "";
const region = fileConfig.aws?.region ?? "";

export const config = {
  bucket,
  baseAwsUrl: `${bucket}.s3.${region}.amazonaws.com`,
  baseWatchUrl: fileConfig.watchUrl ?? "",
  includeTypeInUrl: fileConfig.includeTypeInUrl ?? false,
  pageSize: fileConfig.pageSize ?? 50,
  /** @type {string | null} */
  filePickerCommand: fileConfig.filePickerCommand ?? null,
  autoplay: fileConfig.playback?.autoplay ?? false,
};
