import { getScreen } from "../screen.js";
import { deleteVideo } from "../commands.js";
import { formUi } from "../ui/form.js";
import { buttonUi } from "../ui/button.js";
import { messageUi } from "../ui/message.js";
import { registerNavigation } from "../navigation.js";
import reblessed from "../../external-dependencies/reblessed";

/** @typedef {import('../../types/blessed.d.ts').BlessedElement} BlessedElement */

const blessed = /** @type {any} */ (reblessed);

/** @type {(container: BlessedElement, video: {key: string, name: string}, onDestroy: Function) => void} */
export function deleteDialog(container, video, onDestroy) {
  const screen = getScreen();

  /** @type {BlessedElement} */
  let errorMessage;

  const form = formUi(container, {
    title: "Delete Video",
    width: 60,
    height: 11,
  });

  blessed.text({
    parent: form,
    top: 2,
    left: 0,
    right: 0,
    height: 2,
    tags: true,
    content: `Are you sure you want to delete\n{bold}${video.name}{/bold}?`,
    style: { fg: "white" },
  });

  const deleteButton = buttonUi(form, {
    name: "delete",
    content: "Delete",
    top: 6,
    right: 1,
    width: 10,
    color: "red",
  });

  const cancelButton = buttonUi(form, {
    name: "cancel",
    content: "Cancel",
    top: 6,
    right: 12,
    width: 10,
    color: "green",
  });

  cancelButton.focus();

  registerNavigation(
    form,
    [cancelButton, deleteButton],
    (/** @type {BlessedElement} */ element) => {
      if (element === deleteButton) {
        form.submit();
      } else {
        destroy();
      }
    },
    () => destroy(),
  );

  form.on("submit", async () => {
    if (errorMessage) errorMessage.destroy();
    deleteButton.hide();
    cancelButton.hide();
    const loadingMessage = messageUi(form, {
      top: /** @type {number} */ (deleteButton.top) - 2,
      left: 0,
      right: 0,
      height: "shrink",
      content: "Deleting...",
      loader: true,
    });
    screen.render();

    try {
      await deleteVideo(video.key);
      destroy(true);
    } catch (err) {
      const error = /** @type {Error} */ (err);
      loadingMessage.destroy();
      deleteButton.show();
      cancelButton.show();
      errorMessage = messageUi(screen, {
        top:
          /** @type {number} */ (form.top) +
          /** @type {number} */ (form.height),
        left: form.left,
        width: form.width,
        height: "shrink",
        content: error.message,
      });
      cancelButton.focus();
      screen.render();
    }
  });

  deleteButton.on("press", () => form.submit());
  cancelButton.on("press", () => destroy());

  /** @type {(submitted?: boolean) => void} */
  function destroy(submitted) {
    if (errorMessage) errorMessage.destroy();
    form.destroy();
    if (onDestroy) onDestroy(submitted);
    screen.render();
  }
}
