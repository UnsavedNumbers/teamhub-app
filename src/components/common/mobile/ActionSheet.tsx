import BottomSheet from './BottomSheet'

export interface ActionSheetItem {
  id: string
  label: string
  onSelect: () => void
  destructive?: boolean
  disabled?: boolean
}

interface ActionSheetProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  actions: ActionSheetItem[]
  cancelLabel: string
}

export default function ActionSheet({ isOpen, onClose, title, actions, cancelLabel }: ActionSheetProps) {
  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={title}>
      <div className="ios-action-sheet">
        {actions.map((action) => (
          <button
            key={action.id}
            type="button"
            className={`ios-action-sheet__item ${action.destructive ? 'ios-action-sheet__item--destructive' : ''}`}
            onClick={() => {
              action.onSelect()
              onClose()
            }}
            disabled={action.disabled}
          >
            {action.label}
          </button>
        ))}
        <button type="button" className="ios-action-sheet__cancel" onClick={onClose}>
          {cancelLabel}
        </button>
      </div>
    </BottomSheet>
  )
}
