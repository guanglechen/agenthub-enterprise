#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import YAML from 'yaml'

const BASE_URL = (process.env.AGENTHUB_BASE_URL || 'http://localhost:8080').replace(/\/$/, '')
const TOKEN = process.env.AGENTHUB_TOKEN || ''

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

function buildHeaders(extra = {}) {
  const headers = { Accept: 'application/json', ...extra }
  if (TOKEN) {
    headers.Authorization = `Bearer ${TOKEN}`
  }
  return headers
}

async function request(method, targetPath, { body, headers, isJson = true } = {}) {
  const response = await fetch(`${BASE_URL}${targetPath}`, {
    method,
    headers: buildHeaders(headers),
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

function buildAgentContext(options) {
  if (options['context-file']) {
    return loadStructuredFile(path.resolve(options['context-file']))
  }
  return {
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
  }
}

async function commandSearch(options) {
  const params = new URLSearchParams()
  for (const key of ['q', 'namespace', 'label', 'assetType', 'domain', 'stage', 'topology', 'stack', 'sort', 'page', 'size']) {
    if (options[key]) {
      params.set(key, String(options[key]))
    }
  }
  const data = await request('GET', `/api/v1/search/skills?${params.toString()}`)
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
  const data = await request('GET', `/api/v1/skills/${namespace}/${encodeURIComponent(slug)}`)
  printJson(data)
}

async function commandDownload(options) {
  const { namespace, slug } = splitSkillCoordinate(options.skill || '')
  const version = options.version
  const targetPath = version
    ? `/api/v1/skills/${namespace}/${encodeURIComponent(slug)}/versions/${encodeURIComponent(version)}/download`
    : `/api/v1/skills/${namespace}/${encodeURIComponent(slug)}/download`
  const response = await fetch(`${BASE_URL}${targetPath}`, { headers: buildHeaders() })
  if (!response.ok) {
    fail(`Download failed: ${response.status} ${response.statusText}`, response.status || 1)
  }
  const outputPath = path.resolve(process.cwd(), options.out || `${slug}.zip`)
  fs.writeFileSync(outputPath, Buffer.from(await response.arrayBuffer()))
  process.stdout.write(`${outputPath}\n`)
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
  const data = await request('POST', `/api/v1/skills/${namespace.replace(/^@/, '')}/publish`, {
    body: form,
    headers: {},
  })

  if (options['catalog-file']) {
    const catalog = normalizeCatalogBody(loadStructuredFile(path.resolve(options['catalog-file'])))
    await request('PUT', `/api/v1/skills/${namespace.replace(/^@/, '')}/${encodeURIComponent(data.slug)}/catalog`, {
      body: JSON.stringify(catalog),
      headers: { 'Content-Type': 'application/json' },
    })
  }

  printJson(data)
  return data
}

async function commandCatalogGet(options) {
  const { namespace, slug } = splitSkillCoordinate(options.skill || '')
  const data = await request('GET', `/api/v1/skills/${namespace}/${encodeURIComponent(slug)}/catalog`)
  printJson(data)
}

async function commandCatalogSet(options) {
  const { namespace, slug } = splitSkillCoordinate(options.skill || '')
  const filePath = options.file
  if (!filePath) {
    fail('catalog set requires --file')
  }
  const body = normalizeCatalogBody(loadStructuredFile(path.resolve(filePath)))
  const data = await request('PUT', `/api/v1/skills/${namespace}/${encodeURIComponent(slug)}/catalog`, {
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
  printJson(data)
}

async function commandLabelsList(options) {
  const { namespace, slug } = splitSkillCoordinate(options.skill || '')
  const data = await request('GET', `/api/v1/skills/${namespace}/${encodeURIComponent(slug)}/labels`)
  printJson(data)
}

async function commandLabelsAdd(options) {
  const { namespace, slug } = splitSkillCoordinate(options.skill || '')
  if (!options.label) {
    fail('labels add requires --label')
  }
  const data = await request('PUT', `/api/v1/skills/${namespace}/${encodeURIComponent(slug)}/labels/${encodeURIComponent(options.label)}`)
  printJson(data)
}

async function commandLabelsRemove(options) {
  const { namespace, slug } = splitSkillCoordinate(options.skill || '')
  if (!options.label) {
    fail('labels remove requires --label')
  }
  const data = await request('DELETE', `/api/v1/skills/${namespace}/${encodeURIComponent(slug)}/labels/${encodeURIComponent(options.label)}`)
  printJson(data)
}

async function commandRelationsGet(options) {
  const { namespace, slug } = splitSkillCoordinate(options.skill || '')
  const data = await request('GET', `/api/v1/skills/${namespace}/${encodeURIComponent(slug)}/relations`)
  printJson(data)
}

async function commandRelationsSync(options) {
  const { namespace, slug } = splitSkillCoordinate(options.skill || '')
  if (!options.file) {
    fail('relations sync requires --file')
  }
  const loaded = loadStructuredFile(path.resolve(options.file))
  const relations = Array.isArray(loaded) ? loaded : loaded.relations
  const data = await request('PUT', `/api/v1/skills/${namespace}/${encodeURIComponent(slug)}/relations`, {
    body: JSON.stringify({ relations }),
    headers: { 'Content-Type': 'application/json' },
  })
  printJson(data)
}

async function commandRecommend(options) {
  if (options.skill) {
    const { namespace, slug } = splitSkillCoordinate(options.skill)
    const data = await request('GET', `/api/v1/skills/${namespace}/${encodeURIComponent(slug)}/recommendations`)
    printJson(data)
    return
  }

  const body = {
    assetType: options.assetType,
    domain: options.domain,
    stage: options.stage,
    topology: options.topology,
    stack: options.stack ? String(options.stack).split(',').map((item) => item.trim()).filter(Boolean) : [],
    keywords: options.keywords ? String(options.keywords).split(',').map((item) => item.trim()).filter(Boolean) : [],
    namespace: options.namespace,
  }
  const data = await request('POST', '/api/v1/recommendations/context', {
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
    namespace,
    file: path.isAbsolute(packageFile) ? packageFile : path.join(directory, packageFile),
    visibility: descriptor.visibility || options.visibility || 'PUBLIC',
    yes: true,
    'catalog-file': descriptor.catalogFile ? path.join(directory, descriptor.catalogFile) : undefined,
  })

  if (Array.isArray(descriptor.labels)) {
    for (const label of descriptor.labels) {
      await commandLabelsAdd({ skill: `${namespace}/${publishResult.slug}`, label })
    }
  }
}

async function commandAgentProfile() {
  const data = await request('GET', '/api/v1/agent/profile')
  printJson(data)
}

async function commandAgentInstallPlan(options) {
  const data = await request('POST', '/api/v1/agent/install-plan', {
    body: JSON.stringify(buildAgentContext(options)),
    headers: { 'Content-Type': 'application/json' },
  })
  printJson(data)
}

function printHelp() {
  process.stdout.write(`agenthub-cli commands:
  search --q <text> [--assetType <type>] [--json]
  inspect --skill @namespace/slug --json
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
    case 'search:':
      await commandSearch(options)
      return
    case 'inspect:':
      await commandInspect(options)
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
      await commandAgentProfile()
      return
    case 'agent:install-plan':
      await commandAgentInstallPlan(options)
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
