import { Copy } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { useCopyToClipboard } from '@/shared/lib/clipboard'

type CopyCommandBlockProps = {
  title: string
  description?: string
  code: string
}

export function CopyCommandBlock({ title, description, code }: CopyCommandBlockProps) {
  const [copied, copy] = useCopyToClipboard()

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-slate-100 shadow-[0_18px_42px_-28px_rgba(15,23,42,0.8)]">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="text-sm font-semibold text-white">{title}</div>
          {description ? <div className="text-xs leading-5 text-slate-400">{description}</div> : null}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 rounded-lg text-slate-300 hover:bg-white/10 hover:text-white"
          onClick={() => copy(code)}
          aria-label={copied ? '已复制' : '复制命令'}
          title={copied ? '已复制' : '复制命令'}
        >
          <Copy className="h-4 w-4" />
        </Button>
      </div>
      <pre className="whitespace-pre-wrap break-all text-[13px] leading-6 text-slate-200">
        <code>{code}</code>
      </pre>
    </div>
  )
}
