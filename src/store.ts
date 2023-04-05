import fse from "fs-extra";
import { zip } from "zip-a-folder";
import root from "../package.json";
import extension from "../store/extension.json";

export async function main() {
  const ext = {
    ...extension,
    title: root.name,
    version: root.version,
    framework: { ...extension.framework, version: root.dependencies["gnode-api"].replace("^", "") },
  };

  try {
    await fse.writeJson("store/extension.json", ext);
    await fse.copy("dist", "store");
    await fse.remove("store/extension.zip");
    await zip("store", "extension.zip");
    await fse.move("extension.zip", "store/extension.zip");
    console.log("Successfully created!");
  } catch (err) {
    if (err instanceof Error) {
      console.error(err.message);
    }
    console.log("Error while creating!");
  }
}

main().catch((err) => console.log(err));
