export type BuildType = 'None' | 'Settlement' | 'City' | 'Road' | 'DevelopmentCard';
export type ResourceType = 'Desert' | 'Sheep' | 'Forest' | 'Quarry' | 'Clay' | 'Wheat';
export type DevelopmentCard = '';
export type PlayerId = string;
export type ResourceBundle = Partial<Record<ResourceType, number>>;

export const BUILD_COSTS: Readonly<Record<BuildType, ResourceBundle>> = {
    Road: { Forest: 1, Clay: 1},
    Settlement: { Forest: 1, Clay: 1, Sheep: 1, Wheat: 1},
    City: { Wheat: 2, Quarry: 3},
    DevelopmentCard: { Sheep: 1, Wheat: 1, Quarry: 1},
    None: {}
};

export interface Vertex {
    id: string;
    x: number;
    y: number;

    building: BuildType;
    owner: PlayerId | null;
    locked: boolean;

    adjacentTileIds: string[];
    adjacentVertexIds: string[];
    adjacentEdgeIds: string[];
}

export interface Edge {
    id: string;

    vertexIds: [string, string];
    adjacentTileIds: string[];

    hasRoad: boolean;
    owner: PlayerId | null;
    locked: boolean;
}

export interface Tile {
    id: string;
    q: number;
    r: number;

    resource: ResourceType;
    numberToken: number | null;

    vertexIds: string[];
    edgeIds: string[];
}

export interface Gameboard {
    tiles: Tile[];
    vertices: Record<string, Vertex>;
    edges: Record<string, Edge>;
}

export function createInitialGameboard(): Gameboard {
    return {
        tiles: [],
        vertices: {},
        edges: {}
    }
}