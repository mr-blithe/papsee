import { version } from '../../package.json'

// A static import, so the release the build came from is compiled in rather than read from disk.
// The standalone image ships no package.json, and .github/workflows/release.yml is what keeps this
// equal to the tag: it refuses a tag that disagrees with the one package.json declares.
export const APP_VERSION = version
