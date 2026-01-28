/**
 * FeatureGatedButton Component
 * 
 * Button that enforces feature gate on click.
 * Renders disabled with tooltip when feature is unavailable.
 * 
 * @example
 * ```tsx
 * <FeatureGatedButton
 *   actionKey="create_fee"
 *   onClick={handleCreateFee}
 *   className="btn-primary"
 * >
 *   <span className="material-symbols-rounded">add</span>
 *   Create Fee
 * </FeatureGatedButton>
 * ```
 */

import { forwardRef, useState } from 'react';
import { 
  useFeatureGate, 
  getFeatureKeyForAction, 
  getReasonMessage,
  shouldShowUpgradePrompt,
} from '@/lib/featureGate';
import { getLink, RouteKeys } from '@/utils/routes';

interface FeatureGatedButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Action key from ACTION_TO_FEATURE registry */
  actionKey: string;
  /** Override action mapping with explicit feature key */
  featureKey?: string;
  /** Called when button is clicked but gated */
  onGatedClick?: () => void;
  /** Children to render */
  children: React.ReactNode;
  /** Show upgrade modal instead of just disabling */
  showUpgradeModal?: boolean;
}

/**
 * Button that enforces feature gate on click
 */
export const FeatureGatedButton = forwardRef<HTMLButtonElement, FeatureGatedButtonProps>(
  (
    { 
      actionKey, 
      featureKey: explicitKey, 
      children, 
      onGatedClick,
      showUpgradeModal = false,
      onClick, 
      className = '', 
      disabled,
      ...props 
    }, 
    ref
  ) => {
    const featureKey = explicitKey ?? getFeatureKeyForAction(actionKey);
    const { allowed, gate_action, reason_code, loading } = useFeatureGate(featureKey);
    const [showModal, setShowModal] = useState(false);

    // If no feature key found, render as normal button
    if (!featureKey) {
      return (
        <button
          ref={ref}
          className={className}
          disabled={disabled}
          onClick={onClick}
          {...props}
        >
          {children}
        </button>
      );
    }

    const isGated = !loading && !allowed;
    const isDisabled = disabled || (isGated && gate_action !== 'hide');
    const tooltipText = isGated ? getReasonMessage(reason_code) : undefined;
    const showUpgrade = isGated && shouldShowUpgradePrompt(reason_code);

    // Hide completely if gate_action is 'hide'
    if (!loading && !allowed && gate_action === 'hide') {
      return null;
    }

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (isGated) {
        e.preventDefault();
        e.stopPropagation();
        
        if (showUpgradeModal && showUpgrade) {
          setShowModal(true);
        }
        
        onGatedClick?.();
        return;
      }
      onClick?.(e);
    };

    return (
      <>
        <button
          ref={ref}
          className={`${className} ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          disabled={isDisabled || loading}
          title={tooltipText}
          onClick={handleClick}
          aria-disabled={isDisabled}
          {...props}
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <span className="animate-spin material-symbols-rounded text-sm">progress_activity</span>
              {children}
            </span>
          ) : (
            children
          )}
        </button>

        {/* Upgrade Modal */}
        {showModal && showUpgrade && (
          <UpgradeModal
            reasonCode={reason_code}
            onClose={() => setShowModal(false)}
          />
        )}
      </>
    );
  }
);

FeatureGatedButton.displayName = 'FeatureGatedButton';

/**
 * Simple upgrade modal
 */
interface UpgradeModalProps {
  reasonCode: string;
  onClose: () => void;
}

function UpgradeModal({ reasonCode, onClose }: UpgradeModalProps) {
  const message = getReasonMessage(reasonCode as any);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md mx-4 p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="text-center">
          <span className="material-symbols-rounded text-5xl text-amber-500 mb-4 block">
            workspace_premium
          </span>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
            Upgrade Required
          </h3>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            {message}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <a
              href={getLink(RouteKeys.ADMIN_ORGANIZATION_BILLING)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors"
            >
              <span className="material-symbols-rounded text-lg">upgrade</span>
              Upgrade Plan
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FeatureGatedButton;
