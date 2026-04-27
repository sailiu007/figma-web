import { useAppStore } from '../../store/useAppStore';
import { useT } from '../../i18n';
import { Search, Bell, Languages, Sun, Moon } from 'lucide-react';

export default function TopBar({ title, subtitle, breadcrumb }: { title: string; subtitle?: string; breadcrumb?: string[] }) {
  const { language, setLanguage, theme, toggleTheme } = useAppStore();
  const t = useT(language);

  return (
    <div className="flex items-start justify-between gap-4 mb-5">
      <div className="min-w-0 pt-1">
        {breadcrumb && breadcrumb.length > 0 && (
          <div className="text-xs text-muted-foreground mb-1" style={{ fontWeight: 500 }}>
            {breadcrumb.join(' / ')}
          </div>
        )}
        <h1 className="text-gradient" style={{ fontSize: '1.7rem', fontWeight: 700 }}>{title}</h1>
        {subtitle && <p className="text-muted-foreground mt-1" style={{ fontSize: '.9rem' }}>{subtitle}</p>}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <div className="glass rounded-full pl-4 pr-3 py-2.5 flex items-center gap-2 w-72 xl:w-80">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input
            placeholder={t('searchPlaceholder')}
            className="bg-transparent outline-none flex-1 text-sm placeholder:text-muted-foreground/70"
          />
        </div>

        <button onClick={toggleTheme} className="glass-button rounded-full w-11 h-11 flex items-center justify-center" title={theme === 'dark' ? t('themeLight') : t('themeDark')}>
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        <button
          onClick={() => setLanguage(language === 'zh' ? 'en' : 'zh')}
          className="glass-button rounded-full px-4 py-2.5 flex items-center gap-1.5"
          style={{ fontSize: '.8rem', fontWeight: 600 }}
        >
          <Languages className="w-4 h-4" />
          {language === 'zh' ? '中文' : 'EN'}
        </button>

        <button className="glass-button rounded-full w-11 h-11 flex items-center justify-center relative">
          <Bell className="w-4 h-4" />
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full" style={{ background: 'var(--brand-500)' }} />
        </button>
      </div>
    </div>
  );
}
