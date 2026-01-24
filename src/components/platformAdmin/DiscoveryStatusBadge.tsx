import { Badge, Button } from '.';
import { useState } from 'react';
import { supabase } from '../../lib/supabase';

interface DiscoveryStatusBadgeProps {
    lastDiscoveredAt: string | null;
    syncStatus: 'pending' | 'synced' | 'failed' | null;
    onSync: () => void;
    onRefresh: () => void;
    loading: boolean;
}

export default function DiscoveryStatusBadge({ 
    lastDiscoveredAt, 
    syncStatus, 
    onSync, 
    onRefresh,
    loading 
}: DiscoveryStatusBadgeProps) {
    const timeAgo = lastDiscoveredAt ? getTimeAgo(new Date(lastDiscoveredAt)) : 'Never';

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <span className="pa-body-s" style={{color: 'var(--pa-n500)'}}>
                    Last discovered: {timeAgo}
                </span>
                <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
                    {syncStatus === 'pending' && <Badge variant="warning">Sync Pending</Badge>}
                    {syncStatus === 'synced' && <Badge variant="success">Synced</Badge>}
                    {syncStatus === 'failed' && <Badge variant="error">Sync Failed</Badge>}
                </div>
            </div>
            
            <div style={{ display: 'flex', gap: '4px' }}>
                <Button variant="ghost" size="dense" onClick={onRefresh} disabled={loading}>
                    {loading ? 'Scanning...' : 'Refresh'}
                </Button>
                {syncStatus === 'pending' && (
                    <Button variant="primary" size="dense" onClick={onSync} disabled={loading}>
                        Sync DB
                    </Button>
                )}
            </div>
        </div>
    );
}

function getTimeAgo(date: Date) {
    const diff = (Date.now() - date.getTime()) / 1000;
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return date.toLocaleDateString();
}
