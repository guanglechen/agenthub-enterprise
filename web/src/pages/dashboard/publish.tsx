import { useEffect, useMemo, useState } from 'react'
import { Link, useSearch } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import YAML from 'yaml'
import type { PublishResult } from '@/api/types'
import { UploadZone } from '@/features/publish/upload-zone'
import {
  extractPrecheckWarnings,
  isFrontmatterFailureMessage,
  isPrecheckConfirmationMessage,
  isPrecheckFailureMessage,
  isVersionExistsMessage,
} from '@/features/publish/publish-error-utils'
import { normalizePublishPrefill } from '@/features/publish/publish-prefill'
import { Button } from '@/shared/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  normalizeSelectValue,
} from '@/shared/ui/select'
import { Label } from '@/shared/ui/label'
import { Card } from '@/shared/ui/card'
import { usePublishSkill, useUpdateSkillCatalog } from '@/shared/hooks/use-skill-queries'
import { useMyNamespaces } from '@/shared/hooks/use-namespace-queries'
import { ConfirmDialog } from '@/shared/components/confirm-dialog'
import { CopyCommandBlock } from '@/shared/components/copy-command-block'
import { toast } from '@/shared/lib/toast'
import { ApiError } from '@/api/client'
import { ASSET_TYPE_OPTIONS, MAINTENANCE_MODE_OPTIONS, STAGE_OPTIONS, TOPOLOGY_OPTIONS } from '@/shared/lib/catalog'
import { ASSET_FAMILY_OPTIONS } from '@/shared/lib/asset-taxonomy'
import { buildAgenthubCliInstallPackageCommand, getAppBaseUrl } from '@/shared/lib/agenthub-cli'
import { Input } from '@/shared/ui/input'
import { Textarea } from '@/shared/ui/textarea'

const EMPTY_NAMESPACE_VALUE = '__select_namespace__'
const EMPTY_SELECT_VALUE = '__select__'

type PublishMode = 'manual' | 'automation'

type CatalogFormState = {
  assetFamily: string
  assetType: string
  domain: string
  stage: string
  topology: string
  stack: string
  ownerTeam: string
  keywords: string
  maintenanceMode: string
  relationsJson: string
}

const EMPTY_CATALOG_FORM: CatalogFormState = {
  assetFamily: '',
  assetType: '',
  domain: '',
  stage: '',
  topology: '',
  stack: '',
  ownerTeam: '',
  keywords: '',
  maintenanceMode: '',
  relationsJson: '',
}

