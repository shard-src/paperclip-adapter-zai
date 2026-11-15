import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { parseStdoutLine } = require("../ui-parser.cjs");

export { parseStdoutLine };
export const parseZaiStdoutLine = parseStdoutLine;