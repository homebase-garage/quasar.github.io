module.exports = function exports(content) {
  if (content.includes('$')) {
    const { prefix } = this.getOptions()

    const useIndex = Math.max(
      content.lastIndexOf('@use '),
      content.lastIndexOf('@forward ')
    )

    if (useIndex === -1) {
      return prefix + content
    }

    const newLineIndex = content.indexOf('\n', useIndex) + 1
    return content.slice(0, newLineIndex) + prefix + content.slice(newLineIndex)
  }

  return content
}
