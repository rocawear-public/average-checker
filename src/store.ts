import { copy, writeJson } from "fs-extra";
import { zip } from "zip-a-folder";
import root from "../package.json";
import extension from "../store/extension.json";

export async function main() {
  const ext = {
    ...extension,
    title: root.name,
    description: root.description,
    version: root.version,
    updateDate: "",
  };

  try {
    await writeJson("./store/extension.json", ext);
    await copy("dist", "store");
    await zip("store", "./store/extension.zip");
    console.log("Successfully created!");
  } catch (err) {
    if (err instanceof Error) {
      console.error(err.message);
    }
    console.log("Error while creating!");
  }
}

main().catch((err) => console.log(err));
