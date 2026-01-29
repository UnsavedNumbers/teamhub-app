/**
 * Feature Gate - Reason Messages
 * 
 * User-facing messages for each reason code.
 * Used for tooltips, overlays, and upgrade prompts.
 */

import type { ReasonCode } from './types';

/**
 * User-facing messages for each reason code
 */
export const REASON_MESSAGES: Record<ReasonCode, string> = {
    tier_assignment: 'Access granted',
    system_feature: 'Access granted',
    platform_admin: 'Access granted',
    enabled_by_override: 'Access granted by special permission',
    disabled_by_override: 'This feature has been disabled for your account',
    limit_set_by_override: 'Access granted with usage limit',
    license_tier: 'Upgrade your plan to access this feature',
    license_tier_not_configured: 'License configuration is being set up. Please try again shortly.',
    role: 'This feature is not available for your role',
    platform_admin_only: 'This feature is only available to platform administrators',
    not_found: 'Feature not available',
    no_organization: 'Select an organization to access this feature',
    limit_exceeded: 'You have reached the usage limit for this feature',
    error: 'Unable to verify feature access',
};

/**
 * Short labels for reason codes (for badges, etc.)
 */
export const REASON_LABELS: Record<ReasonCode, string> = {
    tier_assignment: 'Included',
    system_feature: 'Core',
    platform_admin: 'Admin',
    enabled_by_override: 'Enabled',
    disabled_by_override: 'Disabled',
    limit_set_by_override: 'Limited',
    license_tier: 'Upgrade Required',
    license_tier_not_configured: 'Setup Required',
    role: 'Role Restricted',
    platform_admin_only: 'Admin Only',
    not_found: 'Unavailable',
    no_organization: 'No Org',
    limit_exceeded: 'Limit Reached',
    error: 'Error',
};

/**
 * Get user-facing message for a reason code
 */
export function getReasonMessage(reasonCode: ReasonCode): string {
    return REASON_MESSAGES[reasonCode] ?? 'Access denied';
}

/**
 * Get short label for a reason code
 */
export function getReasonLabel(reasonCode: ReasonCode): string {
    return REASON_LABELS[reasonCode] ?? 'Unknown';
}

/**
 * Get tooltip text for unavailable feature
 * @param reasonCode - The reason code from gate result
 * @param featureDisplayName - Optional feature display name
 */
export function getTooltipText(reasonCode: ReasonCode, featureDisplayName?: string): string {
    const base = REASON_MESSAGES[reasonCode];
    if (featureDisplayName) {
        return `${featureDisplayName}: ${base}`;
    }
    return base;
}

/**
 * Check if a reason code indicates the user should be prompted to upgrade
 */
export function shouldShowUpgradePrompt(reasonCode: ReasonCode): boolean {
    return reasonCode === 'license_tier';
}

/**
 * Check if a reason code indicates a permanent restriction
 */
export function isPermanentRestriction(reasonCode: ReasonCode): boolean {
    return ['platform_admin_only', 'role', 'disabled_by_override'].includes(reasonCode);
}

/**
 * Get CTA button text based on reason code
 */
export function getCtaText(reasonCode: ReasonCode): string | null {
    switch (reasonCode) {
        case 'license_tier':
            return 'Upgrade Plan';
        case 'no_organization':
            return 'Select Organization';
        case 'limit_exceeded':
            return 'View Usage';
        default:
            return null;
    }
}

/**
 * Get icon name for a reason code (Material Symbols)
 */
export function getReasonIcon(reasonCode: ReasonCode): string {
    switch (reasonCode) {
        case 'tier_assignment':
        case 'system_feature':
        case 'platform_admin':
        case 'enabled_by_override':
            return 'check_circle';
        case 'license_tier':
            return 'workspace_premium';
        case 'role':
        case 'platform_admin_only':
            return 'admin_panel_settings';
        case 'disabled_by_override':
            return 'block';
        case 'limit_exceeded':
        case 'limit_set_by_override':
            return 'speed';
        case 'no_organization':
            return 'business';
        case 'not_found':
            return 'help_outline';
        case 'error':
            return 'error_outline';
        default:
            return 'lock';
    }
}
