import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

const NAV = [
  { icon: "dashboard", title: "Market Overview", active: true },
  { icon: "query_stats", title: "Stock Indices", active: false },
  { icon: "bookmarks", title: "Watchlist", active: false },
  { icon: "settings", title: "Settings", active: false },
];

export function Sidebar({ online }: { online: boolean }) {
  return (
    <aside className="fixed left-0 top-0 h-screen w-16 flex flex-col justify-between items-center py-4 z-40 bg-surface-container-low border-r border-outline-variant">
      <div className="flex flex-col items-center w-full space-y-6">
        <div className="w-10 h-10 rounded-lg bg-surface-container-high border border-outline-variant flex flex-col items-center justify-center p-1 hover:border-primary transition-colors">
          <span className="text-primary font-headline-md text-headline-md font-bold leading-none tracking-tight">MI</span>
          <span className="font-label-caps text-label-caps text-outline leading-tight mt-0.5 scale-75">IDX</span>
        </div>
        <nav aria-label="Main Navigation" className="flex flex-col items-center space-y-3 w-full">
          {NAV.map((item) => (
            <button
              key={item.icon}
              type="button"
              title={item.active ? item.title : `${item.title} (coming soon)`}
              aria-current={item.active ? "page" : undefined}
              disabled={!item.active}
              className={cn(
                "relative flex items-center justify-center w-10 h-10 transition-colors duration-150 active:scale-95",
                item.active
                  ? "text-primary after:content-[''] after:absolute after:right-0 after:top-0 after:bottom-0 after:w-0.5 after:bg-primary-container"
                  : "text-outline rounded-lg cursor-not-allowed opacity-70",
              )}
            >
              <Icon name={item.icon} size={20} />
            </button>
          ))}
        </nav>
      </div>
      <div className="flex flex-col items-center space-y-4 w-full">
        <div
          className={cn(
            "flex items-center justify-center w-8 h-8 rounded-lg bg-surface-container-high border border-outline-variant",
            online ? "text-secondary" : "text-error",
          )}
          title={online ? "API connection OK" : "API connection problem"}
        >
          <Icon name={online ? "wifi" : "wifi_off"} size={16} />
        </div>
        <div
          className="w-9 h-9 rounded-lg bg-surface-variant border border-outline-variant flex items-center justify-center text-outline"
          title="Profile (coming soon)"
        >
          <Icon name="person" size={18} />
        </div>
      </div>
    </aside>
  );
}
