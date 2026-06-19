import { openUrl } from "@tauri-apps/plugin-opener";

const GITHUB = "https://github.com/Sanexxxx777";
const TELEGRAM = "https://t.me/driptrade3";

// инлайн-SVG бренд-марок (lucide-react не отдаёт Github в этой версии)
function GithubIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
      <path d="M12 .5C5.7.5.5 5.7.5 12c0 5.1 3.3 9.4 7.9 10.9.6.1.8-.3.8-.6v-2c-3.2.7-3.9-1.5-3.9-1.5-.5-1.3-1.3-1.7-1.3-1.7-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17 5 18 5.3 18 5.3c.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6 4.6-1.5 7.9-5.8 7.9-10.9C23.5 5.7 18.3.5 12 .5z" />
    </svg>
  );
}

function TelegramIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
      <path d="M21.9 4.3 18.6 19.9c-.2 1-.9 1.2-1.8.8l-4.9-3.6-2.4 2.3c-.3.3-.5.5-1 .5l.4-5 9.2-8.3c.4-.4-.1-.6-.6-.3L6.3 13.5 1.5 12c-1-.3-1-1 .2-1.5l19.1-7.4c.9-.3 1.6.2 1.1 1.2z" />
    </svg>
  );
}

export function AuthorBadge() {
  const open = (url: string) => {
    void openUrl(url).catch(() => {});
  };
  return (
    <div className="no-drag flex items-center gap-1.5 text-[11px] text-muted">
      <span className="opacity-80">
        by <span className="font-semibold text-ink/85">@Aleksandr_NFA</span>
      </span>
      <button
        onClick={() => open(GITHUB)}
        title="GitHub"
        className="rounded-md p-1 hover:text-gold hover:bg-white/10 transition-colors"
      >
        <GithubIcon />
      </button>
      <button
        onClick={() => open(TELEGRAM)}
        title="Telegram-канал @driptrade3"
        className="rounded-md p-1 hover:text-gold hover:bg-white/10 transition-colors"
      >
        <TelegramIcon />
      </button>
    </div>
  );
}
