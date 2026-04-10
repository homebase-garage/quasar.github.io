/**
 * Escape a string to then be supplied
 * to new RegExp()
 */
module.exports.escapeRegexString = function escapeRegexString(str) {
  return str
    .replaceAll(/[|\\{}()[\]^$+*?.]/g, String.raw`\$&`)
    .replaceAll('-', String.raw`\x2d`)
}
