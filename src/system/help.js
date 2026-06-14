/** @type {() => void} */
export function help() {
  console.log("");
  console.log("Castui - TUI AWS video upload management");

  console.log("");
  console.log("SYNOPSIS");
  console.log(`	castui [OPTION]`);

  console.log("");
  console.log("DESCRIPTION");
  console.log(
    "	Manage your videos uploaded to AWS. Launch without options to use the app.",
  );

  console.log("");
  console.log("OPTIONS");
  console.log("	-h, --help		Display this help and exit");
  console.log("	-v, --version		Output version information and exit");

  console.log("");
  console.log("EXAMPLES");
  console.log("	Launch interface:	castui");
  console.log("	Show help:		castui -h");
  console.log("	Show version:		castui -v");
  console.log("");
}
