import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAppStore } from '../../store/useAppStore';
import { useT } from '../../i18n';
import { ArrowLeft, BadgeCheck, Bell, ChevronRight, Languages, LaptopMinimal, LockKeyhole, Mail, PanelsTopLeft, Shield, User, Volume2 } from 'lucide-react';

export default function SettingsPage() {
  const { language, setLanguage } = useAppStore();
  const t = useT(language);
  const navigate = useNavigate();
  const [notificationState, setNotificationState] = useState({
    desktop: true,
    email: true,
    pipeline: true,
    weekly: false,
  });
  const [securityState, setSecurityState] = useState({
    twoFactor: true,
    sso: false,
  });

  return (
    <div className="px-4 py-5 xl:px-5 h-full overflow-hidden flex flex-col">
      <div className="flex items-center gap-3 mb-4 px-1">
        <button
          onClick={() => navigate('/')}
          className="w-11 h-11 rounded-full glass-button flex items-center justify-center shrink-0"
          aria-label={language === 'zh' ? '返回' : 'Back'}
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-[1.45rem]" style={{ fontWeight: 700 }}>{t('settingsTitle')}</h1>
        </div>
      </div>

      <div className="flex-1 overflow-auto pr-1 fade-enter">
        <div className="w-full max-w-none pb-6 space-y-4">
          <ProfileSummary />

          <SettingsSection title={language === 'zh' ? '个人资料' : 'Profile'}>
            <ProfileEditor language={language} t={t} />
          </SettingsSection>

          <SettingsSection title={t('language')}>
            <SettingRow
              icon={Languages}
              title={language === 'zh' ? '语言' : 'Language'}
              description={language === 'zh' ? '切换界面语言与默认表达' : 'Choose the default interface language'}
              control={<LanguageSwitch current={language} onChange={setLanguage} />}
            />
            <SettingRow
              icon={LaptopMinimal}
              title={language === 'zh' ? '当前适配' : 'Current adaptation'}
              description={language === 'zh' ? '导航、通知与表单提示会同步切换。' : 'Navigation, notifications, and form hints change together.'}
              control={<ChevronRight className="w-4 h-4 text-muted-foreground" />}
              noBorder
            />
          </SettingsSection>

          <SettingsSection title={language === 'zh' ? '通知' : 'Notifications'}>
            <SettingRow
              icon={Bell}
              title={language === 'zh' ? '推送通知' : 'Push notifications'}
              description={language === 'zh' ? '消息、提及与新动态提醒' : 'Messages, mentions, and activity alerts'}
              control={<Toggle checked={notificationState.desktop} onChange={(next) => setNotificationState((state) => ({ ...state, desktop: next }))} />}
            />
            <SettingRow
              icon={Volume2}
              title={language === 'zh' ? '邮件提醒' : 'Email digest'}
              description={language === 'zh' ? '变更摘要、审批与日报通知' : 'Digest updates, approvals, and daily summaries'}
              control={<Toggle checked={notificationState.email} onChange={(next) => setNotificationState((state) => ({ ...state, email: next }))} />}
            />
            <SettingRow
              icon={Bell}
              title={language === 'zh' ? '流水线失败' : 'Pipeline failure'}
              description={language === 'zh' ? '构建或发布失败时立即提醒' : 'Immediate alerts when builds or releases fail'}
              control={<Toggle checked={notificationState.pipeline} onChange={(next) => setNotificationState((state) => ({ ...state, pipeline: next }))} />}
            />
            <SettingRow
              icon={Volume2}
              title={language === 'zh' ? '每周摘要' : 'Weekly summary'}
              description={language === 'zh' ? '每周协作概览与状态同步' : 'Weekly collaboration overview and status sync'}
              control={<Toggle checked={notificationState.weekly} onChange={(next) => setNotificationState((state) => ({ ...state, weekly: next }))} />}
              noBorder
            />
          </SettingsSection>

          <SettingsSection title={language === 'zh' ? '安全' : 'Security'}>
            <SettingRow
              icon={LockKeyhole}
              title={language === 'zh' ? '两步验证' : 'Two-factor auth'}
              description={language === 'zh' ? '增强账号安全' : 'Enhanced account security'}
              control={<Toggle checked={securityState.twoFactor} onChange={(next) => setSecurityState((state) => ({ ...state, twoFactor: next }))} />}
            />
            <SettingRow
              icon={Shield}
              title="SSO"
              description="SAML 2.0 / OAuth 2.0"
              control={<Toggle checked={securityState.sso} onChange={(next) => setSecurityState((state) => ({ ...state, sso: next }))} />}
            />
            <SettingRow
              icon={Shield}
              title={language === 'zh' ? '风险提醒' : 'Risk alerts'}
              description={language === 'zh' ? '实时监测异常登录与敏感操作' : 'Monitor abnormal logins and sensitive actions in real time'}
              control={<ChevronRight className="w-4 h-4 text-muted-foreground" />}
              noBorder
            />
          </SettingsSection>
        </div>
      </div>
    </div>
  );
}

