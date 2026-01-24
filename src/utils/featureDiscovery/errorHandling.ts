import { supabase } from '../../lib/supabase';

export type ErrorType = 'DiscoveryError' | 'SyncError' | 'ValidationError' | 'NormalizationError';

export interface DiscoveryErrorLog {
    featureKey?: string;
    errorType: ErrorType;
    message: string;
    details?: any;
    timestamp: number;
}

export async function logDiscoveryError(error: unknown, context: Partial<DiscoveryErrorLog> = {}) {
    console.error('Feature Discovery Error:', error);

    // In production we might write to DB or Sentry
    const message = error instanceof Error ? error.message : String(error);
    const details = error instanceof Error ? { stack: error.stack } : error;

    try {
        await supabase.from('discovery_errors').insert({
            feature_key: context.featureKey,
            error_type: context.errorType || 'DiscoveryError',
            error_message: message,
            error_details: JSON.stringify({ ...(details || {}), ...(context.details || {}) }),
        });
    } catch (e) {
        console.error('Failed to log error to DB', e);
    }
}
