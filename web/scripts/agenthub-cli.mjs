#!/usr/bin/env node

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import extractZip from 'extract-zip'
import YAML from 'yaml'

const DEFAULT_BASE_URL = 'http://localhost:8080'

function printJson(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`)
}

function fail(message, code = 1) {
  process.stderr.write(`${message}\n`)
  process.exit(code)
}

function parseArgs(argv) {
  const positional = []
  const options = {}

  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index]
    if (!item.startsWith('--')) {
      positional.push(item)
      continue
    }

    const key = item.slice(2)
    const next = argv[index + 1]
    if (next && !next.startsWith('--')) {
      options[key] = next
      index += 1
    } else {
      options[key] = true
    }
  }

  return { positional, options }
}

function splitSkillCoordinate(value) {
  const normalized = value.startsWith('@') ? value.slice(1) : value
  const [namespace, slug] = normalized.split('/', 2)
  if (!namespace || !slug) {
    fail(`Invalid skill coordinate: ${value}`)
  }
  return { namespace, slug }
}

function buildInstallTarget(namespace, slug) {
  return namespace === 'global' ? slug : `${namespace}--${slug}`
}

function resolveConfigPath(options = {}) {
  if (options.config) {
    return path.resolve(String(options.config))
  }
  const configHome = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config')
  return path.join(configHome, 'agenthub', 'config.json')
}

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) {
    return {}
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    fail(`Invalid CLI config file at ${filePath}: ${message}`)
  }
}

function writeJsonFile(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8')
}

function resolveRuntime(options = {}) {
  const configPath = resolveConfigPath(options)
  const storedConfig = readJsonIfExists(configPath)
  const rawBaseUrl = options['base-url'] || process.env.AGENTHUB_BASE_URL || storedConfig.baseUrl || DEFAULT_BASE_URL
  const baseUrl = String(rawBaseUrl).replace(/\/$/, '')
  const token = String(options.token || process.env.AGENTHUB_TOKEN || storedConfig.token || '')
  return { configPath, storedConfig, baseUrl, token }
}

function buildHeaders(token, extra = {}) {
  const headers = { Accept: 'application/json', ...extra }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  return headers
}

async function request(method, targetPath, cliOptions = {}, { body, headers, isJson = true } = {}) {
  const runtime = resolveRuntime(cliOptions)
  const response = await fetch(`${runtime.baseUrl}${targetPath}`, {
    method,
    headers: buildHeaders(runtime.token, headers),
    body,
  })

  const payload = await response.text()
  let parsed = payload
  try {
    parsed = payload ? JSON.parse(payload) : null
  } catch {
    parsed = payload
  }

  if (!response.ok) {
    const message = typeof parsed === 'object' && parsed && 'msg' in parsed ? parsed.msg : `${response.status} ${response.statusText}`
    fail(message, response.status || 1)
  }

  if (!isJson) {
    return parsed
  }

  if (!parsed || typeof parsed !== 'object' || !('data' in parsed)) {
    return parsed
  }
  return parsed.data
}

function loadStructuredFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8')
  if (filePath.endsWith('.yaml') || filePath.endsWith('.yml')) {
    return YAML.parse(raw)
  }
  return JSON.parse(raw)
}

function normalizeCatalogBody(input) {
  return {
    assetType: input.assetType,
    domain: input.domain,
    stage: input.stage,
    topology: input.topology,
    stack: Array.isArray(input.stack) ? input.stack : [],
    ownerTeam: input.ownerTeam,
    keywords: Array.isArray(input.keywords) ? input.keywords : [],
    maintenanceMode: input.maintenanceMode,
    relations: Array.isArray(input.relations) ? input.relations : [],
  }
}

function normalizeStringList(value) {
  if (!value) {
    return []
  }
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean)
  }
  return String(value).split(',').map((item) => item.trim()).filter(Boolean)
}

function pickDefinedEntries(value) {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => {
      if (item === undefined || item === null || item === '') {
        return false
      }
      if (Array.isArray(item) && item.length === 0) {
        return false
      }
      return true
    }),
  )
}

function buildAgentContext(options) {
  if (options['context-file']) {
    return loadStructuredFile(path.resolve(String(options['context-file'])))
  }
  return pickDefinedEntries({
    workspaceName: options.workspaceName,
    language: options.language,
    framework: options.framework,
    newProject: options.newProject === true || options.newProject === 'true',
    assetType: options.assetType,
    domain: options.domain,
    stage: options.stage,
    topology: options.topology,
    stack: normalizeStringList(options.stack),
    keywords: normalizeStringList(options.keywords),
    namespace: options.namespace,
  })
}

function resolveWorkspaceConfigPayload(options, includeToken = true) {
  const runtime = resolveRuntime(options)
  const payload = pickDefinedEntries({
    baseUrl: runtime.baseUrl,
    namespace: options.namespace,
    domain: options.domain,
    assetType: options.assetType,
    stage: options.stage,
    topology: options.topology,
    stack: normalizeStringList(options.stack),
    keywords: normalizeStringList(options.keywords),
    language: options.language,
    framework: options.framework,
    workspaceName: options.workspaceName,
    newProject: options.newProject === true || options.newProject === 'true'
      ? true
      : options.newProject === 'false'
        ? false
        : undefined,
  })

  if (includeToken && runtime.token) {
    payload.token = runtime.token
  }
  return payload
}

async function downloadSkillBundle(options, outputPath) {
  const { namespace, slug } = splitSkillCoordinate(options.skill || '')
  const targetPath = options.version
    ? `/api/v1/skills/${namespace}/${encodeURIComponent(slug)}/versions/${encodeURIComponent(options.version)}/download`
    : `/api/v1/skills/${namespace}/${encodeURIComponent(slug)}/download`
  const runtime = resolveRuntime(options)
  const response = await fetch(`${runtime.baseUrl}${targetPath}`, { headers: buildHeaders(runtime.token) })
  if (!response.ok) {
    fail(`Download failed: ${response.status} ${response.statusText}`, response.status || 1)
  }
  fs.writeFileSync(outputPath, Buffer.from(await response.arrayBuffer()))
}

async function commandSearch(options) {
  const params = new URLSearchParams()
  for (const key of ['q', 'namespace', 'label', 'assetType', 'domain', 'stage', 'topology', 'stack', 'sort', 'page', 'size']) {
    if (options[key]) {
      params.set(key, String(options[key]))
    }
  }
  const data = await request('GET', `/api/v1/search/skills?${params.toString()}`, options)
  if (options.json) {
    printJson(data)
    return
  }
  for (const item of data.items || []) {
    process.stdout.write(`${item.namespace}/${item.slug}  ${item.displayName}\n`)
  }
}

async function commandInspect(options) {
  const { namespace, slug } = splitSkillCoordinate(options.skill || '')
  const data = await request('GET', `/api/v1/skills/${namespace}/${encodeURIComponent(slug)}`, options)
  printJson(data)
}

async function commandWhoami(options) {
  const data = await request('GET', '/api/v1/auth/me', options)
  printJson(data)
}

async function commandDownload(options) {
  if (!options.skill) {
    fail('download requires --skill')
  }
  const { slug } = splitSkillCoordinate(options.skill)
  const outputPath = path.resolve(process.cwd(), options.out || `${slug}.zip`)
  await downloadSkillBundle(options, outputPath)
  if (options.json) {
    printJson({ outputPath })
    return
  }
  process.stdout.write(`${outputPath}\n`)
}

async function commandInstall(options) {
  if (!options.skill) {
    fail('install requires --skill')
  }

  const { namespace, slug } = splitSkillCoordinate(options.skill)
  const installTarget = buildInstallTarget(namespace, slug)
  const targetRoot = path.resolve(process.cwd(), options.target || path.join('.claude', 'skills'))
  const installDir = path.join(targetRoot, installTarget)
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agenthub-cli-install-'))

  try {
    const zipPath = path.join(tempDir, `${installTarget}.zip`)
    await downloadSkillBundle(options, zipPath)

    if (fs.existsSync(installDir) && options.force !== true && options.force !== 'true') {
      fail(`Install target already exists: ${installDir}. Use --force to overwrite.`)
    }

    fs.rmSync(installDir, { recursive: true, force: true })
    fs.mkdirSync(installDir, { recursive: true })
    try {
      await extractZip(zipPath, { dir: installDir })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      fail(`Failed to unpack ${options.skill}: ${message}`)
    }

    const skillMdPath = path.join(installDir, 'SKILL.md')
    if (!fs.existsSync(skillMdPath)) {
      fail(`Installed skill is missing SKILL.md: ${options.skill}`)
    }

    const result = { coordinate: options.skill, installDir, skillMdPath }
    if (options.json) {
      printJson(result)
      return
    }
    process.stdout.write(`${installDir}\n`)
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
}

async function commandPublish(options) {
  const namespace = options.namespace
  const filePath = options.file
  const visibility = options.visibility || 'PUBLIC'
  if (!namespace || !filePath) {
    fail('publish requires --namespace and --file')
  }
  const form = new FormData()
  const fileBuffer = fs.readFileSync(filePath)
  form.append('file', new Blob([fileBuffer]), path.basename(filePath))
  form.append('visibility', visibility)
  form.append('confirmWarnings', String(options.yes === true || options.yes === 'true'))
  const data = await request('POST', `/api/v1/skills/${String(namespace).replace(/^@/, '')}/publish`, options, {
    body: form,
    headers: {},
  })

  if (options['catalog-file']) {
    const catalog = normalizeCatalogBody(loadStructuredFile(path.resolve(String(options['catalog-file']))))
    await request('PUT', `/api/v1/skills/${String(namespace).replace(/^@/, '')}/${encodeURIComponent(data.slug)}/catalog`, options, {
      body: JSON.stringify(catalog),
      headers: { 'Content-Type': 'application/json' },
    })
  }

  printJson(data)
  return data
}

async function commandCatalogGet(options) {
  const { namespace, slug } = splitSkillCoordinate(options.skill || '')
  const data = await request('GET', `/api/v1/skills/${namespace}/${encodeURIComponent(slug)}/catalog`, options)
  printJson(data)
}

async function commandCatalogSet(options) {
  const { namespace, slug } = splitSkillCoordinate(options.skill || '')
  if (!options.file) {
    fail('catalog set requires --file')
  }
  const body = normalizeCatalogBody(loadStructuredFile(path.resolve(String(options.file))))
  const data = await request('PUT', `/api/v1/skills/${namespace}/${encodeURIComponent(slug)}/catalog`, options, {
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
  printJson(data)
}

async function commandLabelsList(options) {
  const { namespace, slug } = splitSkillCoordinate(options.skill || '')
  const data = await request('GET', `/api/v1/skills/${namespace}/${encodeURIComponent(slug)}/labels`, options)
  printJson(data)
}

async function commandLabelsAdd(options) {
  const { namespace, slug } = splitSkillCoordinate(options.skill || '')
  if (!options.label) {
    fail('labels add requires --label')
  }
  const data = await request('PUT', `/api/v1/skills/${namespace}/${encodeURIComponent(slug)}/labels/${encodeURIComponent(String(options.label))}`, options)
  printJson(data)
}

async function commandLabelsRemove(options) {
  const { namespace, slug } = splitSkillCoordinate(options.skill || '')
  if (!options.label) {
    fail('labels remove requires --label')
  }
  const data = await request('DELETE', `/api/v1/skills/${namespace}/${encodeURIComponent(slug)}/labels/${encodeURIComponent(String(options.label))}`, options)
  printJson(data)
}

async function commandRelationsGet(options) {
  const { namespace, slug } = splitSkillCoordinate(options.skill || '')
  const data = await request('GET', `/api/v1/skills/${namespace}/${encodeURIComponent(slug)}/relations`, options)
  printJson(data)
}

async function commandRelationsSync(options) {
  const { namespace, slug } = splitSkillCoordinate(options.skill || '')
  if (!options.file) {
    fail('relations sync requires --file')
  }
  const loaded = loadStructuredFile(path.resolve(String(options.file)))
  const relations = Array.isArray(loaded) ? loaded : loaded.relations
  const data = await request('PUT', `/api/v1/skills/${namespace}/${encodeURIComponent(slug)}/relations`, options, {
    body: JSON.stringify({ relations }),
    headers: { 'Content-Type': 'application/json' },
  })
  printJson(data)
}

async function commandRecommend(options) {
  if (options.skill) {
    const { namespace, slug } = splitSkillCoordinate(options.skill)
    const data = await request('GET', `/api/v1/skills/${namespace}/${encodeURIComponent(slug)}/recommendations`, options)
    printJson(data)
    return
  }

  const body = {
    assetType: options.assetType,
    domain: options.domain,
    stage: options.stage,
    topology: options.topology,
    stack: normalizeStringList(options.stack),
    keywords: normalizeStringList(options.keywords),
    namespace: options.namespace,
  }
  const data = await request('POST', '/api/v1/recommendations/context', options, {
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
  printJson(data)
}

async function commandSync(options) {
  const directory = path.resolve(options.dir || '.')
  const descriptorPath = ['agenthub.sync.json', 'agenthub.sync.yaml', 'agenthub.sync.yml']
    .map((name) => path.join(directory, name))
    .find((candidate) => fs.existsSync(candidate))
  const descriptor = descriptorPath ? loadStructuredFile(descriptorPath) : {}
  const files = fs.readdirSync(directory)
  const packageFile = descriptor.packageFile
    ? path.join(directory, descriptor.packageFile)
    : files.find((file) => file.endsWith('.zip'))
  if (!packageFile) {
    fail(`No package file found in ${directory}`)
  }
  const namespace = descriptor.namespace || options.namespace
  if (!namespace) {
    fail('sync requires namespace in descriptor or --namespace')
  }
  const publishResult = await commandPublish({
    ...options,
    namespace,
    file: path.isAbsolute(packageFile) ? packageFile : path.join(directory, packageFile),
    visibility: descriptor.visibility || options.visibility || 'PUBLIC',
    yes: true,
    'catalog-file': descriptor.catalogFile ? path.join(directory, descriptor.catalogFile) : undefined,
  })

  if (Array.isArray(descriptor.labels)) {
    for (const label of descriptor.labels) {
      await commandLabelsAdd({ ...options, skill: `${namespace}/${publishResult.slug}`, label })
    }
  }
}

async function commandAgentProfile(options) {
  const data = await request('GET', '/api/v1/agent/profile', options)
  printJson(data)
}

async function commandAgentInstallPlan(options) {
  const data = await request('POST', '/api/v1/agent/install-plan', options, {
    body: JSON.stringify(buildAgentContext(options)),
    headers: { 'Content-Type': 'application/json' },
  })
  printJson(data)
}

function commandLogin(options) {
  const runtime = resolveRuntime(options)
  if (!runtime.token) {
    fail('login requires --token or AGENTHUB_TOKEN')
  }
  const nextConfig = {
    ...runtime.storedConfig,
    baseUrl: runtime.baseUrl,
    token: runtime.token,
  }
  writeJsonFile(runtime.configPath, nextConfig)
  printJson({
    configPath: runtime.configPath,
    baseUrl: runtime.baseUrl,
    hasToken: true,
  })
}

function commandConfigShow(options) {
  const runtime = resolveRuntime(options)
  const storedConfig = readJsonIfExists(runtime.configPath)
  const token = options['show-token'] ? storedConfig.token : (storedConfig.token ? `${String(storedConfig.token).slice(0, 6)}...` : '')
  printJson({
    configPath: runtime.configPath,
    config: {
      ...storedConfig,
      ...(storedConfig.token ? { token } : {}),
    },
    resolved: {
      baseUrl: runtime.baseUrl,
      hasToken: Boolean(runtime.token),
    },
  })
}

function commandConfigInitWorkspace(options) {
  const workspace = path.resolve(process.cwd(), options.workspace || '.')
  const outputPath = options.out
    ? path.resolve(process.cwd(), options.out)
    : path.join(workspace, '.claude', 'agenthub.json')
  const current = readJsonIfExists(outputPath)
  const next = {
    ...current,
    ...resolveWorkspaceConfigPayload(options),
  }
  writeJsonFile(outputPath, next)
  printJson({
    configPath: outputPath,
    config: {
      ...next,
      ...(next.token ? { token: `${String(next.token).slice(0, 6)}...` } : {}),
    },
  })
}

function printHelp() {
  process.stdout.write(`agenthub-cli commands:
  login --base-url <url> --token <token>
  whoami --json
  search --q <text> [--assetType <type>] [--json]
  inspect --skill @namespace/slug --json
  install --skill @namespace/slug [--version 1.0.0] [--target .claude/skills] [--force] [--base-url <url>]
  publish --namespace <ns> --file <bundle.zip> [--visibility PUBLIC] [--catalog-file catalog.json] [--yes]
  download --skill @namespace/slug [--version 1.0.0] [--out skill.zip]
  catalog get --skill @namespace/slug --json
  catalog set --skill @namespace/slug --file catalog.json
  labels list --skill @namespace/slug --json
  labels add --skill @namespace/slug --label official
  labels remove --skill @namespace/slug --label official
  relations get --skill @namespace/slug --json
  relations sync --skill @namespace/slug --file relations.json
  recommend --skill @namespace/slug --json
  recommend --assetType scaffold --domain order --stack spring-boot3,maven --json
  agent profile --json
  agent install-plan --context-file context.json --json
  agent install-plan --assetType microservice --domain payment --stage develop --topology bff --stack spring-boot3,maven --json
  config show [--show-token]
  config init-workspace --workspace . --base-url <url> --token <token> [--namespace team-space] [--domain payment] [--assetType microservice]
  sync --dir ./artifact-dir [--namespace team-space]
`)
}

async function main() {
  const { positional, options } = parseArgs(process.argv.slice(2))
  if (positional.length === 0 || options.help) {
    printHelp()
    return
  }

  const [command, subcommand] = positional
  switch (`${command}:${subcommand || ''}`) {
    case 'login:':
      commandLogin(options)
      return
    case 'whoami:':
      await commandWhoami(options)
      return
    case 'search:':
      await commandSearch(options)
      return
    case 'inspect:':
      await commandInspect(options)
      return
    case 'install:':
      await commandInstall(options)
      return
    case 'publish:':
      await commandPublish(options)
      return
    case 'download:':
      await commandDownload(options)
      return
    case 'catalog:get':
      await commandCatalogGet(options)
      return
    case 'catalog:set':
      await commandCatalogSet(options)
      return
    case 'labels:list':
      await commandLabelsList(options)
      return
    case 'labels:add':
      await commandLabelsAdd(options)
      return
    case 'labels:remove':
      await commandLabelsRemove(options)
      return
    case 'relations:get':
      await commandRelationsGet(options)
      return
    case 'relations:sync':
      await commandRelationsSync(options)
      return
    case 'recommend:':
      await commandRecommend(options)
      return
    case 'agent:profile':
      await commandAgentProfile(options)
      return
    case 'agent:install-plan':
      await commandAgentInstallPlan(options)
      return
    case 'config:show':
      commandConfigShow(options)
      return
    case 'config:init-workspace':
      commandConfigInitWorkspace(options)
      return
    case 'sync:':
      await commandSync(options)
      return
    default:
      printHelp()
      process.exitCode = 1
  }
}

await main()
