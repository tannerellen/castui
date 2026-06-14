import { getScreen } from "../screen";
import { getRecentVideos } from "../commands";
import { listUpdate } from "../ui/listTable";
import { restoreRowPositions } from "../navigation";
import { config } from "../config/config";

/** @typedef {import('../../types/blessed.d.ts').BlessedElement} BlessedElement */

const PAGE_SIZE = config.pageSize;

/** @type {BlessedElement} */
let videosUi;

/** @type {any[]} */
let videoList = [];

/** @type {any[]} */
let displayedList = [];

/** @type {number} */
let videoOffset = 0;

/** @type {string} */
let currentFilter = '';

/** @type {(renderedVideosUi: BlessedElement) => void} */
export function registerVideoUi(renderedVideosUi) {
  videosUi = renderedVideosUi;
}

/** @type {(index: number) => any} */
export function getDisplayedCount() {
  return displayedList.length;
}

export function getTotalCount() {
  return videoList.length;
}

export function getPageSize() {
  return PAGE_SIZE;
}

export function getVideoByIndex(index) {
  return displayedList[index - 1]; // offset by 1 to account for header row
}

/** @type {(text: string) => void} */
export function setFilter(text) {
  currentFilter = text;
  updateVideoList(videoList);
}

/** @type {() => Promise<any[]>} */
export async function loadVideos() {
  const reloadCount = Math.max(PAGE_SIZE, videoList.length);
  videoOffset = reloadCount - PAGE_SIZE;
  const videos = await getRecentVideos(0, reloadCount);
  videoList = videos;
  updateVideoList(videos);
  return videos;
}

/** @type {() => Promise<any[]>} */
export async function loadMoreVideos() {
  videoOffset += PAGE_SIZE;
  const moreVideos = await getRecentVideos(videoOffset);
  videoList = [...videoList, ...moreVideos];
  updateVideoList(videoList);
  return videoList;
}

/** @type {(videos: any[]) => void} */
function updateVideoList(videos) {
  const screen = getScreen();
  const lower = currentFilter.toLowerCase();
  displayedList = currentFilter
    ? videos.filter((v) => v.name.toLowerCase().includes(lower))
    : videos;
  listUpdate(videosUi, displayedList, [
    { label: "Name", key: "name" },
    { label: "Date", key: "displayDate" },
    { label: "Size", key: "size" },
    { label: "Permanent", key: "permanent" },
  ]);
  restoreRowPositions();
  screen.render();
}
