import { createScreen } from "./screen";
import { asyncTimeout } from "./utils/utils";
import { containerBox } from "./ui/layout";
import { createHint, showHelp } from "./modules/hints";
import { listUi } from "./ui/listTable";
import {
  registerVideoUi,
  loadVideos,
  loadMoreVideos,
  getVideoByIndex,
  getDisplayedCount,
  getTotalCount,
  getPageSize,
  setFilter,
} from "./modules/videos";
import { viewVideo, copyVideoUrl, generateThumbnail, getImageDisplayCmd, toggleVideoPermanence, uploadVideo, pickFile } from "./commands";
import { renameDialog } from "./modules/rename-dialog";
import { deleteDialog } from "./modules/delete-dialog";
import { confirmDialog } from "./modules/confirm-dialog";
import { registerNavigation, saveRowPositions } from "./navigation";
import { messageUi } from "./ui/message";
import { startLoader } from "./ui/loading";
import reblessed from "../external-dependencies/reblessed";

/** @typedef {import('../types/blessed.d.ts').BlessedElement} BlessedElement */

export async function initialize() {
  const screen = createScreen();

  // hints
  const hintContainer = createHint();
  screen.append(hintContainer);

  // videos list
  const videosContainer = containerBox({
    title: "Recent Videos",
    top: 0,
    bottom: hintContainer.height,
  });
  screen.append(videosContainer);
  const renderedVideosUi = listUi(videosContainer, {
    name: "focus-videos",
  });

  screen.render();

  registerVideoUi(renderedVideosUi);
  renderedVideosUi.focus();

  // Filter bar
  let filterText = '';
  let filterActive = false;
  let enterSuppressed = false;
  const blessed = /** @type {any} */ (reblessed);
  const filterBar = blessed.text({
    parent: screen,
    bottom: 0,
    left: 0,
    height: 1,
    width: "shrink",
    tags: true,
    hidden: true,
    style: { fg: "yellow" },
  });

  function showFilterBar() {
    filterActive = true;
    filterBar.setContent(`{bold}filter:{/bold} ${filterText}_`);
    filterBar.show();
    screen.render();
  }

  function updateFilterBar() {
    filterBar.setContent(`{bold}filter:{/bold} ${filterText}_`);
    screen.render();
  }

  function hideFilterBar() {
    filterActive = false;
    filterBar.hide();
    screen.render();
  }

  function hideAllChildren() {
    screen.children.forEach((el) => el.hide());
  }

  function showAllChildren() {
    screen.children.forEach((el) => el.show());
    // Restore filterBar to its correct visibility
    if (!filterBar.visible && filterText) {
      filterBar.show();
    } else if (filterBar.visible && !filterText) {
      filterBar.hide();
    }
  }

  function dialogClosed() {
    // Briefly suppress key propagation so the enter/esc that closed the dialog
    // doesn't leak into renderedVideosUi handlers
    screen.grabKeys = true;
    setTimeout(() => { screen.grabKeys = false; }, 0);
  }

  let moreNotice = null;

  renderedVideosUi.on("select item", function () {
    if (filterActive || filterBar.visible) {
      if (moreNotice) { moreNotice.destroy(); moreNotice = null; screen.render(); }
      return;
    }
    const index = renderedVideosUi.selected;
    const total = getTotalCount();
    const hasMore = total > 0 && total % getPageSize() === 0;
    const isLast = index === getDisplayedCount();
    if (isLast && hasMore) {
      if (!moreNotice) {
        moreNotice = messageUi(screen, {
          top: /** @type {number} */ (screen.height) - 1,
          left: 0,
          right: 0,
          height: "shrink",
          content: 'Press "m" for more',
        });
        screen.render();
      }
    } else if (moreNotice) {
      moreNotice.destroy();
      moreNotice = null;
      screen.render();
    }
  });

  renderedVideosUi.key(["/"], function () {
    filterText = '';
    setFilter('');
    showFilterBar();
  });

  renderedVideosUi.key(["escape"], function () {
    if (!filterBar.visible) return;
    filterText = '';
    filterActive = false;
    setFilter('');
    hideFilterBar();
  });

  screen.on("keypress", (ch, key) => {
    if (!filterActive) return;
    if (screen.focused !== renderedVideosUi) return;

    if (key.name === "enter" || key.name === "return") {
      // Defer clearing filterActive so element key handlers still see it as true
      setTimeout(() => {
        filterActive = false;
        filterBar.setContent(`{bold}filter:{/bold} ${filterText}`);
        if (!filterText) hideFilterBar();
        screen.render();
      }, 0);
      screen.grabKeys = true;
      setTimeout(() => { screen.grabKeys = false; }, 0);
      return;
    }

    if (key.name === "escape") {
      filterText = '';
      setFilter('');
      hideFilterBar();
      return;
    }

    if (key.name === "backspace") {
      filterText = filterText.slice(0, -1);
    } else if (ch && !key.ctrl && !key.meta) {
      filterText += ch;
    }

    setFilter(filterText);
    updateFilterBar();
  });

  registerNavigation(screen, [renderedVideosUi]);

  screen.key(["?"], (ch, key) => {
    showHelp();
  });

  screen.key(["C-r"], async function () {
    await refresh(500);
  });

  renderedVideosUi.key(["C-r"], async function () {
    if (filterActive) return;
    await refresh(500);
  });

  renderedVideosUi.key(["d"], function () {
    if (filterActive) return;
    const index = renderedVideosUi.selected;
    const video = getVideoByIndex(index);
    if (!video) return;
    hideAllChildren();
    enterSuppressed = true;
    deleteDialog(screen, video, (submitted) => {
      showAllChildren();
      dialogClosed();
      setTimeout(() => { enterSuppressed = false; }, 0);
      if (submitted) reloadVideos();
      renderedVideosUi.focus();
      screen.render();
    });
  });

  renderedVideosUi.key(["r"], function () {
    if (filterActive) return;
    const index = renderedVideosUi.selected;
    const video = getVideoByIndex(index);
    if (!video) return;
    hideAllChildren();
    enterSuppressed = true;
    renameDialog(screen, video, (submitted) => {
      showAllChildren();
      dialogClosed();
      setTimeout(() => { enterSuppressed = false; }, 0);
      if (submitted) reloadVideos();
      renderedVideosUi.focus();
      screen.render();
    });
  });

  renderedVideosUi.key(["u"], async function () {
    if (filterActive) return;
    let message;
    try {
      const filePath = await pickFile(); // opens zenity, waits for user
      message = messageUi(screen, {
        top: /** @type {number} */ (screen.height) - 1,
        left: 0,
        right: 0,
        height: "shrink",
        content: "Uploading...",
        loader: true,
      });
      screen.render();
      await uploadVideo(filePath);
      await reloadVideos();
    } catch (err) {
      if (message) { message.destroy(); message = null; }
      const error = /** @type {Error} */ (err);
      if (error.message) {
        const errMsg = messageUi(screen, {
          top: /** @type {number} */ (screen.height) - 1,
          left: 0,
          right: 0,
          height: "shrink",
          content: error.message,
        });
        setTimeout(() => { errMsg.destroy(); screen.render(); }, 4000);
        screen.render();
      }
    }
    if (message) {
      message.destroy();
      screen.render();
    }
  });

  renderedVideosUi.key(["m"], async function () {
    if (filterActive) return;
    saveRowPositions([renderedVideosUi]);
    const message = messageUi(screen, {
      top: /** @type {number} */ (screen.height) - 1,
      left: 0,
      right: 0,
      height: "shrink",
      content: "Loading more...",
      loader: true,
    });
    screen.render();
    try {
      await loadMoreVideos();
    } catch (err) {
      // ignore
    }
    message.destroy();
    screen.render();
  });

  renderedVideosUi.key(["v"], function () {
    if (filterActive) return;
    const index = renderedVideosUi.selected;
    const video = getVideoByIndex(index);
    if (video) {
      viewVideo(video.key);
    }
  });

  renderedVideosUi.key(["enter", "return"], async function () {
    if (filterActive || enterSuppressed) return;
    enterSuppressed = true;
    const index = renderedVideosUi.selected;
    const video = getVideoByIndex(index);
    if (!video) { enterSuppressed = false; return; }

    // Show loading indicator while generating thumbnail
    const message = messageUi(screen, {
      top: /** @type {number} */ (screen.height) - 1,
      left: 0,
      right: 0,
      height: "shrink",
      content: "Loading preview...",
      loader: true,
    });
    screen.render();

    const thumbPath = await generateThumbnail(video.key);
    message.destroy();

    if (!thumbPath) {
      const err = messageUi(screen, {
        top: /** @type {number} */ (screen.height) - 1,
        left: 0,
        right: 0,
        height: "shrink",
        content: "Failed to generate preview",
      });
      setTimeout(() => { err.destroy(); screen.render(); }, 2000);
      screen.render();
      enterSuppressed = false;
      return;
    }

    // Suspend TUI, display image, wait for keypress, restore
    const resumeProgram = screen.program.pause();

    const permanentLabel = video.permanent ? "  |  \u2714 Permanent" : "";
    const details = `${video.name}  |  ${video.displayDate}  |  ${video.size}${permanentLabel}`;

    const imageCmd = getImageDisplayCmd(thumbPath);
    const imageSection = imageCmd ? `${imageCmd} && ` : '';

    // Run image display and keypress wait in a single subprocess with full terminal control
    Bun.spawnSync([
      "sh", "-c",
      `clear && printf "\\n  ${details}\\n\\n" && ${imageSection}printf "\\nPress any key to return..." && stty raw -echo && dd bs=1 count=1 >/dev/null 2>&1; stty sane`,
    ], { stdin: "inherit", stdout: "inherit", stderr: "inherit" });

    resumeProgram();
    screen.program.hideCursor();
    screen.program.emit("resize");
    screen.render();
    setTimeout(() => { enterSuppressed = false; }, 200);
  });

  renderedVideosUi.key(["c"], function () {
    if (filterActive) return;
    const index = renderedVideosUi.selected;
    const video = getVideoByIndex(index);
    if (video) {
      copyVideoUrl(video.key);
      const notice = messageUi(screen, {
        top: /** @type {number} */ (screen.height) - 1,
        left: 0,
        right: 0,
        height: "shrink",
        content: "Link copied to clipboard",
      });
      setTimeout(() => notice.destroy(), 2000);
      screen.render();
    }
  });

  renderedVideosUi.key(["p"], async function () {
    if (filterActive) return;
    const index = renderedVideosUi.selected;
    const video = getVideoByIndex(index);
    if (!video) return;
    const isPermanent = video.key.startsWith("permanent");

    const doToggle = async () => {
      const message = messageUi(screen, {
        top: /** @type {number} */ (screen.height) - 1,
        left: 0,
        right: 0,
        height: "shrink",
        content: isPermanent ? "Moving to expires..." : "Moving to permanent...",
        loader: true,
      });
      screen.render();
      try {
        await toggleVideoPermanence(video.key);
        await reloadVideos();
      } catch (err) {
        // ignore
      }
      message.destroy();
      screen.render();
    };

    if (isPermanent) {
      hideAllChildren();
      enterSuppressed = true;
      confirmDialog(screen, {
        title: "Remove Permanent",
        message: "Are you sure you would like to\nchange this video to expire?",
        confirmLabel: "Change",
      }, async (confirmed) => {
        showAllChildren();
        dialogClosed();
        setTimeout(() => { enterSuppressed = false; }, 0);
        renderedVideosUi.focus();
        if (confirmed) await doToggle();
        screen.render();
      });
    } else {
      await doToggle();
    }
  });

  // Populate ui with data
  const loader = startLoader(renderedVideosUi, "Loading videos...");
  await reloadVideos();
  loader();

  // Private functions
  async function reloadVideos() {
    saveRowPositions([renderedVideosUi]);
    try {
      return await loadVideos();
    } catch (err) {
      return [];
    }
  }

  async function refresh(delay) {
    const message = messageUi(screen, {
      top: /** @type {number} */ (screen.height) - 1,
      left: 0,
      right: 0,
      height: "shrink",
      content: "Refreshing...",
      loader: true,
    });
    screen.render();
    if (delay) {
      await asyncTimeout(delay);
    }
    await reloadVideos();
    message.destroy();
    screen.render();
  }
}
