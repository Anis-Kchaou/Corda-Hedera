// The Make host explicitly sets FIGMA=1. An exported app defaults to local
// Payload and never evaluates the Figma builder or resolves an environment ID.
const config =
  process.env.FIGMA === '1'
    ? import('./payload.figma.config').then(({ default: config }) => config)
    : import('./payload.standalone.config').then(({ default: config }) => config)

export default config