function ProfileSummary() {
  const { language } = useAppStore();
  return (
    <section className="glass-card rounded-[28px] px-4 py-3.5 sm:px-5">
      <div className="flex items-center gap-3">
        <div className="w-14 h-14 rounded-full overflow-hidden shrink-0 border border-border/70 bg-muted flex items-center justify-center">
          <div className="w-full h-full" style={{ background: 'linear-gradient(180deg, oklch(0.88 0.03 320), oklch(0.76 0.06 300))' }} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[1.02rem]" style={{ fontWeight: 700 }}>{language === 'zh' ? 'Admin' : 'Admin'}</div>
          <div className="text-sm text-muted-foreground mt-0.5">admin@example.com</div>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
      </div>
    </section>
  );
}

function ProfileEditor({ language, t }: { language: 'zh' | 'en'; t: ReturnType<typeof useT> }) {
  return (
    <>
      <div className="px-4 py-4 sm:px-5 border-b border-border/70">
        <div className="grid gap-4 lg:grid-cols-[92px_1fr] items-start">
          <div className="rounded-[24px] p-[1px]" style={{ background: 'linear-gradient(180deg, oklch(0.72 0.15 275 / 0.9), oklch(0.54 0.2 285 / 0.95))' }}>
            <div className="h-24 rounded-[23px] flex items-center justify-center" style={{ background: 'linear-gradient(180deg, oklch(0.61 0.19 282), oklch(0.54 0.2 285))', color: 'oklch(0.99 0 0)', fontWeight: 700, fontSize: '2rem' }}>A</div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label={t('name')} defaultValue="Admin" />
            <Field label="Email" defaultValue="admin@example.com" />
            <Field label={language === 'zh' ? '职位' : 'Role'} defaultValue={language === 'zh' ? '平台管理员' : 'Platform Admin'} />
            <Field label={language === 'zh' ? '联系电话' : 'Phone'} defaultValue="+86 138 0000 0000" />
          </div>
        </div>
      </div>
      <div className="grid gap-3 p-4 sm:grid-cols-3 sm:px-5 sm:py-4">
        <StatusPill icon={BadgeCheck} title={language === 'zh' ? '资料完整度' : 'Profile completion'} value="92%" />
        <StatusPill icon={Mail} title={language === 'zh' ? '主邮箱' : 'Primary email'} value={language === 'zh' ? '已验证' : 'Verified'} />
        <StatusPill icon={PanelsTopLeft} title={language === 'zh' ? '默认入口' : 'Default start'} value={language === 'zh' ? '项目概览' : 'Project overview'} />
      </div>
    </>
  );
}

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="text-xs text-muted-foreground px-1 mb-2" style={{ fontWeight: 700, letterSpacing: '0.08em' }}>{title}</div>
      <div className="glass-card rounded-[26px] overflow-hidden">
        {children}
      </div>
    </section>
  );
}

function Field({ label, defaultValue }: { label: string; defaultValue: string }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</span>
      <input defaultValue={defaultValue} className="glass-input rounded-[18px] px-3 py-2.5 outline-none w-full mt-2" />
    </label>
  );
}

function SettingRow({ icon: Icon, title, description, control, noBorder = false }: { icon: typeof User; title: string; description: string; control: React.ReactNode; noBorder?: boolean }) {
  return (
    <div className={`flex items-center gap-3 px-4 py-4 sm:px-5 ${noBorder ? '' : 'border-b border-border/70'}`}>
      <div className="w-10 h-10 rounded-full glass-soft flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-brand" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[1rem]" style={{ fontWeight: 700 }}>{title}</div>
        <div className="text-sm text-muted-foreground mt-0.5">{description}</div>
      </div>
      <div className="shrink-0 ml-3">{control}</div>
    </div>
  );
}

function LanguageSwitch({ current, onChange }: { current: 'zh' | 'en'; onChange: (next: 'zh' | 'en') => void }) {
  return (
    <div className="flex items-center gap-2">
      {(['zh', 'en'] as const).map((item) => (
        <button
          key={item}
          onClick={() => onChange(item)}
          className={`px-3.5 py-2 rounded-full text-sm ${current === item ? 'brand-button' : 'glass-button'}`}
          style={{ fontWeight: 600 }}
        >
          {item === 'zh' ? '简体中文' : 'English'}
        </button>
      ))}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (next: boolean) => void }) {
  return (
    <button onClick={() => onChange(!checked)} className="w-12 h-7 rounded-full p-0.5 transition-all shrink-0" style={checked ? { background: 'var(--brand-500)', boxShadow: '0 8px 18px oklch(0.54 0.2 285 / 0.20)' } : { background: 'var(--switch-background)' }}>
      <div className={`w-6 h-6 rounded-full shadow transition-transform ${checked ? 'translate-x-5' : ''}`} style={{ background: 'oklch(0.99 0 0)' }} />
    </button>
  );
}

function StatusPill({ icon: Icon, title, value }: { icon: typeof User; title: string; value: string }) {
  return (
    <div className="glass-soft rounded-[20px] px-4 py-3 flex items-center gap-3">
      <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'oklch(0.61 0.19 282 / 0.12)' }}>
        <Icon className="w-4 h-4 text-brand" />
      </div>
      <div>
        <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{title}</div>
        <div className="text-sm mt-1" style={{ fontWeight: 650 }}>{value}</div>
      </div>
    </div>
  );
}
