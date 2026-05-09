export const AGENTHUB_CLI_PACKAGE_NAME = '@guanglechen/agenthub-cli'
export const AGENTHUB_CLI_PACKAGE_VERSION = '0.1.0'
export const AGENTHUB_CLI_TARBALL_FILE_NAME = `agenthub-cli-${AGENTHUB_CLI_PACKAGE_VERSION}.tgz`

export function getAppBaseUrl(): string {
  if (typeof window === 'undefined') {
    return ''
  }
  const runtimeConfig = window.__SKILLHUB_RUNTIME_CONFIG__
  const configuredUrl = runtimeConfig?.appBaseUrl
  if (configuredUrl && !configuredUrl.includes('localhost')) {
    return configuredUrl
  }
  return `${window.location.protocol}//${window.location.host}`
}

export function getAgenthubCliTarballUrl(baseUrl: string): string {
  return `${baseUrl.replace(/\/$/, '')}/downloads/${AGENTHUB_CLI_TARBALL_FILE_NAME}`
}

export function buildAgenthubCliInstallPackageCommand(baseUrl: string): string {
  return `npm install -g ${getAgenthubCliTarballUrl(baseUrl)}`
}

export function buildAgenthubCliLoginCommand(baseUrl: string, token = 'sk_your_api_token_here'): string {
  return `agenthub-cli login --base-url ${baseUrl} --token ${token}`
}

export function buildAgenthubCliWhoamiCommand(): string {
  return 'agenthub-cli whoami --json'
}

export function buildAgenthubCliWorkspaceInitCommand(
  baseUrl: string,
  workspace = '.',
  token = 'sk_your_api_token_here',
): string {
  return `agenthub-cli config init-workspace --workspace ${workspace} --base-url ${baseUrl} --token ${token}`
}

export function buildAgenthubCliSkillInstallCommand(namespace: string, slug: string, baseUrl: string, version?: string): string {
  const coordinate = `@${namespace}/${slug}`
  const versionPart = version ? ` --version ${version}` : ''
  return `agenthub-cli install --skill ${coordinate}${versionPart} --base-url ${baseUrl}`
}
