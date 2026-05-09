import { useEffect, useState } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import YAML from 'yaml'
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
import { DashboardPageHeader } from '@/shared/components/dashboard-page-header'
import { toast } from '@/shared/lib/toast'
import { ApiError } from '@/api/client'
import { ASSET_TYPE_OPTIONS, MAINTENANCE_MODE_OPTIONS, STAGE_OPTIONS, TOPOLOGY_OPTIONS } from '@/shared/lib/catalog'
import { Input } from '@/shared/ui/input'
import { Textarea } from '@/shared/ui/textarea'

const EMPTY_NAMESPACE_VALUE = '__select_namespace__'
const EMPTY_SELECT_VALUE = '__select__'

type CatalogFormState = {
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
  const navigate = useNavigate()
  const search = useSearch({ from: '/dashboard/publish' })
  const prefill = normalizePublishPrefill(search)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [namespaceSlug, setNamespaceSlug] = useState<string>(prefill.namespace)
  const [visibility, setVisibility] = useState<string>(prefill.visibility)
  const [warningDialogOpen, setWarningDialogOpen] = useState(false)
  const [precheckWarnings, setPrecheckWarnings] = useState<string[]>([])
  const [catalogForm, setCatalogForm] = useState<CatalogFormState>(EMPTY_CATALOG_FORM)

  const { data: namespaces, isLoading: isLoadingNamespaces } = useMyNamespaces()
  const publishMutation = usePublishSkill()
  const updateCatalogMutation = useUpdateSkillCatalog()
  const selectedNamespace = namespaces?.find((ns) => ns.slug === namespaceSlug)
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
      navigate({ to: '/dashboard/skills' })
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

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-fade-up">
      <DashboardPageHeader title={t('publish.title')} subtitle={t('publish.subtitle')} />

      <Card className="p-4 bg-blue-500/5 border-blue-500/20">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-foreground mb-1">{t('publish.reviewNotice.title')}</h3>
            <p className="text-sm text-muted-foreground">{t('publish.reviewNotice.description')}</p>
          </div>
        </div>
      </Card>

      <Card className="p-8 space-y-8">
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

        <div className="space-y-4 rounded-2xl border border-border/60 bg-secondary/10 p-5">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <div className="text-sm font-semibold text-foreground">企业目录元数据</div>
              <p className="mt-1 text-sm text-muted-foreground">可手工填写，也可导入 `catalog.json / catalog.yaml`。发布成功后会自动写入 Skill 目录画像。</p>
            </div>
            <label className="cursor-pointer rounded-lg border border-border/60 bg-background px-3 py-2 text-sm text-muted-foreground">
              导入 catalog 文件
              <input
                type="file"
                accept=".json,.yaml,.yml"
                className="hidden"
                onChange={(event) => handleCatalogImport(event.target.files?.[0] ?? null)}
              />
            </label>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
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
          <div className="space-y-2">
            <Label>关联关系 JSON</Label>
            <Textarea
              rows={6}
              value={catalogForm.relationsJson}
              onChange={(event) => setCatalogForm((current) => ({ ...current, relationsJson: event.target.value }))}
              placeholder='[{"type":"recommendedWith","target":"@global/java-bootstrap","title":"Java 初始化脚手架"}]'
            />
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
