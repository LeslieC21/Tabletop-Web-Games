const { onGameStarted } = require("../spades");

const BuildingType = Object.freeze({ None: 'None', Settlement: 'Settlement', City: 'City' });
const ResourceType = Object.freeze({ Desert: 'Desert', Sheep: 'Sheep', Forest: 'Forest', Quarry: 'Quarry', Clay: 'Clay', Wheat: 'Wheat' });

const tileRadius = 2;
const tileSize = 3;

const RESOURCE_POOL = [
    ...Array(4).fill(ResourceType.Forest),
    ...Array(4).fill(ResourceType.Sheep),
    ...Array(4).fill(ResourceType.Wheat),
    ...Array(3).fill(ResourceType.Clay),
    ...Array(3).fill(ResourceType.Quarry),
    ResourceType.Desert
];

const NUMBER_POOL = [ 2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12];

function createGameboard(room) {
    const tileCoords = generateBoardCoords();
    const vertices = new Map();
    const edges = new Map();
    const tiles = [];

    for (const [q, r] of tileCoords) {
      const { x: cx, y: cy} = axialToPixel(q, r, tileSize);
      const corners = hexCorners(cx, cy, tileSize);

      const tileVertexIds = corners.map(({ x, y}) => {
        const key = vertexKey(x, y);
        if (!vertices.has(key)) {
          vertices.set(key, {
            id: key, 
            x, 
            y,
            building: 'None', 
            owner: null,
            locked: false,
            adjacentTileIds: [],
            adjacentVertexIds: [],
            adjacentEdgeIds: []
          });
        }

        vertices.get(key).adjacentTileIds.push(`${q},${r}`);
        return key;
      });

      // edges connect consecutive corners around the hex
      const tileEdgeIds = [];
      for (let i = 0; i < 6; i++) {
        const a = tileVertexIds[i];
        const b = tileVertexIds[(i + 1) % 6];
        const edgeKey = [a, b].sort().join('|'); // Sort so both tiles derive the same key
        if (!edges.has(edgeKey)) {
          edges.set(edgeKey, {
            id: edgeKey,
            vertexIds: [a, b],
            hasRoad: false,
            owner: null,
            locked: false,
            adjacentTileIds: [],
          });
        }
        edges.get(edgeKey).adjacentTileIds.push(`${q},${r}`);
        tileEdgeIds.push(edgeKey);
      }

      tiles.push({
        id: `${q},${r}`,
        q,
        r,
        resource: 'Desert',
        numberToken: null,
        vertexIds: tileVertexIds,
        edgeIds: tileEdgeIds,
      });
    }

    for (const edge of edges.values()) {
        const [a, b] = edge.vertexIds;
        vertices.get(a).adjacentVertexIds.push(b);
        vertices.get(b).adjacentVertexIds.push(a);
        vertices.get(a).adjacentEdgeIds.push(edge.id);
        vertices.get(b).adjacentEdgeIds.push(edge.id);
        
    }

    const neighbors = new Map(tiles.map((t) => [t.id, new Set()]));
    for (const edge of edges.values()) {
        if (edge.adjacentTileIds.length === 2) {
            const [t1, t2] = edge.adjacentTileIds;
            neighbors.get(t1).add(t2);
            neighbors.get(t2).add(t1);
        }
    }

    assignResourcesAndNumbers(tiles, neighbors);
    
    room.gameState.robberTileId = tiles.find((t) => t.resource === ResourceType.Desert).id;
    room.gameBoard = { 
        tiles, 
        vertices: Object.fromEntries(vertices), 
        edges: Object.fromEntries(edges) 
    };
}

function generateBoardCoords() {
    const coords = [];
    
    for (let q = -tileRadius; q <= tileRadius; q++) {
      for (let r = -tileRadius; r <= tileRadius; r++) {
        const s = -q - r; // Cube Contraint: q + r + s = 0
        if (Math.abs(s) <= tileRadius) {
          coords.push([q, r]);
        }
      }
    }

    return coords;
}

function axialToPixel(q, r, size) {
    const x = size * (Math.sqrt(3) * q + (Math.sqrt(3) / 2) * r);
    const y = size * (1.5 * r);
    return { x, y };
}

function hexCorners(centerX, centerY, size) {
    const corners = [];
    for (let i = 0; i < 6; i++) {
      const angleDeg = 60 * i - 30;   // -30 offset = pointy-top
      const angleRad = (Math.PI / 180) * angleDeg;
      corners.push({
        x: centerX + size * Math.cos(angleRad),
        y: centerY + size * Math.sin(angleRad),
      });
    }

    return corners;
}

function vertexKey(x, y) {
    // round to kill floating point noise, tune precision to the size
    return `${Math.round(x * 100)},${Math.round(y * 100)}`;
}

function assignResourcesAndNumbers(tiles, neighbors) {
    if(tiles.length !== RESOURCE_POOL.length) {
        throw new Error(
            `Resource pool has ${RESOURCE_POOL.length} entries but board has ${tiles.length} tiles. ` +
            `Adjust tileRadius or the pools.`
        );
    }

    const resources = shuffle(RESOURCE_POOL);
    tiles.forEach((tile, i) => {
        tile.resource = resources[i];
        tile.numberToken = null;
    });

    const landTiles = tiles.filter((t) => t.resource !== ResourceType.Desert);
    const byId = new Map(tiles.map((t) => [t.id, t]));
    const isHot = (n) => n === 6 || n === 8;

    // Reshuffle until no two "hot" tokens (6/8) sit on adj tiles
    for(let attempt = 0; attempt < 10000; attempt++) {
        const tokens = shuffle(NUMBER_POOL);
        landTiles.forEach((tile, i) => (tile.numberToken = tokens[i]));

        const ok = landTiles.every((tile) => {
            if(!isHot(tile.numberToken)) return true;
            for (const nId of neighbors.get(tile.id)) {
                const n = byId.get(nId);
                if (n.numberToken !== null && isHot(n.numberToken)) return false;
            }
            return true;
        });

        if(ok) return tiles;
    }
    throw new Error('Could not place number tokens without adjacent 6/8');
}

function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

module.exports = { BuildingType, ResourceType, NUMBER_POOL, createGameboard, onGameStarted };