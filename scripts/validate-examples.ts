import { readFile } from "node:fs/promises";
import { readdirSync } from "node:fs";
import Ajv from "ajv";

const schema = JSON.parse(await readFile(new URL("../schemas/data-model-v0.0.2.schema.json", import.meta.url), "utf8"));
const ajv = new Ajv({ allErrors: true, strict: false });
const validate = ajv.compile(schema);
const examplesDir = new URL("../examples/", import.meta.url);

let failures = 0;
for (const file of readdirSync(examplesDir).filter((name) => name.endsWith(".json"))) {
  const value = JSON.parse(await readFile(new URL(file, examplesDir), "utf8"));
  if (!validate(value)) {
    failures += 1;
    console.error(`${file} failed validation`);
    console.error(validate.errors);
  }
}

if (failures > 0) {
  process.exit(1);
}

console.log("Example validation passed.");
