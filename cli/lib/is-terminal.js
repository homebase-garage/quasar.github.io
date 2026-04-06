import ci from 'ci-info'

export const isCI = ci.isCI
export const isTerminal = ci.isCI || !process.stdout.isTTY
export const isMinimalTerminal = isTerminal || process.env.NODE_ENV === 'test'
