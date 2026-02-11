/**
 * Feature Hierarchy Selector Component
 * 
 * Dropdown selector for choosing a parent feature, with validation
 * to prevent circular references and display hierarchy warnings.
 */

import { useState, useEffect, useMemo, type ChangeEvent } from 'react';
import { Select } from '../platformAdmin';
import { 
  validateParentAssignment, 
  getFeatureHierarchyFlat,
  type FeatureWithHierarchy 
} from '../../data/services/featureHierarchyService';

interface FeatureHierarchySelectorProps {
  currentFeatureKey: string;
  currentParentKey?: string | null;
  onChange: (parentKey: string | null) => void;
  disabled?: boolean;
}

export function FeatureHierarchySelector({
  currentFeatureKey,
  currentParentKey,
  onChange,
  disabled = false
}: FeatureHierarchySelectorProps) {
  const [features, setFeatures] = useState<FeatureWithHierarchy[]>([]);
  const [loading, setLoading] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [affectedChildrenCount, setAffectedChildrenCount] = useState<number>(0);

  useEffect(() => {
    loadFeatures();
  }, []);

  const loadFeatures = async () => {
    setLoading(true);
    try {
      const hierarchyData = await getFeatureHierarchyFlat(false);
      setFeatures(hierarchyData);
    } catch (err) {
      console.error('Error loading feature hierarchy:', err);
    } finally {
      setLoading(false);
    }
  };

  // Build options list excluding the current feature and its descendants
  const options = useMemo(() => {
    if (!currentFeatureKey || features.length === 0) {
      return [];
    }

    // Recursively collect all descendants
    const collectDescendants = (featureKey: string, collected: Set<string> = new Set()): Set<string> => {
      const feature = features.find(f => f.featureKey === featureKey);
      if (!feature) return collected;

      for (const childKey of feature.childrenKeys) {
        if (!collected.has(childKey)) {
          collected.add(childKey);
          collectDescendants(childKey, collected);
        }
      }
      return collected;
    };

    const allDescendants = collectDescendants(currentFeatureKey);

    // Build options with indentation based on depth
    const validFeatures = features.filter(f => 
      f.featureKey !== currentFeatureKey && !allDescendants.has(f.featureKey)
    );

    return [
      { value: '', label: '(None - Root Level)' },
      ...validFeatures.map(f => ({
        value: f.featureKey,
        label: `${'  '.repeat(f.depth)}${f.displayName} (${f.featureKey})`
      }))
    ];
  }, [features, currentFeatureKey]);

  const handleChange = async (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    const newParentKey = value || null;

    // Validate the change
    setValidationError(null);
    setAffectedChildrenCount(0);

    const validation = await validateParentAssignment(currentFeatureKey, newParentKey);

    if (!validation.valid) {
      setValidationError(validation.error || 'Invalid parent selection');
      return;
    }

    if (validation.affectedChildren && validation.affectedChildren.length > 0) {
      setAffectedChildrenCount(validation.affectedChildren.length);
    }

    onChange(newParentKey);
  };

  if (loading) {
    return <Select value="" onChange={() => {}} options={[{ value: '', label: 'Loading...' }]} disabled />;
  }

  return (
    <div>
      <Select
        value={currentParentKey || ''}
        onChange={handleChange}
        options={options}
        disabled={disabled}
      />
      {validationError && (
        <div style={{ color: 'var(--pa-color-error)', fontSize: '12px', marginTop: '4px' }}>
          {validationError}
        </div>
      )}
      {affectedChildrenCount > 0 && (
        <div style={{ color: 'var(--pa-color-warning)', fontSize: '12px', marginTop: '4px' }}>
          ⚠️ This change will affect {affectedChildrenCount} child feature{affectedChildrenCount > 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}

/**
 * Feature Hierarchy Tree Display Component
 * 
 * Shows feature hierarchy as an indented tree view
 */

interface FeatureHierarchyTreeProps {
  features: FeatureWithHierarchy[];
  highlightFeatureKey?: string;
  onSelect?: (featureKey: string) => void;
}

export function FeatureHierarchyTree({
  features,
  highlightFeatureKey,
  onSelect
}: FeatureHierarchyTreeProps) {
  // Sort by parent then name
  const sortedFeatures = useMemo(() => {
    return [...features].sort((a, b) => {
      // First, sort by depth (root features first)
      if (a.depth !== b.depth) {
        return a.depth - b.depth;
      }
      // Within same depth, sort by parent
      const parentCompare = (a.parentFeatureKey || '').localeCompare(b.parentFeatureKey || '');
      if (parentCompare !== 0) {
        return parentCompare;
      }
      // Finally, sort by display name
      return a.displayName.localeCompare(b.displayName);
    });
  }, [features]);

  return (
    <div style={{ fontFamily: 'monospace', fontSize: '13px' }}>
      {sortedFeatures.map(feature => {
        const isHighlighted = feature.featureKey === highlightFeatureKey;
        const indent = '  '.repeat(feature.depth);
        const icon = feature.childrenKeys.length > 0 ? '📁' : '📄';

        return (
          <div
            key={feature.featureKey}
            onClick={() => onSelect?.(feature.featureKey)}
            style={{
              padding: '4px 8px',
              cursor: onSelect ? 'pointer' : 'default',
              backgroundColor: isHighlighted ? 'var(--pa-color-primary-50)' : 'transparent',
              borderLeft: feature.depth > 0 ? '2px solid var(--pa-color-neutral-200)' : 'none',
              marginLeft: feature.depth > 0 ? '12px' : '0'
            }}
          >
            <span style={{ opacity: 0.5 }}>{indent}</span>
            <span style={{ marginRight: '6px' }}>{icon}</span>
            <span style={{ fontWeight: isHighlighted ? 600 : 400 }}>
              {feature.displayName}
            </span>
            <span style={{ opacity: 0.5, marginLeft: '8px', fontSize: '11px' }}>
              {feature.featureKey}
            </span>
            {feature.childrenKeys.length > 0 && (
              <span style={{ opacity: 0.5, marginLeft: '8px', fontSize: '11px' }}>
                ({feature.childrenKeys.length} {feature.childrenKeys.length === 1 ? 'child' : 'children'})
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
