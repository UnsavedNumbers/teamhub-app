import type { DiscoveredFeature } from './types';

export class DependencyGraph {
    nodes: Map<string, DiscoveredFeature>;
    edges: Map<string, string[]>; // key -> dependencies

    constructor(features: DiscoveredFeature[]) {
        this.nodes = new Map(features.map(f => [f.featureKey, f]));
        this.edges = new Map();

        // Build edges based on implicit or explicit rules
        // For now, we don't have explicit "dependsOn" in the raw discovery, 
        // but we assume it's populated or we infer it.
        features.forEach(f => {
            this.edges.set(f.featureKey, f.dependsOn || []);
        });
    }

    addDependency(from: string, to: string) {
        if (!this.nodes.has(from) || !this.nodes.has(to)) return;

        const deps = this.edges.get(from) || [];
        if (!deps.includes(to)) {
            deps.push(to);
            this.edges.set(from, deps);

            // Update the feature object as well
            const feature = this.nodes.get(from);
            if (feature) {
                feature.dependsOn = deps;
            }
        }
    }

    detectCycles(): string[][] {
        const cycles: string[][] = [];
        const visited = new Set<string>();
        const recursionStack = new Set<string>();

        const dfs = (node: string, path: string[]) => {
            visited.add(node);
            recursionStack.add(node);

            const neighbors = this.edges.get(node) || [];

            for (const neighbor of neighbors) {
                if (!visited.has(neighbor)) {
                    dfs(neighbor, [...path, neighbor]);
                } else if (recursionStack.has(neighbor)) {
                    // Cycle detected
                    const cycle = [...path, neighbor];
                    // Normalize cycle (rotate to start with lowest string for uniqueness checking)
                    cycles.push(cycle);
                }
            }

            recursionStack.delete(node);
        };

        for (const node of this.nodes.keys()) {
            if (!visited.has(node)) {
                dfs(node, [node]);
            }
        }

        return cycles;
    }
}

export function analyzeDependencies(features: DiscoveredFeature[]): DiscoveredFeature[] {
    const graph = new DependencyGraph(features);

    // Infer some dependencies (Examle)
    // If a feature is "Payments", it might depend on "Settings"
    // This is where heuristics go

    const cycles = graph.detectCycles();

    // Mark cycles in features
    if (cycles.length > 0) {
        features.forEach(f => {
            cycles.forEach(cycle => {
                if (cycle.includes(f.featureKey)) {
                    // Union of all cycles this feature is part of
                    f.dependencyCycles = [...new Set([...(f.dependencyCycles || []), ...cycle])];
                }
            });
        });
    }

    return features;
}
