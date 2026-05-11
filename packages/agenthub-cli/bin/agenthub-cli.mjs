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

function loadJsonFile(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    fail(`Invalid JSON file at ${filePath}: ${message}`)
  }
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

function uniqueList(values) {
  return Array.from(new Set(values.map((item) => String(item).trim()).filter(Boolean)))
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isKebabCase(value) {
  return /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/.test(String(value || ''))
}

function toSlug(value) {
  return String(value || 'harness-package')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'harness-package'
}

function toClassName(value) {
  return toSlug(value)
    .split('-')
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join('') || 'Application'
}

function readTextIfExists(filePath) {
  if (!fs.existsSync(filePath)) {
    return ''
  }
  return fs.readFileSync(filePath, 'utf8')
}

function loadStructuredFileIfExists(filePath) {
  if (!filePath || !fs.existsSync(filePath)) {
    return null
  }
  return loadStructuredFile(filePath)
}

function writeStructuredFile(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  if (filePath.endsWith('.yaml') || filePath.endsWith('.yml')) {
    fs.writeFileSync(filePath, YAML.stringify(data), 'utf8')
    return
  }
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8')
}

function walkFiles(root, {
  ignore = ['.git', 'node_modules', 'target', 'build', 'dist', '.agenthub'],
  maxFiles = 2000,
} = {}) {
  const result = []
  if (!fs.existsSync(root)) {
    return result
  }

  function visit(current) {
    if (result.length >= maxFiles) {
      return
    }
    const entries = fs.readdirSync(current, { withFileTypes: true })
    for (const entry of entries) {
      if (result.length >= maxFiles || ignore.includes(entry.name)) {
        continue
      }
      const absolute = path.join(current, entry.name)
      if (entry.isDirectory()) {
        visit(absolute)
      } else if (entry.isFile()) {
        result.push(path.relative(root, absolute))
      }
    }
  }

  visit(root)
  return result
}

function parseMavenModules(pomText) {
  return Array.from(pomText.matchAll(/<module>\s*([^<]+?)\s*<\/module>/g))
    .map((match) => match[1].trim())
    .filter(Boolean)
}

function detectJavaVersion(pomText, gradleText) {
  const candidates = [
    /<java\.version>\s*([^<]+?)\s*<\/java\.version>/,
    /<maven\.compiler\.source>\s*([^<]+?)\s*<\/maven\.compiler\.source>/,
    /<maven\.compiler\.release>\s*([^<]+?)\s*<\/maven\.compiler\.release>/,
  ]
  for (const pattern of candidates) {
    const match = pomText.match(pattern)
    if (match) {
      return match[1].trim()
    }
  }
  const gradleMatch = gradleText.match(/JavaVersion\.VERSION_(\d+)/) || gradleText.match(/sourceCompatibility\s*=\s*['"]?(\d+)/)
  return gradleMatch ? gradleMatch[1].trim() : null
}

function detectJavaComponents(moduleDir) {
  const sourceRoot = path.join(moduleDir, 'src', 'main', 'java')
  const files = walkFiles(sourceRoot, { maxFiles: 3000 })
  const components = []
  let springBootApplication = null

  for (const relativePath of files) {
    if (!relativePath.endsWith('.java')) {
      continue
    }
    const absolutePath = path.join(sourceRoot, relativePath)
    const content = readTextIfExists(absolutePath)
    const normalizedPath = relativePath.replaceAll(path.sep, '/')
    const component = {
      path: `src/main/java/${normalizedPath}`,
      kind: null,
    }

    if (content.includes('@SpringBootApplication')) {
      springBootApplication = component.path
    }
    if (content.includes('@RestController') || content.includes('@Controller') || normalizedPath.endsWith('Controller.java')) {
      component.kind = 'rest-controller'
    } else if (content.includes('@Repository') || normalizedPath.endsWith('Repository.java')) {
      component.kind = 'repository'
    } else if (content.includes('@FeignClient')) {
      component.kind = 'feign-client'
    } else if (content.includes('@KafkaListener') || content.includes('@RabbitListener')) {
      component.kind = 'event-consumer'
    } else if (content.includes('@Scheduled')) {
      component.kind = 'scheduled-job'
    } else if (content.includes('@Service') || normalizedPath.endsWith('Service.java')) {
      component.kind = 'service'
    }

    if (component.kind) {
      components.push(component)
    }
  }

  return { components, springBootApplication }
}

function scanJavaModule(moduleDir, name) {
  const pomPath = path.join(moduleDir, 'pom.xml')
  const gradlePath = path.join(moduleDir, 'build.gradle')
  const gradleKtsPath = path.join(moduleDir, 'build.gradle.kts')
  const pomText = readTextIfExists(pomPath)
  const gradleText = `${readTextIfExists(gradlePath)}\n${readTextIfExists(gradleKtsPath)}`
  const hasPom = Boolean(pomText)
  const hasGradle = Boolean(gradleText.trim())
  const sourceRoot = path.join(moduleDir, 'src', 'main', 'java')
  const testRoot = path.join(moduleDir, 'src', 'test', 'java')
  const { components, springBootApplication } = detectJavaComponents(moduleDir)
  const framework = pomText.includes('spring-boot') || gradleText.includes('spring-boot') || springBootApplication
    ? 'spring-boot'
    : null
  const javaVersion = detectJavaVersion(pomText, gradleText)
  const componentKinds = uniqueList(components.map((item) => item.kind))
  const stack = uniqueList([
    'java',
    javaVersion ? `java${javaVersion}` : null,
    hasPom ? 'maven' : null,
    hasGradle ? 'gradle' : null,
    framework ? 'spring-boot3' : null,
  ].filter(Boolean))

  return {
    name,
    path: path.relative(process.cwd(), moduleDir) || '.',
    buildTool: hasPom ? 'maven' : (hasGradle ? 'gradle' : null),
    language: fs.existsSync(sourceRoot) || hasPom || hasGradle ? 'java' : 'unknown',
    framework,
    javaVersion,
    sourceRoot: fs.existsSync(sourceRoot) ? path.relative(process.cwd(), sourceRoot) : null,
    testRoot: fs.existsSync(testRoot) ? path.relative(process.cwd(), testRoot) : null,
    hasTests: fs.existsSync(testRoot) && walkFiles(testRoot, { maxFiles: 20 }).some((file) => file.endsWith('.java')),
    springBootApplication,
    componentKinds,
    components,
    stack,
  }
}

function inferTopology(modules) {
  const kinds = new Set(modules.flatMap((module) => module.componentKinds || []))
  if (kinds.has('event-consumer')) {
    return 'event-consumer'
  }
  if (kinds.has('scheduled-job')) {
    return 'batch'
  }
  if (kinds.has('rest-controller')) {
    return 'crud-api'
  }
  return 'shared-lib'
}

function scanWorkspaceModules(directory) {
  const workspace = path.resolve(directory || '.')
  const rootPom = readTextIfExists(path.join(workspace, 'pom.xml'))
  const moduleNames = uniqueList(parseMavenModules(rootPom))
  const modules = []

  modules.push(scanJavaModule(workspace, path.basename(workspace)))
  for (const moduleName of moduleNames) {
    const moduleDir = path.join(workspace, moduleName)
    if (fs.existsSync(moduleDir) && fs.statSync(moduleDir).isDirectory()) {
      modules.push(scanJavaModule(moduleDir, moduleName))
    }
  }

  const javaModules = modules.filter((module) => module.language === 'java')
  const stack = uniqueList(javaModules.flatMap((module) => module.stack || []))
  const topology = inferTopology(javaModules)
  return {
    workspaceName: path.basename(workspace),
    workspace,
    moduleCount: javaModules.length,
    topology,
    stack,
    modules: javaModules,
  }
}

function buildHarnessVerificationReport(directory) {
  const scan = scanWorkspaceModules(directory)
  const findings = []

  if (scan.modules.length === 0) {
    findings.push({
      rule: 'java-module-detected',
      severity: 'error',
      message: 'No Java module was detected. Expected pom.xml, Gradle build file, or src/main/java.',
      suggestion: 'Run harness init for a new service or execute this command from a Java service root.',
    })
  }

  for (const moduleInfo of scan.modules) {
    if (!moduleInfo.buildTool) {
      findings.push({
        rule: 'build-tool-present',
        severity: 'error',
        module: moduleInfo.name,
        message: 'Java module has no Maven or Gradle build file.',
        suggestion: 'Add pom.xml or build.gradle, or sync a Java microservice harness scaffold.',
      })
    }
    if (!moduleInfo.sourceRoot) {
      findings.push({
        rule: 'main-source-present',
        severity: 'error',
        module: moduleInfo.name,
        message: 'Java module has no src/main/java source root.',
        suggestion: 'Create src/main/java or run harness init with a service template.',
      })
    }
    if (moduleInfo.framework === 'spring-boot' && !moduleInfo.springBootApplication) {
      findings.push({
        rule: 'spring-boot-application-present',
        severity: 'warning',
        module: moduleInfo.name,
        message: 'Spring Boot dependency was detected but no @SpringBootApplication class was found.',
        suggestion: 'Add an application entrypoint or verify this module is a library module.',
      })
    }
    if (!moduleInfo.hasTests) {
      findings.push({
        rule: 'test-source-present',
        severity: 'warning',
        module: moduleInfo.name,
        message: 'No Java tests were detected under src/test/java.',
        suggestion: 'Add a smoke test or apply a quality Harness Package.',
      })
    }
  }

  const failed = findings.some((finding) => finding.severity === 'error')
  const warning = findings.some((finding) => finding.severity === 'warning')
  return {
    status: failed ? 'failed' : (warning ? 'warning' : 'passed'),
    checkedAt: new Date().toISOString(),
    summary: {
      modules: scan.moduleCount,
      passed: failed ? 0 : 1,
      failed: findings.filter((finding) => finding.severity === 'error').length,
      warning: findings.filter((finding) => finding.severity === 'warning').length,
    },
    scan,
    findings,
  }
}

function loadHarnessManifest(packageRoot) {
  const manifestPath = ['harness/manifest.yaml', 'harness/manifest.yml', 'harness/manifest.json']
    .map((name) => path.join(packageRoot, name))
    .find((candidate) => fs.existsSync(candidate))
  if (!manifestPath) {
    fail(`Harness manifest not found under ${packageRoot}. Expected harness/manifest.yaml.`)
  }
  return {
    path: manifestPath,
    data: loadStructuredFile(manifestPath),
  }
}

function renderTemplateContent(content, inputs) {
  return content.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_, key) => {
    const value = key.split('.').reduce((current, part) => current && current[part], inputs)
    return value === undefined || value === null ? '' : String(value)
  })
}

function copyTemplateTree(sourceDir, targetDir, inputs, options = {}) {
  if (!fs.existsSync(sourceDir)) {
    fail(`Harness template directory not found: ${sourceDir}`)
  }
  const copied = []
  const skipped = []
  const files = walkFiles(sourceDir, { ignore: [], maxFiles: 5000 })
  for (const relativePath of files) {
    const sourceFile = path.join(sourceDir, relativePath)
    const renderedRelativePath = renderTemplateContent(relativePath, inputs)
    const targetFile = path.join(targetDir, renderedRelativePath)
    if (fs.existsSync(targetFile) && options.force !== true && options.force !== 'true') {
      skipped.push(path.relative(targetDir, targetFile))
      continue
    }
    fs.mkdirSync(path.dirname(targetFile), { recursive: true })
    const content = fs.readFileSync(sourceFile, 'utf8')
    fs.writeFileSync(targetFile, renderTemplateContent(content, inputs), 'utf8')
    copied.push(path.relative(targetDir, targetFile))
  }
  return { copied, skipped }
}

function resolveHarnessInputs(options, targetDir) {
  const loaded = loadStructuredFileIfExists(options.inputs ? path.resolve(String(options.inputs)) : null) || {}
  const artifactId = loaded.artifactId || options.artifactId || toSlug(path.basename(targetDir))
  const packageName = loaded.packageName || options.packageName || `com.company.${toSlug(artifactId).replaceAll('-', '')}`
  return {
    groupId: loaded.groupId || options.groupId || 'com.company',
    artifactId,
    serviceName: loaded.serviceName || options.serviceName || artifactId,
    packageName,
    packagePath: String(packageName).replaceAll('.', '/'),
    applicationClassName: loaded.applicationClassName || options.applicationClassName || `${toClassName(artifactId)}Application`,
    javaVersion: loaded.javaVersion || options.javaVersion || '21',
    ...loaded,
  }
}

function scanSecrets(directory) {
  const patterns = [
    { id: 'private-key', severity: 'error', pattern: /-----BEGIN (RSA |EC |OPENSSH |)PRIVATE KEY-----/ },
    { id: 'token-like-value', severity: 'error', pattern: /(api[_-]?key|access[_-]?token|secret[_-]?key)\s*[:=]\s*['"]?[A-Za-z0-9_\-.]{20,}/i },
    { id: 'password-like-value', severity: 'warning', pattern: /(password|passwd|pwd)\s*[:=]\s*['"]?[^\s'"]{8,}/i },
    { id: 'jdbc-password', severity: 'error', pattern: /jdbc:[^\s'"]+(password|pwd)=([^&\s'"]+)/i },
  ]
  const allowedExtensions = new Set(['.java', '.xml', '.yaml', '.yml', '.json', '.properties', '.env', '.md', '.txt'])
  const findings = []
  for (const relativePath of walkFiles(directory, { maxFiles: 5000 })) {
    const ext = path.extname(relativePath)
    if (!allowedExtensions.has(ext) && !relativePath.endsWith('.env')) {
      continue
    }
    const content = readTextIfExists(path.join(directory, relativePath))
    for (const pattern of patterns) {
      if (pattern.pattern.test(content)) {
        findings.push({
          rule: pattern.id,
          severity: pattern.severity,
          file: relativePath,
          message: `Potential secret matched ${pattern.id}.`,
        })
      }
    }
  }
  return findings
}

function normalizePathArray(value) {
  if (!value) {
    return []
  }
  return Array.isArray(value) ? value : [value]
}

function validatePluginManifest(manifest, manifestPath) {
  const errors = []
  const warnings = []
  if (!isPlainObject(manifest)) {
    return { errors: [`${manifestPath} must contain a JSON object.`], warnings }
  }
  if (!manifest.name) {
    errors.push('plugin.json requires name.')
  } else if (!isKebabCase(manifest.name)) {
    errors.push(`plugin name must be kebab-case: ${manifest.name}`)
  }
  if (manifest.version && !/^\d+\.\d+\.\d+([+-][0-9A-Za-z.-]+)?$/.test(String(manifest.version))) {
    warnings.push(`plugin version should be SemVer: ${manifest.version}`)
  }

  for (const field of ['commands', 'agents', 'skills', 'hooks', 'mcpServers']) {
    for (const item of normalizePathArray(manifest[field])) {
      if (typeof item === 'string' && !item.startsWith('./')) {
        errors.push(`plugin ${field} path must be relative and start with ./: ${item}`)
      }
    }
  }
  return { errors, warnings }
}

function validatePluginDirectory(pluginDir) {
  const errors = []
  const warnings = []
  const manifestPath = path.join(pluginDir, '.claude-plugin', 'plugin.json')
  if (!fs.existsSync(manifestPath)) {
    return {
      pluginDir,
      manifestPath,
      manifest: null,
      errors: [`Plugin directory is missing .claude-plugin/plugin.json: ${pluginDir}`],
      warnings,
    }
  }

  const manifest = loadJsonFile(manifestPath)
  const manifestResult = validatePluginManifest(manifest, manifestPath)
  errors.push(...manifestResult.errors)
  warnings.push(...manifestResult.warnings)

  const skillsPathEntries = normalizePathArray(manifest.skills || './skills')
  for (const skillsPath of skillsPathEntries) {
    if (typeof skillsPath !== 'string') {
      continue
    }
    const absoluteSkillsPath = path.resolve(pluginDir, skillsPath)
    if (!fs.existsSync(absoluteSkillsPath)) {
      warnings.push(`Plugin skills path does not exist: ${skillsPath}`)
      continue
    }
    const skillDirs = fs.readdirSync(absoluteSkillsPath, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(absoluteSkillsPath, entry.name))
    if (skillDirs.length === 0) {
      warnings.push(`Plugin skills path has no skill directories: ${skillsPath}`)
    }
    for (const skillDir of skillDirs) {
      if (!fs.existsSync(path.join(skillDir, 'SKILL.md'))) {
        errors.push(`Plugin skill is missing SKILL.md: ${path.relative(pluginDir, skillDir)}`)
      }
    }
  }

  return { pluginDir, manifestPath, manifest, errors, warnings }
}

function resolveMarketplacePath(options) {
  if (options.file) {
    return path.resolve(String(options.file))
  }
  const root = path.resolve(String(options.dir || '.'))
  return path.join(root, '.claude-plugin', 'marketplace.json')
}

function marketplaceRootFromFile(marketplacePath) {
  const directory = path.dirname(marketplacePath)
  return path.basename(directory) === '.claude-plugin' ? path.dirname(directory) : directory
}

function validateMarketplaceObject(marketplace, marketplacePath) {
  const errors = []
  const warnings = []
  const pluginResults = []
  const marketplaceRoot = marketplaceRootFromFile(marketplacePath)

  if (!isPlainObject(marketplace)) {
    return { errors: [`${marketplacePath} must contain a JSON object.`], warnings, pluginResults }
  }
  if (!marketplace.name) {
    errors.push('marketplace.json requires name.')
  } else if (!isKebabCase(marketplace.name)) {
    errors.push(`marketplace name must be kebab-case: ${marketplace.name}`)
  }
  if (!isPlainObject(marketplace.owner)) {
    errors.push('marketplace.json requires owner object.')
  }
  if (!Array.isArray(marketplace.plugins)) {
    errors.push('marketplace.json requires plugins array.')
    return { errors, warnings, pluginResults }
  }

  const names = new Set()
  for (const [index, plugin] of marketplace.plugins.entries()) {
    if (!isPlainObject(plugin)) {
      errors.push(`plugins[${index}] must be an object.`)
      continue
    }
    if (!plugin.name) {
      errors.push(`plugins[${index}] requires name.`)
    } else if (!isKebabCase(plugin.name)) {
      errors.push(`plugins[${index}].name must be kebab-case: ${plugin.name}`)
    } else if (names.has(plugin.name)) {
      errors.push(`Duplicate plugin name in marketplace: ${plugin.name}`)
    } else {
      names.add(plugin.name)
    }
    if (plugin.source === undefined || plugin.source === null) {
      errors.push(`plugins[${index}] requires source.`)
      continue
    }

    if (typeof plugin.source === 'string') {
      if (plugin.source.startsWith('./') || plugin.source.startsWith('../')) {
        const pluginDir = path.resolve(marketplaceRoot, plugin.source)
        const pluginResult = validatePluginDirectory(pluginDir)
        pluginResults.push({ name: plugin.name, ...pluginResult })
        errors.push(...pluginResult.errors.map((message) => `${plugin.name}: ${message}`))
        warnings.push(...pluginResult.warnings.map((message) => `${plugin.name}: ${message}`))
      } else {
        warnings.push(`${plugin.name}: string source is not relative; prefer an official source object for remote plugins.`)
      }
      continue
    }

    if (!isPlainObject(plugin.source)) {
      errors.push(`plugins[${index}].source must be a string or object.`)
      continue
    }
    const sourceType = plugin.source.source
    if (!['github', 'git', 'url', 'npm'].includes(sourceType)) {
      errors.push(`${plugin.name}: unsupported source.source "${sourceType}". Use github, git, url, npm, or a relative path string.`)
    }
  }

  return { errors, warnings, pluginResults }
}

function commandMarketplaceValidate(options) {
  if (options['plugin-dir']) {
    const pluginResult = validatePluginDirectory(path.resolve(String(options['plugin-dir'])))
    const result = {
      status: pluginResult.errors.length > 0 ? 'failed' : 'passed',
      errors: pluginResult.errors,
      warnings: pluginResult.warnings,
      plugin: {
        name: pluginResult.manifest?.name,
        version: pluginResult.manifest?.version,
        pluginDir: pluginResult.pluginDir,
        manifestPath: pluginResult.manifestPath,
      },
    }
    printJson(result)
    if (pluginResult.errors.length > 0) {
      process.exitCode = 2
    }
    return
  }

  const marketplacePath = resolveMarketplacePath(options)
  if (!fs.existsSync(marketplacePath)) {
    fail(`Marketplace file not found: ${marketplacePath}`)
  }
  const marketplace = loadJsonFile(marketplacePath)
  const validation = validateMarketplaceObject(marketplace, marketplacePath)
  const result = {
    status: validation.errors.length > 0 ? 'failed' : 'passed',
    marketplacePath,
    name: marketplace.name,
    pluginCount: Array.isArray(marketplace.plugins) ? marketplace.plugins.length : 0,
    errors: validation.errors,
    warnings: validation.warnings,
    plugins: validation.pluginResults.map((item) => ({
      name: item.name,
      pluginDir: item.pluginDir,
      manifestPath: item.manifestPath,
      version: item.manifest?.version,
      errors: item.errors,
      warnings: item.warnings,
    })),
  }
  printJson(result)
  if (validation.errors.length > 0) {
    process.exitCode = 2
  }
}

function commandMarketplaceExport(options) {
  const pluginDir = path.resolve(String(options['plugin-dir'] || 'plugins/agenthub-connector-plugin'))
  const pluginResult = validatePluginDirectory(pluginDir)
  if (!pluginResult.manifest) {
    fail(pluginResult.errors.join('\n'))
  }
  const outputPath = path.resolve(String(options.out || path.join('.claude-plugin', 'marketplace.json')))
  const marketplaceRoot = marketplaceRootFromFile(outputPath)
  const relativePluginDir = `./${path.relative(marketplaceRoot, pluginDir).replaceAll(path.sep, '/')}`
  const manifest = pluginResult.manifest
  const marketplace = {
    name: String(options.name || 'agenthub-enterprise'),
    owner: {
      name: String(options.owner || 'AgentHub Platform Team'),
    },
    metadata: {
      description: String(options.description || 'Enterprise Claude Code plugin marketplace exported by AgentHub.'),
      version: String(options.version || manifest.version || '0.1.0'),
      pluginRoot: '.',
      registryDoc: String(options['registry-doc'] || '/registry/skill.md'),
    },
    plugins: [
      {
        name: manifest.name,
        source: options.source ? String(options.source) : relativePluginDir,
        description: manifest.description,
        version: manifest.version,
        author: manifest.author,
        category: manifest.category || 'enterprise-development',
        tags: uniqueList([...(manifest.keywords || []), 'agenthub', 'skill-market']),
        keywords: manifest.keywords || [],
        strict: true,
      },
    ],
  }
  writeJsonFile(outputPath, marketplace)
  const validation = validateMarketplaceObject(marketplace, outputPath)
  const result = {
    status: validation.errors.length > 0 ? 'failed' : 'exported',
    outputPath,
    marketplace,
    errors: validation.errors,
    warnings: [...pluginResult.warnings, ...validation.warnings],
  }
  printJson(result)
  if (validation.errors.length > 0) {
    process.exitCode = 2
  }
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

async function commandHarnessBrowse(options) {
  const params = new URLSearchParams()
  params.set('q', String(options.q || 'harness'))
  for (const key of ['namespace', 'label', 'assetType', 'domain', 'stage', 'topology', 'stack', 'sort', 'page', 'size']) {
    if (options[key]) {
      params.set(key, String(options[key]))
    }
  }
  if (!params.has('sort')) {
    params.set('sort', 'recommended')
  }
  const data = await request('GET', `/api/v1/search/skills?${params.toString()}`, options)
  if (options.json) {
    printJson(data)
    return
  }
  for (const item of data.items || []) {
    process.stdout.write(`@${item.namespace}/${item.slug}  ${item.displayName}\n`)
  }
}

function commandHarnessScanModules(options) {
  const report = scanWorkspaceModules(path.resolve(options.dir || '.'))
  printJson(report)
}

function commandHarnessVerify(options) {
  const targetDir = path.resolve(options.dir || '.')
  const report = buildHarnessVerificationReport(targetDir)
  const outputPath = options.out
    ? path.resolve(String(options.out))
    : path.join(targetDir, '.agenthub', 'verify-report.json')
  if (options.write !== 'false') {
    writeJsonFile(outputPath, report)
  }
  printJson({ ...report, outputPath })
  if (report.status === 'failed') {
    process.exitCode = 2
  }
}

async function resolveHarnessPackageRoot(options, tempDir) {
  if (options['package-dir']) {
    return path.resolve(String(options['package-dir']))
  }
  if (!options.package) {
    fail('harness init requires --package @namespace/slug or --package-dir <path>')
  }
  const zipPath = path.join(tempDir, 'harness-package.zip')
  await downloadSkillBundle({ ...options, skill: options.package }, zipPath)
  const packageRoot = path.join(tempDir, 'package')
  fs.mkdirSync(packageRoot, { recursive: true })
  try {
    await extractZip(zipPath, { dir: packageRoot })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    fail(`Failed to unpack harness package ${options.package}: ${message}`)
  }
  return packageRoot
}

async function commandHarnessInit(options) {
  const targetDir = path.resolve(options.dir || '.')
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agenthub-cli-harness-init-'))
  try {
    const packageRoot = await resolveHarnessPackageRoot(options, tempDir)
    const manifest = loadHarnessManifest(packageRoot)
    const spec = manifest.data.spec || {}
    const templates = Array.isArray(spec.templates) ? spec.templates : []
    const templatePath = options.template
      || spec.defaultTemplate
      || (templates[0] && templates[0].path)
      || 'harness/templates/service'
    const sourceTemplateDir = path.resolve(packageRoot, templatePath)
    const inputs = resolveHarnessInputs(options, targetDir)
    const copyResult = copyTemplateTree(sourceTemplateDir, targetDir, inputs, options)
    const lockPath = path.join(targetDir, '.agenthub', 'harness.lock.json')
    const lock = {
      platform: resolveRuntime(options).baseUrl,
      generatedAt: new Date().toISOString(),
      packages: [
        {
          name: options.package || manifest.data.metadata?.name || path.basename(packageRoot),
          version: manifest.data.metadata?.version || '0.0.0',
          displayName: manifest.data.metadata?.displayName || manifest.data.metadata?.name || 'Harness Package',
          manifestPath: path.relative(targetDir, manifest.path),
          source: options['package-dir'] ? path.resolve(String(options['package-dir'])) : 'registry',
          installedAt: new Date().toISOString(),
        },
      ],
    }
    writeJsonFile(lockPath, lock)
    const verifyReport = buildHarnessVerificationReport(targetDir)
    const verifyPath = path.join(targetDir, '.agenthub', 'verify-report.json')
    writeJsonFile(verifyPath, verifyReport)
    printJson({
      status: copyResult.skipped.length > 0 ? 'partial' : 'initialized',
      targetDir,
      packageRoot,
      manifestPath: manifest.path,
      templatePath,
      copied: copyResult.copied,
      skipped: copyResult.skipped,
      lockPath,
      verifyPath,
      verifyStatus: verifyReport.status,
    })
    if (copyResult.skipped.length > 0 || verifyReport.status === 'failed') {
      process.exitCode = 2
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
}

function commandHarnessSync(options) {
  const targetDir = path.resolve(options.dir || '.')
  const lockPath = path.join(targetDir, '.agenthub', 'harness.lock.json')
  const lock = readJsonIfExists(lockPath)
  printJson({
    status: lock.packages ? 'synced' : 'missing-lock',
    targetDir,
    lockPath,
    packages: lock.packages || [],
    nextActions: lock.packages
      ? ['Run agenthub-cli harness verify --json after syncing local rules.']
      : ['Run agenthub-cli harness init before sync.'],
  })
  if (!lock.packages) {
    process.exitCode = 2
  }
}

function commandHarnessPropose(options) {
  const targetDir = path.resolve(options.dir || '.')
  const report = buildHarnessVerificationReport(targetDir)
  const proposals = report.findings.map((finding, index) => ({
    id: `proposal-${String(index + 1).padStart(3, '0')}`,
    title: finding.rule,
    severity: finding.severity,
    reason: finding.message,
    suggestion: finding.suggestion,
    command: finding.rule === 'test-source-present'
      ? 'agenthub-cli harness browse --assetType quality --json'
      : 'agenthub-cli harness browse --assetType scaffold --json',
  }))
  printJson({
    status: proposals.length > 0 ? 'proposed' : 'clean',
    targetDir,
    proposals,
    verifyStatus: report.status,
  })
}

function commandHarnessApply() {
  fail('harness apply is not implemented in this CLI phase. Use harness init, verify, and contribute --dry-run first.', 2)
}

function commandHarnessCellAdd() {
  fail('harness cell add is not implemented in this CLI phase. Use harness browse to find a package and harness init to apply a template.', 2)
}

function commandHarnessContribute(options) {
  const sourceDir = path.resolve(options.dir || '.')
  if (!options.name) {
    fail('harness contribute requires --name')
  }
  const contributionSlug = toSlug(options.name)
  const outputDir = path.resolve(options.out || path.join(sourceDir, '.agenthub', 'harness-contributions', contributionSlug))
  const scan = scanWorkspaceModules(sourceDir)
  const verifyReport = buildHarnessVerificationReport(sourceDir)
  const secretFindings = scanSecrets(sourceDir)
  const blocked = secretFindings.some((finding) => finding.severity === 'error')
  fs.rmSync(outputDir, { recursive: true, force: true })
  fs.mkdirSync(path.join(outputDir, 'harness', 'rules'), { recursive: true })
  fs.mkdirSync(path.join(outputDir, 'harness', 'recipes'), { recursive: true })
  fs.mkdirSync(path.join(outputDir, 'harness', 'templates'), { recursive: true })

  const catalog = normalizeCatalogBody({
    assetType: options.assetType || 'microservice',
    domain: options.domain,
    stage: options.stage || 'develop',
    topology: options.topology || scan.topology,
    stack: scan.stack,
    ownerTeam: options.ownerTeam || options.namespace,
    keywords: uniqueList(['harness', 'java-microservice', ...(normalizeStringList(options.keywords))]),
    maintenanceMode: 'agent',
    relations: [],
  })
  const manifest = {
    apiVersion: 'agenthub.iflytek.com/v1alpha1',
    kind: 'HarnessPackage',
    metadata: {
      name: contributionSlug,
      displayName: options.name,
      version: options.version || '0.1.0',
      ownerTeam: catalog.ownerTeam,
      minimumAgenthubCliVersion: '0.1.3',
    },
    spec: {
      target: {
        language: 'java',
        framework: scan.stack.includes('spring-boot3') ? ['spring-boot3'] : [],
        buildTool: uniqueList(scan.modules.map((moduleInfo) => moduleInfo.buildTool).filter(Boolean)),
        topology: [scan.topology],
      },
      commands: {
        verify: { recipe: 'recipes/verify.yaml' },
        contribute: { recipe: 'recipes/contribute.yaml' },
      },
      rules: [
        { id: 'scan-baseline', title: 'Scanned Java service baseline', path: 'rules/scan-summary.json' },
      ],
    },
  }

  fs.writeFileSync(path.join(outputDir, 'SKILL.md'), `# ${options.name}\n\nEnterprise Harness Package generated from ${path.basename(sourceDir)}.\n\nUse this package with \`agenthub-cli harness browse/init/verify\`.\n`, 'utf8')
  fs.writeFileSync(path.join(outputDir, 'README.md'), `# ${options.name}\n\nGenerated by \`agenthub-cli harness contribute --dry-run\`.\n\nReview generated metadata before publishing.\n`, 'utf8')
  writeStructuredFile(path.join(outputDir, 'catalog.yaml'), catalog)
  writeStructuredFile(path.join(outputDir, 'harness', 'manifest.yaml'), manifest)
  writeStructuredFile(path.join(outputDir, 'harness', 'rules', 'scan-summary.json'), { scan, verifyReport, secretFindings })
  writeStructuredFile(path.join(outputDir, 'harness', 'recipes', 'verify.yaml'), {
    steps: [
      { run: 'agenthub-cli harness scan-modules --json' },
      { run: 'agenthub-cli harness verify --json' },
    ],
  })
  writeStructuredFile(path.join(outputDir, 'harness', 'recipes', 'contribute.yaml'), {
    steps: [
      { run: 'agenthub-cli harness contribute --dry-run' },
      { run: 'agenthub-cli publish --namespace <namespace> --file <bundle.zip> --catalog-file catalog.yaml --yes' },
    ],
  })

  printJson({
    status: blocked ? 'blocked' : 'generated',
    dryRun: options['dry-run'] === true || options['dry-run'] === 'true',
    outputDir,
    catalog,
    manifestPath: path.join(outputDir, 'harness', 'manifest.yaml'),
    verifyStatus: verifyReport.status,
    secretFindings,
    nextActions: blocked
      ? ['Remove high-risk secrets before publishing this Harness Package.']
      : ['Review generated files, package them as a skill, then publish with agenthub-cli publish.'],
  })
  if (blocked) {
    process.exitCode = 2
  }
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
  harness browse [--domain order] [--topology crud-api] [--stack java21,spring-boot3] --json
  harness scan-modules --dir . --json
  harness init --package @namespace/java-microservice-harness --dir . --yes
  harness init --package-dir ./examples/harness/java-microservice-harness --dir . --yes
  harness sync --dir . --json
  harness verify --dir . --json
  harness propose --dir . --json
  harness contribute --dir . --name order-harness --dry-run
  harness apply --proposal proposal-001 --yes
  harness cell add --cell rest-crud-api --inputs cell.yaml --yes
  marketplace validate --file .claude-plugin/marketplace.json --json
  marketplace validate --plugin-dir plugins/agenthub-connector-plugin --json
  marketplace export --plugin-dir plugins/agenthub-connector-plugin --out .claude-plugin/marketplace.json --json
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

  const [command, subcommand, nested] = positional
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
    case 'harness:browse':
      await commandHarnessBrowse(options)
      return
    case 'harness:scan-modules':
      commandHarnessScanModules(options)
      return
    case 'harness:init':
      await commandHarnessInit(options)
      return
    case 'harness:sync':
      commandHarnessSync(options)
      return
    case 'harness:verify':
      commandHarnessVerify(options)
      return
    case 'harness:propose':
      commandHarnessPropose(options)
      return
    case 'harness:contribute':
      commandHarnessContribute(options)
      return
    case 'harness:apply':
      commandHarnessApply(options)
      return
    case 'harness:cell':
      if (nested === 'add') {
        commandHarnessCellAdd(options)
        return
      }
      break
    case 'marketplace:validate':
      commandMarketplaceValidate(options)
      return
    case 'marketplace:export':
      commandMarketplaceExport(options)
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
