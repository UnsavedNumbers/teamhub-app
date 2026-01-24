import { useRef, useEffect, useState } from 'react';
import type { DiscoveredFeature } from '../../utils/featureDiscovery/types';

interface FeatureDependencyGraphProps {
    features: DiscoveredFeature[];
}

// Simple force-directed graph placeholder or list view?
// Given complexity of implementing force-layout from scratch, 
// we will implement a dependency list with cycle highlighting for V1.

export default function FeatureDependencyGraph({ features }: FeatureDependencyGraphProps) {
    const cycles = features.filter(f => f.dependencyCycles && f.dependencyCycles.length > 0);
    const withDeps = features.filter(f => f.dependsOn && f.dependsOn.length > 0);

    if (withDeps.length === 0 && cycles.length === 0) {
        return <div className="pa-body-s" style={{color: 'var(--pa-n500)'}}>No dependencies detected.</div>
    }

    return (
        <div style={{ padding: '16px', background: 'var(--pa-n050)', borderRadius: '8px' }}>
            {cycles.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                    <h4 className="pa-body-m" style={{ color: 'var(--pa-error)', fontWeight: 600 }}>Circular Dependencies Detected</h4>
                    <ul style={{ listStyle: 'none', padding: 0 }}>
                        {cycles.map(f => (
                            <li key={f.featureKey} className="pa-body-s" style={{ marginBottom: '4px' }}>
                                <span style={{ fontWeight: 600 }}>{f.displayName}</span> is part of cycle: 
                                <code style={{ marginLeft: '8px', background: '#ffebee', padding: '2px 4px', borderRadius: '4px' }}>
                                    {f.dependencyCycles.join(' → ')}
                                </code>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <div>
                 <h4 className="pa-body-m" style={{ fontWeight: 600 }}>Dependencies</h4>
                 <ul style={{ listStyle: 'none', padding: 0 }}>
                    {withDeps.map(f => (
                         <li key={f.featureKey} className="pa-body-s" style={{ marginBottom: '4px' }}>
                            <span style={{ fontWeight: 600 }}>{f.displayName}</span> depends on: 
                            <span style={{ color: 'var(--pa-n600)', marginLeft: '8px' }}>
                                {f.dependsOn.join(', ')}
                            </span>
                         </li>
                    ))}
                 </ul>
            </div>
        </div>
    );
}
