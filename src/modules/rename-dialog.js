import { getScreen } from "../screen.js";
import { renameVideo } from "../commands.js";
import { formUi } from "../ui/form.js";
import { inputUi } from "../ui/input.js";
import { buttonUi } from "../ui/button.js";
import { messageUi } from "../ui/message.js";
import { registerNavigation } from "../navigation.js";
import reblessed from "../../external-dependencies/reblessed";

/** @typedef {import('../../types/blessed.d.ts').BlessedElement} BlessedElement */

const blessed = /** @type {any} */ (reblessed);

/** @type {(container: BlessedElement, video: {key: string, name: string}, onDestroy: Function) => void} */
export function renameDialog(container, video, onDestroy) {
  const screen = getScreen();

  /** @type {BlessedElement} */
  let errorMessage;

  const form = formUi(container, {
    title: "Rename Video",
    width: 60,
    height: 16,
  });

  blessed.text({
    parent: form,
    top: 2,
    left: 0,
    right: 0,
    height: 1,
    tags: true,
    content: `Current: {bold}${video.name}{/bold}`,
    style: { fg: "white" },
  });

  const nameInput = inputUi(form, {
    name: "name",
    label: "New Name",
    top: 4,
  });

  nameInput.setValue('');

  const okButton = buttonUi(form, {
    name: "ok",
    content: "OK",
    top: 11,
    right: 1,
    width: 10,
    color: "green",
  });

  const cancelButton = buttonUi(form, {
    name: "cancel",
    content: "Cancel",
    top: 11,
    right: 12,
    width: 10,
    color: "red",
  });

  form.focusNext();

  registerNavigation(
    form,
    [nameInput, okButton, cancelButton],
    (/** @type {BlessedElement} */ element) => {
      if (element === cancelButton) {
        destroy();
      } else {
        form.submit();
      }
    },
    () => destroy(),
  );

  form.on("submit", async (/** @type {{name: string}} */ data) => {
    if (errorMessage) errorMessage.destroy();
    const newName = data.name?.trim();
    if (!newName) return;

    okButton.hide();
    cancelButton.hide();
    const loadingMessage = messageUi(form, {
      top: /** @type {number} */ (okButton.top) - 2,
      left: 0,
      right: 0,
      height: "shrink",
      content: "Renaming...",
      loader: true,
    });
    screen.render();

    try {
      await renameVideo(video.key, newName);
      destroy(true);
    } catch (err) {
      const error = /** @type {Error} */ (err);
      loadingMessage.destroy();
      okButton.show();
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
      nameInput.focus();
      screen.render();
    }
  });

  okButton.on("press", () => form.submit());
  cancelButton.on("press", () => destroy());

  /** @type {(submitted?: boolean) => void} */
  function destroy(submitted) {
    if (errorMessage) errorMessage.destroy();
    form.destroy();
    if (onDestroy) onDestroy(submitted);
    screen.render();
  }
}
