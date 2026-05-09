import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Copy } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { useCopyToClipboard } from '@/shared/lib/clipboard'
import { buildAgenthubCliSkillInstallCommand, getAppBaseUrl } from '@/shared/lib/agenthub-cli'

interface InstallCommandProps {
  namespace: string
  slug: string
  version?: string
}

export function buildInstallTarget(namespace: string, slug: string): string {
  return namespace === 'global' ? slug : `${namespace}--${slug}`
}

export function getBaseUrl(): string {
  return getAppBaseUrl()
}

export function buildInstallCommand(namespace: string, slug: string, baseUrl: string, version?: string): string {
  return buildAgenthubCliSkillInstallCommand(namespace, slug, baseUrl, version)
}

export function InstallCommand({ namespace, slug, version }: InstallCommandProps) {
  const { t } = useTranslation()
  const [copied, copy] = useCopyToClipboard()

  const baseUrl = useMemo(() => getBaseUrl(), [])

  const command = useMemo(() => buildInstallCommand(namespace, slug, baseUrl, version), [baseUrl, namespace, slug, version])

  const handleCopy = async () => {
    try {
      await copy(command)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <div className="relative overflow-hidden rounded-xl border border-border/60 bg-muted/50">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handleCopy}
        title={copied ? t('copyButton.copied') : t('copyButton.copy')}
        aria-label={copied ? t('copyButton.copied') : t('copyButton.copy')}
        className="absolute right-2 top-2 z-10 h-8 w-8 rounded-md bg-background/80 backdrop-blur hover:bg-background"
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </Button>
      <pre className="px-4 py-3 pr-14 whitespace-pre-wrap break-all">
        <code className="font-mono text-[13px] leading-relaxed text-foreground whitespace-pre-wrap break-all sm:text-sm">
          {command}
        </code>
      </pre>
    </div>
  )
}
