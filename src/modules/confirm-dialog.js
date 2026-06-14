import { getScreen } from "../screen.js";
import { formUi } from "../ui/form.js";
import { buttonUi } from "../ui/button.js";
import reblessed from "../../external-dependencies/reblessed";

/** @typedef {import('../../types/blessed.d.ts').BlessedElement} BlessedElement */

const blessed = /** @type {any} */ (reblessed);

/** @type {(container: BlessedElement, options: {title: string, message: string, confirmLabel?: string, onDestroy: Function}) => void} */
export function confirmDialog(container, options, onDestroy) {
  const screen = getScreen();

  const form = formUi(container, {
    title: options.title,
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
    content: options.message,
    style: { fg: "white" },
  });

  const confirmButton = buttonUi(form, {
    name: "confirm",
    content: options.confirmLabel ?? "Confirm",
    top: 6,
    right: 1,
    width: 12,
    color: "red",
  });

  const cancelButton = buttonUi(form, {
    name: "cancel",
    content: "Cancel",
    top: 6,
    right: 14,
    width: 10,
    color: "green",
  });

  cancelButton.focus();

  confirmButton.on("press", () => destroy(true));
  cancelButton.on("press", () => destroy());

  form.key(["escape"], () => destroy());
  form.key(["enter"], () => {
    if (screen.focused === confirmButton) destroy(true);
    else destroy();
  });
  form.key(["tab"], () => {
    if (screen.focused === cancelButton) confirmButton.focus();
    else cancelButton.focus();
    screen.render();
  });

  /** @type {(confirmed?: boolean) => void} */
  function destroy(confirmed) {
    form.destroy();
    if (onDestroy) onDestroy(confirmed);
    screen.render();
  }
}
