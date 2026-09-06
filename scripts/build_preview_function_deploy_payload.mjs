import { readFile, writeFile } from "node:fs/promises";

const sourcePath = new URL("../supabase/functions/generate-resource-preview/index.ts", import.meta.url);
const outputPath = new URL("../.tmp-generate-resource-preview-deploy.json", import.meta.url);
const content = await readFile(sourcePath, "utf8");

await writeFile(
  outputPath,
  JSON.stringify({
    project_id: "khsanicntfagqjhcdwqs",
    name: "generate-resource-preview",
    verify_jwt: true,
    entrypoint_path: "index.ts",
    files: [{ name: "index.ts", content }],
  }),
);
