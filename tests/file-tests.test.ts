import { describe, test } from "vitest"
import { fileTests } from "@lezer/generator/dist/test"
import { parser } from "../src/parser/bslParser"

import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"

const caseDir = path.dirname(fileURLToPath(import.meta.url))

// Включаем диалект comments для парсера
const parserWithComments = parser.configure({ dialect: "comments" })

describe("file-tests", () => {
  for (const file of fs.readdirSync(caseDir)) {
    if (!/\.txt$/.test(file)) continue

    const suiteName = /^[^.]*/.exec(file)?.[0] ?? file
    const content = fs.readFileSync(path.join(caseDir, file), "utf8")

    describe(suiteName, () => {
      for (const { name, run } of fileTests(content, file)) {
        test(name, () => run(parserWithComments))
      }
    })
  }

})