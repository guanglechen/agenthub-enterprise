#!/usr/bin/env node

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const pluginRoot = path.resolve(scriptDir, '..')
const repoRoot = path.resolve(pluginRoot, '..', '..')

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

function printJson(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`)
}

function readJsonFile(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function resolveWorkspace(options) {
  return path.resolve(options.workspace || process.cwd())
}

function loadConfig(workspace, options) {
  const explicitConfig = options.config ? path.resolve(options.config) : null
  const defaultConfig = path.join(workspace, '.claude', 'agenthub.json')
  const configPath = explicitConfig || (fs.existsSync(defaultConfig) ? defaultConfig : null)
  if (!configPath) {
    return {}
  }
  return readJsonFile(configPath)
}

function resolveCliBinary() {
  if (process.env.AGENTHUB_CLI_BIN) {
    return process.env.AGENTHUB_CLI_BIN
  }
  const repoLocal = path.join(repoRoot, 'bin', 'agenthub-cli')
  if (fs.existsSync(repoLocal)) {
    return repoLocal
  }
  fail('Unable to locate agenthub-cli. Set AGENTHUB_CLI_BIN or run from the AgentHub repository.')
}

function buildCliEnv(config) {
  return {
    ...process.env,
    AGENTHUB_BASE_URL: process.env.AGENTHUB_BASE_URL || config.baseUrl || '',
    AGENTHUB_TOKEN: process.env.AGENTHUB_TOKEN || config.token || '',
  }
}

function runCli(cliArgs, config) {
  const cliBinary = resolveCliBinary()
  const result = spawnSync(cliBinary, cliArgs, {
    cwd: repoRoot,
    encoding: 'utf8',
    env: buildCliEnv(config),
  })
  if (result.status !== 0) {
    fail(result.stderr.trim() || result.stdout.trim() || `agenthub-cli failed: ${cliArgs.join(' ')}`, result.status || 1)
  }
  return result.stdout.trim()
}

function splitSkillCoordinate(value) {
  const normalized = value.startsWith('@') ? value.slice(1) : value
  const [namespace, slug] = normalized.split('/', 2)
  if (!namespace || !slug) {
    fail(`Invalid skill coordinate: ${value}`)
  }
  return { namespace, slug }
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

function fileContains(filePath, text) {
  return fs.existsSync(filePath) && fs.readFileSync(filePath, 'utf8').includes(text)
}

function detectWorkspaceContext(workspace, options, config) {
  const pomPath = path.join(workspace, 'pom.xml')
  const gradlePath = path.join(workspace, 'build.gradle')
  const gradleKtsPath = path.join(workspace, 'build.gradle.kts')
  const packageJsonPath = path.join(workspace, 'package.json')
  const srcMainJava = path.join(workspace, 'src', 'main', 'java')
  const srcTestJava = path.join(workspace, 'src', 'test', 'java')

  const stack = new Set(normalizeStringList(options.stack || config.stack))
  const keywords = new Set(normalizeStringList(options.keywords || config.keywords))

  let language = options.language || config.language || 'unknown'
  let framework = options.framework || config.framework || null

  if (fs.existsSync(pomPath) || fs.existsSync(gradlePath) || fs.existsSync(gradleKtsPath)) {
    language = 'java'
  }
  if (fs.existsSync(pomPath)) {
    stack.add('maven')
  }
  if (fs.existsSync(gradlePath) || fs.existsSync(gradleKtsPath)) {
    stack.add('gradle')
  }
  if (fileContains(pomPath, 'spring-boot') || fileContains(gradlePath, 'spring-boot') || fileContains(gradleKtsPath, 'spring-boot')) {
    framework = framework || 'spring-boot3'
    stack.add('spring-boot3')
  }
  if (fileContains(pomPath, '<java.version>21</java.version>') || fileContains(gradlePath, 'JavaVersion.VERSION_21') || fileContains(gradleKtsPath, 'JavaVersion.VERSION_21')) {
    stack.add('java21')
  } else if (language === 'java') {
    stack.add('java')
  }
  if (fs.existsSync(packageJsonPath)) {
    stack.add('node')
  }

  const hasJavaSources = fs.existsSync(srcMainJava) || fs.existsSync(srcTestJava)
  const newProject = options.newProject === true || options.newProject === 'true'
    ? true
    : options.newProject === 'false'
      ? false
      : (config.newProject ?? !hasJavaSources)

  let topology = options.topology || config.topology || 'crud-api'
  if (topology === 'crud-api') {
    const workspaceName = path.basename(workspace).toLowerCase()
    if (workspaceName.includes('bff') || workspaceName.includes('gateway')) {
      topology = 'bff'
    } else if (workspaceName.includes('batch')) {
      topology = 'batch'
    } else if (workspaceName.includes('consumer') || workspaceName.includes('event')) {
      topology = 'event-consumer'
    }
  }

  return {
    workspaceName: options.workspaceName || config.workspaceName || path.basename(workspace),
    language,
    framework,
    newProject,
    assetType: options.assetType || config.assetType || (newProject ? 'scaffold' : 'microservice'),
    domain: options.domain || config.domain || null,
    stage: options.stage || config.stage || (newProject ? 'bootstrap' : 'develop'),
    topology,
    stack: Array.from(stack),
    keywords: Array.from(keywords),
    namespace: options.namespace || config.namespace || null,
  }
}

function writeTempJson(data) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agenthub-plugin-'))
  const filePath = path.join(tempDir, 'context.json')
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
  return { tempDir, filePath }
}

function installSkill(skillCoordinate, targetDir, config) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agenthub-install-'))
  try {
    const { namespace, slug } = splitSkillCoordinate(skillCoordinate)
    const zipPath = path.join(tempDir, `${namespace}--${slug}.zip`)
    runCli(['download', '--skill', skillCoordinate, '--out', zipPath], config)

    const installDir = path.resolve(targetDir, `${namespace}--${slug}`)
    fs.rmSync(installDir, { recursive: true, force: true })
    fs.mkdirSync(installDir, { recursive: true })

    const unzip = spawnSync('python3', ['-m', 'zipfile', '-e', zipPath, installDir], { encoding: 'utf8' })
    if (unzip.status !== 0) {
      fail(unzip.stderr.trim() || unzip.stdout.trim() || `Failed to unpack ${skillCoordinate}`, unzip.status || 1)
    }
    const skillMdPath = path.join(installDir, 'SKILL.md')
    if (!fs.existsSync(skillMdPath)) {
      fail(`Installed skill is missing SKILL.md: ${skillCoordinate}`)
    }
    return { coordinate: skillCoordinate, installDir, skillMdPath }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
}

function printHelp() {
  process.stdout.write(`agenthub-connector-plugin commands:
  profile [--json]
  detect-context [--workspace <dir>] [--json]
  install-plan [--context-file context.json | --workspace <dir>] [--json]
  install-skill --skill @namespace/slug [--target .claude/skills]
  apply-install-plan [--context-file context.json | --workspace <dir>] [--mode required|all] [--target .claude/skills] [--json]
`)
}

async function main() {
  const { positional, options } = parseArgs(process.argv.slice(2))
  if (positional.length === 0 || options.help) {
    printHelp()
    return
  }

  const workspace = resolveWorkspace(options)
  const config = loadConfig(workspace, options)
  const [command] = positional

  switch (command) {
    case 'profile': {
      const profile = JSON.parse(runCli(['agent', 'profile', '--json'], config))
      printJson(profile)
      return
    }
    case 'detect-context': {
      printJson(detectWorkspaceContext(workspace, options, config))
      return
    }
    case 'install-plan': {
      const context = options['context-file']
        ? readJsonFile(path.resolve(options['context-file']))
        : detectWorkspaceContext(workspace, options, config)
      const temp = writeTempJson(context)
      try {
        const plan = JSON.parse(runCli(['agent', 'install-plan', '--context-file', temp.filePath, '--json'], config))
        printJson(plan)
      } finally {
        fs.rmSync(temp.tempDir, { recursive: true, force: true })
      }
      return
    }
    case 'install-skill': {
      if (!options.skill) {
        fail('install-skill requires --skill @namespace/slug')
      }
      const targetDir = path.resolve(options.target || config.installTargetDir || path.join(workspace, '.claude', 'skills'))
      const result = installSkill(options.skill, targetDir, config)
      printJson(result)
      return
    }
    case 'apply-install-plan': {
      const context = options['context-file']
        ? readJsonFile(path.resolve(options['context-file']))
        : detectWorkspaceContext(workspace, options, config)
      const temp = writeTempJson(context)
      try {
        const plan = JSON.parse(runCli(['agent', 'install-plan', '--context-file', temp.filePath, '--json'], config))
        const targetDir = path.resolve(options.target || config.installTargetDir || path.join(workspace, '.claude', 'skills'))
        const mode = options.mode || 'required'
        const selected = mode === 'all'
          ? [...(plan.requiredSkills || []), ...(plan.recommendedSkills || [])]
          : [...(plan.requiredSkills || [])]
        const installed = selected.map((item) =>
          installSkill(`@${item.namespace}/${item.slug}`, targetDir, config),
        )
        printJson({
          mode,
          targetDir,
          installed,
          nextActions: plan.nextActions || [],
        })
      } finally {
        fs.rmSync(temp.tempDir, { recursive: true, force: true })
      }
      return
    }
    default:
      printHelp()
      process.exitCode = 1
  }
}

await main()
