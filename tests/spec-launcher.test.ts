import { describe, test } from "vitest"
import { fileTests } from "@lezer/generator/dist/test"
import { parser } from "../src/bslParser"

import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"

const caseDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "spec")

for (const file of fs.readdirSync(caseDir)) {
  if (!/\.txt$/.test(file)) continue

  const content = fs.readFileSync(path.join(caseDir, file), "utf8")

  describe(file, () => {
    for (const { name, run } of fileTests(content, file)) {
      test(name, () => run(parser))
    }
  })
}
