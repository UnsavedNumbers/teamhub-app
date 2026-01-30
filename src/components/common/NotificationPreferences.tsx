import { useMemo, useState } from 'react'
import { cn } from '../../utils/cn'
import { useT } from '../../i18n/useI18n'
import type { NotificationRole } from '../../types/notifications'
import type { DeliveryChannel, NotificationGroup } from '../../types/notificationPreferences'

export interface NotificationPreferencesProps {
  role: NotificationRole
  groups: NotificationGroup[]
  onToggleGroupAll: (groupId: NotificationGroup['id'], next: boolean) => void
  onToggleGroupDigest: (groupId: NotificationGroup['id'], next: boolean) => void
  onToggleAction: (groupId: NotificationGroup['id'], actionId: string, next: boolean) => void
  onToggleChannel: (groupId: NotificationGroup['id'], channel: DeliveryChannel, next: boolean) => void
  saving?: boolean
}

export function NotificationPreferences({
  role,
  groups,
  onToggleGroupAll,
  onToggleGroupDigest,
  onToggleAction,
  onToggleChannel,
  saving = false,
}: NotificationPreferencesProps) {
  const t = useT()
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})

  const roleLabel = useMemo(() => {
    if (role === 'org_admin') return 'Admin'
    if (role === 'coach') return 'Coach'
    return 'Guardian'
  }, [role])

  const toggleOpen = (id: string) => {
    setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => {
        const isOpen = openGroups[group.id] ?? false
        return (
          <div key={group.id} className="oa-detail-box">
            <button
              type="button"
              className="w-full flex items-center justify-between gap-3"
              onClick={() => toggleOpen(group.id)}
              aria-expanded={isOpen}
            >
              <div className="flex flex-col text-left">
                <span className="text-sm font-black text-slate-900 dark:text-white">{group.label}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">{roleLabel}</span>
              </div>
              <span className="material-symbols-outlined text-slate-400" aria-hidden>expand_more</span>
            </button>

            {isOpen && (
              <div className="mt-3 space-y-3">
                <div className="flex flex-wrap gap-3 items-center">
                  <ToggleChip
                    label={t('portal.settings.notifications.toggles.all')}
                    active={group.allEnabled}
                    onClick={() => onToggleGroupAll(group.id, !group.allEnabled)}
                    disabled={saving}
                  />
                  <ToggleChip
                    label={t('portal.settings.notifications.toggles.digest')}
                    active={group.digestEnabled}
                    onClick={() => onToggleGroupDigest(group.id, !group.digestEnabled)}
                    disabled={saving}
                  />
                </div>

                <div className="flex flex-wrap gap-2 items-center">
                  <ChannelChip
                    label={t('portal.settings.notifications.toggles.inApp')}
                    active={group.channels.includes('in_app')}
                    onClick={() => onToggleChannel(group.id, 'in_app', !group.channels.includes('in_app'))}
                    disabled={saving}
                  />
                  <ChannelChip
                    label={t('portal.settings.notifications.toggles.email')}
                    active={group.channels.includes('email')}
                    onClick={() => onToggleChannel(group.id, 'email', !group.channels.includes('email'))}
                    disabled={saving}
                  />
                  <ChannelChip
                    label={t('portal.settings.notifications.toggles.push')}
                    active={group.channels.includes('push')}
                    onClick={() => onToggleChannel(group.id, 'push', !group.channels.includes('push'))}
                    disabled={saving}
                  />
                  <span className="text-[11px] text-slate-400">{t('portal.settings.notifications.toggles.urgentNotice')}</span>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                    {t('portal.settings.notifications.toggles.individual')}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {group.actions.map((action) => (
                      <ToggleRow
                        key={action.id}
                        label={t(`portal.settings.notifications.actions.${action.id}`, { defaultValue: action.id })}
                        active={action.enabled}
                        onToggle={() => onToggleAction(group.id, action.id, !action.enabled)}
                        disabled={saving || group.allEnabled === false}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

interface ToggleChipProps {
  label: string
  active: boolean
  onClick: () => void
  disabled?: boolean
}

function ToggleChip({ label, active, onClick, disabled }: ToggleChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'px-3 py-1.5 rounded-full text-xs font-bold border transition-all min-h-[32px]',
        active
          ? 'border-[var(--org-btn-primary-bg)] bg-[var(--org-btn-primary-bg)]/10 text-[var(--org-btn-primary-bg)]'
          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
      )}
    >
      {label}
    </button>
  )
}

interface ChannelChipProps extends ToggleChipProps {}
const ChannelChip = ToggleChip

interface ToggleRowProps {
  label: string
  active: boolean
  onToggle: () => void
  disabled?: boolean
}

function ToggleRow({ label, active, onToggle, disabled }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/40">
      <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{label}</span>
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        className={cn(
          'w-12 h-6 rounded-full transition-colors relative',
          active ? 'bg-[var(--org-btn-primary-bg)]' : 'bg-slate-200 dark:bg-slate-700'
        )}
      >
        <div
          className={cn(
            'w-4 h-4 rounded-full bg-white absolute top-1 transition-all',
            active ? 'left-7' : 'left-1'
          )}
        />
      </button>
    </div>
  )
}

export default NotificationPreferences