export function PublishPage() {
  const { t } = useTranslation()
  const search = useSearch({ from: '/dashboard/publish' })
  const prefill = normalizePublishPrefill(search)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [namespaceSlug, setNamespaceSlug] = useState<string>(prefill.namespace)
  const [visibility, setVisibility] = useState<string>(prefill.visibility)
  const [warningDialogOpen, setWarningDialogOpen] = useState(false)
  const [precheckWarnings, setPrecheckWarnings] = useState<string[]>([])
  const [catalogForm, setCatalogForm] = useState<CatalogFormState>(EMPTY_CATALOG_FORM)
  const [publishResult, setPublishResult] = useState<PublishResult | null>(null)
  const [publishMode, setPublishMode] = useState<PublishMode>('manual')
  const [catalogExpanded, setCatalogExpanded] = useState(false)
  const [relationsExpanded, setRelationsExpanded] = useState(false)

  const { data: namespaces, isLoading: isLoadingNamespaces } = useMyNamespaces()
  const publishMutation = usePublishSkill()
  const updateCatalogMutation = useUpdateSkillCatalog()
  const selectedNamespace = namespaces?.find((ns) => ns.slug === namespaceSlug)
  const baseUrl = useMemo(() => getAppBaseUrl(), [])
  const namespaceOnlyLabel = selectedNamespace?.type === 'GLOBAL'
    ? t('publish.visibilityOptions.loggedInUsersOnly')
    : t('publish.visibilityOptions.namespaceOnly')

  useEffect(() => {
    setNamespaceSlug(prefill.namespace)
    setVisibility(prefill.visibility)
  }, [prefill.namespace, prefill.visibility])

  const handleRemoveSelectedFile = () => {
    setSelectedFile(null)
    setPrecheckWarnings([])
    setWarningDialogOpen(false)
  }

  const handleFileSelect = (file: File | null) => {
    setSelectedFile(file)
    setPrecheckWarnings([])
    setWarningDialogOpen(false)
  }

  const parseCsv = (value: string) =>
    value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)

  const buildCatalogRequest = () => {
    const relations = catalogForm.relationsJson.trim()
      ? JSON.parse(catalogForm.relationsJson)
      : []
    return {
      assetType: catalogForm.assetType || undefined,
      domain: catalogForm.domain.trim() || undefined,
      stage: catalogForm.stage || undefined,
      topology: catalogForm.topology || undefined,
      stack: parseCsv(catalogForm.stack),
      ownerTeam: catalogForm.ownerTeam.trim() || undefined,
      keywords: parseCsv(catalogForm.keywords),
      maintenanceMode: catalogForm.maintenanceMode || undefined,
      relations,
    }
  }

  const hasCatalogInput = () => {
    return Object.values(catalogForm).some((value) => value.trim().length > 0)
  }

  const handleCatalogImport = async (file: File | null) => {
    if (!file) {
      return
    }
    try {
      const raw = await file.text()
      const parsed = file.name.endsWith('.yaml') || file.name.endsWith('.yml')
        ? YAML.parse(raw)
        : JSON.parse(raw)
      setCatalogForm({
        assetFamily: parsed?.assetFamily ?? '',
        assetType: parsed?.assetType ?? '',
        domain: parsed?.domain ?? '',
        stage: parsed?.stage ?? '',
        topology: parsed?.topology ?? '',
        stack: Array.isArray(parsed?.stack) ? parsed.stack.join(', ') : '',
        ownerTeam: parsed?.ownerTeam ?? '',
        keywords: Array.isArray(parsed?.keywords) ? parsed.keywords.join(', ') : '',
        maintenanceMode: parsed?.maintenanceMode ?? '',
        relationsJson: Array.isArray(parsed?.relations) ? JSON.stringify(parsed.relations, null, 2) : '',
      })
      toast.success('已导入目录元数据')
    } catch (error) {
      toast.error('导入失败', error instanceof Error ? error.message : '无法解析 catalog 文件')
    }
  }

  const publishSkill = async (confirmWarnings = false) => {
    if (!selectedFile || !namespaceSlug) {
      toast.error(t('publish.selectRequired'))
      return
    }

    try {
      const result = await publishMutation.mutateAsync({
        namespace: namespaceSlug,
        file: selectedFile,
        visibility,
        confirmWarnings,
      })
      setPrecheckWarnings([])
      setWarningDialogOpen(false)
      if (hasCatalogInput()) {
        try {
          await updateCatalogMutation.mutateAsync({
            namespace: result.namespace,
            slug: result.slug,
            body: buildCatalogRequest(),
          })
        } catch (catalogError) {
          toast.error('Skill 已上传，但目录元数据写入失败', catalogError instanceof Error ? catalogError.message : '')
        }
      }
      const skillLabel = `${result.namespace}/${result.slug}@${result.version}`
      setPublishResult(result)
      if (result.status === 'PUBLISHED') {
        toast.success(
          t('publish.publishedTitle'),
          t('publish.publishedDescription', { skill: skillLabel })
        )
      } else {
        toast.success(
          t('publish.pendingReviewTitle'),
          t('publish.pendingReviewDescription', { skill: skillLabel })
        )
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 408) {
        toast.error(t('publish.timeoutTitle'), t('publish.timeoutDescription'))
        return
      }

      if (error instanceof ApiError && isVersionExistsMessage(error.serverMessage || error.message)) {
        toast.error(
          t('publish.versionExistsTitle'),
          t('publish.versionExistsDescription'),
        )
        return
      }

      if (error instanceof ApiError && isPrecheckConfirmationMessage(error.serverMessage || error.message)) {
        setPrecheckWarnings(extractPrecheckWarnings(error.serverMessage || error.message))
        setWarningDialogOpen(true)
        return
      }

      if (error instanceof ApiError && isPrecheckFailureMessage(error.serverMessage || error.message)) {
        toast.error(
          t('publish.precheckFailedTitle'),
          error.serverMessage || t('publish.precheckFailedDescription'),
        )
        return
      }

      if (error instanceof ApiError && isFrontmatterFailureMessage(error.serverMessage || error.message)) {
        toast.error(
          t('publish.frontmatterFailedTitle'),
          error.serverMessage || t('publish.frontmatterFailedDescription'),
        )
        return
      }

      toast.error(t('publish.error'), error instanceof Error ? error.message : '')
    }
  }

  const handlePublish = async () => {
    await publishSkill(false)
  }

  const publishSteps = [
    ['1', '上传包', selectedFile ? '已选择文件' : '选择命名空间和 ZIP 包'],
    ['2', '补目录', hasCatalogInput() ? '已填写目录画像' : '可导入 catalog 文件'],
    ['3', '验证', publishResult ? '可执行 CLI 验证' : '发布后进入详情和推荐验证'],
  ] as const

  const automationNamespace = namespaceSlug || 'team-alpha'
  const automationCommand = [
    buildAgenthubCliInstallPackageCommand(baseUrl),
    `agenthub-cli login --base-url ${baseUrl} --token sk_your_api_token_here`,
    'agenthub-cli search --q "order service scaffold" --json',
    `agenthub-cli publish --namespace ${automationNamespace} --file ./skill.zip --catalog-file ./catalog.json --yes --json`,
    `agenthub-cli relations sync --skill @${automationNamespace}/your-skill --file ./relations.json --yes --json`,
    `agenthub-cli recommend --skill @${automationNamespace}/your-skill --json`,
  ].join('\n')

  return (
    <div className="mx-auto max-w-5xl space-y-6 animate-fade-up">
      <Card className="enterprise-panel border-0 p-6 shadow-none">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-rose-700">Publish</div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">选择发布方式</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              手工发布只保留上传必填项；目录画像、关系和推荐验证放到后续步骤。Agent/CI 批量发布走 CLI 命令。
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
            审核默认关闭 · 快速积累
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {([
            ['manual', '手工发布', '选择空间、上传 ZIP，可选补充目录画像。'],
            ['automation', 'Agent / CI 批量发布', '复制 CLI 命令，由用户或流水线注入 token。'],
          ] as const).map(([mode, title, description]) => (
            <button
              key={mode}
              type="button"
              onClick={() => setPublishMode(mode)}
              className={`rounded-[24px] border p-5 text-left transition-all ${
                publishMode === mode
                  ? 'border-slate-950 bg-slate-950 text-white shadow-[0_18px_42px_-30px_rgba(15,23,42,0.85)]'
                  : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className="text-base font-semibold">{title}</div>
              <p className={`mt-2 text-sm leading-6 ${publishMode === mode ? 'text-white/70' : 'text-slate-500'}`}>
                {description}
              </p>
            </button>
          ))}
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {publishSteps.map(([step, title, state]) => (
            <div key={step} className="rounded-2xl border border-slate-200 bg-white/85 p-4">
              <div className="text-xs font-semibold text-rose-700">Step {step}</div>
              <div className="mt-1 text-sm font-semibold text-slate-950">{title}</div>
              <div className="mt-1 text-xs leading-5 text-slate-500">{state}</div>
            </div>
          ))}
        </div>
      </Card>

      {publishResult ? (
        <Card className="enterprise-panel border-0 p-6 shadow-none">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-sm font-semibold text-emerald-700">发布成功</div>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">@{publishResult.namespace}/{publishResult.slug}</h2>
              <p className="mt-2 text-sm text-slate-600">
                v{publishResult.version} · {publishResult.status} · 现在可以进入详情页检查资产画像，也可以用 CLI 验证推荐链路。
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/space/$namespace/$slug"
                params={{ namespace: publishResult.namespace, slug: encodeURIComponent(publishResult.slug) }}
                className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white"
              >
                查看详情页
              </Link>
              <Link
                to="/search"
                search={{ q: publishResult.slug, sort: 'recommended', page: 0, starredOnly: false }}
                className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                在市场中验证
              </Link>
            </div>
          </div>
          <pre className="mt-5 whitespace-pre-wrap rounded-2xl bg-slate-950 p-4 text-sm leading-6 text-slate-100">
            <code>{`agenthub-cli inspect --skill @${publishResult.namespace}/${publishResult.slug} --json\nagenthub-cli recommend --skill @${publishResult.namespace}/${publishResult.slug} --json`}</code>
          </pre>
        </Card>
      ) : null}

      {publishMode === 'automation' ? (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <CopyCommandBlock
            title="Agent / CI 批量发布命令"
            description="平台不自动申请 token。由用户、CI 或运行环境提供 token 后执行。"
            code={automationCommand}
          />
          <Card className="space-y-4 border-slate-200 p-5">
            <div>
              <div className="text-sm font-semibold text-slate-950">自动化发布约定</div>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                先查重，再发布，再补 catalog、labels、relations，最后用 recommend 验证是否进入正确发现链路。
              </p>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
              <div className="font-semibold">重名处理</div>
              <p className="mt-1">若 namespace/slug/version 已存在，直接修改 slug 或 version 后重传，不进入审核排队。</p>
            </div>
            <button
              type="button"
              onClick={() => setPublishMode('manual')}
              className="w-full rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              切回手工上传
            </button>
          </Card>
        </div>
      ) : (
        <Card className="space-y-6 border-slate-200 p-6 shadow-sm">
          <div className="flex flex-col gap-2 border-b border-slate-100 pb-5 md:flex-row md:items-end md:justify-between">
            <div>
              <h3 className="text-xl font-semibold tracking-tight text-slate-950">手工上传 Skill</h3>
              <p className="mt-1 text-sm leading-6 text-slate-500">先完成必要信息。目录画像和关系可以后补，不阻塞上传。</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
              必填 3 项
            </span>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <div className="space-y-3">
              <Label htmlFor="namespace" className="text-sm font-semibold font-heading">{t('publish.namespace')}</Label>
              {isLoadingNamespaces ? (
                <div className="h-11 animate-shimmer rounded-lg" />
              ) : (
                <Select
                  value={normalizeSelectValue(namespaceSlug) ?? EMPTY_NAMESPACE_VALUE}
                  onValueChange={(value) => {
                    setNamespaceSlug(value === EMPTY_NAMESPACE_VALUE ? '' : value)
                  }}
                >
                  <SelectTrigger id="namespace">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={EMPTY_NAMESPACE_VALUE}>{t('publish.selectNamespace')}</SelectItem>
                    {namespaces?.map((ns) => (
                      <SelectItem key={ns.id} value={ns.slug}>
                        {ns.displayName} (@{ns.slug})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-3">
              <Label htmlFor="visibility" className="text-sm font-semibold font-heading">{t('publish.visibility')}</Label>
              <Select value={visibility} onValueChange={setVisibility}>
                <SelectTrigger id="visibility">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PUBLIC">{t('publish.visibilityOptions.public')}</SelectItem>
                  <SelectItem value="NAMESPACE_ONLY">{namespaceOnlyLabel}</SelectItem>
                  <SelectItem value="PRIVATE">{t('publish.visibilityOptions.private')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-semibold font-heading">{t('publish.file')}</Label>
            <UploadZone
              key={selectedFile ? `${selectedFile.name}-${selectedFile.lastModified}` : 'empty'}
              onFileSelect={handleFileSelect}
              disabled={publishMutation.isPending}
            />
            {selectedFile && (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-secondary/30 px-4 py-3">
                <div className="min-w-0 text-sm text-muted-foreground flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="truncate">
                    {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRemoveSelectedFile}
                  disabled={publishMutation.isPending}
                >
                  {t('publish.removeSelectedFile')}
                </Button>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/70">
            <div className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-950">目录画像</div>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  可选。用于搜索、推荐和团队能力地图；不填写也可以先发布。
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <label className="cursor-pointer rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  导入 catalog
                  <input
                    type="file"
                    accept=".json,.yaml,.yml"
                    className="hidden"
                    onChange={(event) => {
                      void handleCatalogImport(event.target.files?.[0] ?? null)
                      setCatalogExpanded(true)
                    }}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setCatalogExpanded((current) => !current)}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  {catalogExpanded ? '收起字段' : hasCatalogInput() ? '查看已填字段' : '手工填写'}
                </button>
              </div>
            </div>

            {catalogExpanded ? (
              <div className="space-y-5 border-t border-slate-200 bg-white p-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>资产族</Label>
                    <Select
                      value={normalizeSelectValue(catalogForm.assetFamily) ?? EMPTY_SELECT_VALUE}
                      onValueChange={(value) => setCatalogForm((current) => ({ ...current, assetFamily: value === EMPTY_SELECT_VALUE ? '' : value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={EMPTY_SELECT_VALUE}>未指定</SelectItem>
                        {ASSET_FAMILY_OPTIONS.map((option) => (
                          <SelectItem key={option.id} value={option.id}>{option.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>资产类型</Label>
                    <Select
                      value={normalizeSelectValue(catalogForm.assetType) ?? EMPTY_SELECT_VALUE}
                      onValueChange={(value) => setCatalogForm((current) => ({ ...current, assetType: value === EMPTY_SELECT_VALUE ? '' : value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={EMPTY_SELECT_VALUE}>未指定</SelectItem>
                        {ASSET_TYPE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>业务域</Label>
                    <Input value={catalogForm.domain} onChange={(event) => setCatalogForm((current) => ({ ...current, domain: event.target.value }))} placeholder="order / payment" />
                  </div>
                  <div className="space-y-2">
                    <Label>适用阶段</Label>
                    <Select
                      value={normalizeSelectValue(catalogForm.stage) ?? EMPTY_SELECT_VALUE}
                      onValueChange={(value) => setCatalogForm((current) => ({ ...current, stage: value === EMPTY_SELECT_VALUE ? '' : value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={EMPTY_SELECT_VALUE}>未指定</SelectItem>
                        {STAGE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>技术拓扑</Label>
                    <Select
                      value={normalizeSelectValue(catalogForm.topology) ?? EMPTY_SELECT_VALUE}
                      onValueChange={(value) => setCatalogForm((current) => ({ ...current, topology: value === EMPTY_SELECT_VALUE ? '' : value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={EMPTY_SELECT_VALUE}>未指定</SelectItem>
                        {TOPOLOGY_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>技术栈</Label>
                    <Input value={catalogForm.stack} onChange={(event) => setCatalogForm((current) => ({ ...current, stack: event.target.value }))} placeholder="java21, spring-boot3, maven" />
                  </div>
                  <div className="space-y-2">
                    <Label>责任团队</Label>
                    <Input value={catalogForm.ownerTeam} onChange={(event) => setCatalogForm((current) => ({ ...current, ownerTeam: event.target.value }))} placeholder="platform-agent-team" />
                  </div>
                  <div className="space-y-2">
                    <Label>关键字</Label>
                    <Input value={catalogForm.keywords} onChange={(event) => setCatalogForm((current) => ({ ...current, keywords: event.target.value }))} placeholder="bootstrap, spring, contract-test" />
                  </div>
                  <div className="space-y-2">
                    <Label>维护模式</Label>
                    <Select
                      value={normalizeSelectValue(catalogForm.maintenanceMode) ?? EMPTY_SELECT_VALUE}
                      onValueChange={(value) => setCatalogForm((current) => ({ ...current, maintenanceMode: value === EMPTY_SELECT_VALUE ? '' : value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={EMPTY_SELECT_VALUE}>未指定</SelectItem>
                        {MAINTENANCE_MODE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setRelationsExpanded((current) => !current)}
                    className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left text-sm font-semibold text-slate-800"
                  >
                    <span>高级：关联关系 JSON</span>
                    <span className="text-xs text-slate-500">{relationsExpanded ? '收起' : catalogForm.relationsJson.trim() ? '已填写' : '可后补'}</span>
                  </button>
                  {relationsExpanded ? (
                    <div className="border-t border-slate-200 p-4">
                      <Textarea
                        rows={6}
                        value={catalogForm.relationsJson}
                        onChange={(event) => setCatalogForm((current) => ({ ...current, relationsJson: event.target.value }))}
                        placeholder='[{"type":"recommendedWith","target":"@global/java-bootstrap","title":"Java 初始化脚手架"}]'
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>

          <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-600 md:grid-cols-2">
            <div>
              <div className="font-semibold text-slate-950">重名处理</div>
              <p className="mt-1">若 namespace/slug/version 已存在，修改 slug 或 version 后重传。</p>
            </div>
            <div>
              <div className="font-semibold text-slate-950">推荐验证</div>
              <p className="mt-1">发布成功后用详情页或 `agenthub-cli recommend` 检查发现链路。</p>
            </div>
          </div>

          <Button
            className="w-full text-primary-foreground disabled:text-primary-foreground"
            size="lg"
            onClick={handlePublish}
            disabled={!selectedFile || !namespaceSlug || publishMutation.isPending}
          >
            {publishMutation.isPending ? t('publish.publishing') : t('publish.confirm')}
          </Button>
        </Card>
      )}

      <ConfirmDialog
        open={warningDialogOpen}
        onOpenChange={setWarningDialogOpen}
        title={t('publish.warningConfirmTitle')}
        description={(
          <div className="space-y-3 text-left">
            <p>{t('publish.warningConfirmDescription')}</p>
            {precheckWarnings.length > 0 && (
              <ul className="list-disc space-y-1 pl-5">
                {precheckWarnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            )}
          </div>
        )}
        confirmText={t('publish.warningConfirmContinue')}
        cancelText={t('publish.warningConfirmCancel')}
        onConfirm={() => publishSkill(true)}
      />
    </div>
  )
}
