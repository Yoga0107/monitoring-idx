import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

export function ErrorPanel({ message, onRetry, className }: { message: string; onRetry?: () => void; className?: string }) {
  return (
    <div role="alert" className={`flex flex-col items-center justify-center gap-2 text-center p-6 ${className ?? ""}`}>
      <Icon name="error" size={28} className="text-error" />
      <p className="font-body-md text-body-md text-on-surface">Data could not be loaded</p>
      <p className="font-body-sm text-body-sm text-on-surface-variant max-w-md">{message}</p>
      {onRetry && (
        <Button onClick={onRetry} className="mt-1">
          <Icon name="refresh" size={14} />
          <span className="font-label-caps text-label-caps">TRY AGAIN</span>
        </Button>
      )}
    </div>
  );
}

export function EmptyPanel({ icon = "inbox", title, hint, className }: { icon?: string; title: string; hint?: string; className?: string }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-1.5 text-center p-6 ${className ?? ""}`}>
      <Icon name={icon} size={28} className="text-outline" />
      <p className="font-body-md text-body-md text-on-surface">{title}</p>
      {hint && <p className="font-body-sm text-body-sm text-on-surface-variant max-w-md">{hint}</p>}
    </div>
  );
}
