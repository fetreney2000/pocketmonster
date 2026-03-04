import * as THREE from 'three';

export const TILE = {
  GRASS:      0,
  PATH:       1,
  WATER:      2,
  WALL:       3,
  TREE:       4,
  BUILDING:   5,
  DOOR:       6,
  TALL_GRASS: 7,
};

export const TILE_COLORS = {
  [TILE.GRASS]:      0x3CB371,
  [TILE.PATH]:       0xC8A96E,
  [TILE.WATER]:      0x2980B9,
  [TILE.WALL]:       0x7F8C8D,
  [TILE.TREE]:       0x1E6B2E,
  [TILE.BUILDING]:   0xA0785A,
  [TILE.DOOR]:       0x6B4226,
  [TILE.TALL_GRASS]: 0x27AE60,
};

export const TILE_SOLID = {
  [TILE.GRASS]:      false,
  [TILE.PATH]:       false,
  [TILE.WATER]:      true,
  [TILE.WALL]:       true,
  [TILE.TREE]:       true,
  [TILE.BUILDING]:   true,
  [TILE.DOOR]:       false,
  [TILE.TALL_GRASS]: false,
};

export const TILE_ENCOUNTER = {
  [TILE.GRASS]:      false,
  [TILE.TALL_GRASS]: true,
};

// 30x30 map  (row-major, row 0 = top)
// 0=grass 1=path 2=water 3=wall 4=tree 5=building 6=door 7=tall_grass
const RAW_MAP = [
/* 0 */ [4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4],
/* 1 */ [4,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,4],
/* 2 */ [4,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,4],
/* 3 */ [4,7,7,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,7,7,7,7,4],
/* 4 */ [4,7,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,7,7,7,4],
/* 5 */ [4,7,0,0,0,7,7,7,7,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,7,7,4],
/* 6 */ [4,7,0,0,0,7,7,7,7,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,7,7,4],
/* 7 */ [4,0,0,0,0,7,7,7,7,0,0,0,0,0,0,0,0,0,0,0,7,7,7,0,0,0,0,0,7,4],
/* 8 */ [4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,7,7,7,0,0,0,0,0,7,4],
/* 9 */ [4,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,4],
/*10 */ [4,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,4],
/*11 */ [4,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,4],
/*12 */ [4,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,4],
/*13 */ [4,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4],
/*14 */ [4,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4],
/*15 */ [4,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,4],
/*16 */ [4,1,5,5,1,5,5,1,1,1,1,1,1,5,5,1,5,5,1,1,2,2,1,5,5,1,5,5,1,4],
/*17 */ [4,1,5,5,1,5,5,1,1,1,1,1,1,5,5,1,5,5,1,1,2,2,1,5,5,1,5,5,1,4],
/*18 */ [4,1,6,1,1,6,1,1,1,1,1,1,1,6,1,1,6,1,1,1,2,2,1,6,1,1,6,1,1,4],
/*19 */ [4,1,0,0,1,0,0,1,1,1,1,0,0,0,0,1,0,0,1,1,2,2,1,0,0,1,0,0,1,4],
/*20 */ [4,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,2,1,1,1,1,1,1,1,4],
/*21 */ [4,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,2,2,0,0,0,0,0,0,0,4],
/*22 */ [4,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,2,2,0,0,0,0,0,0,0,4],
/*23 */ [4,0,0,0,7,7,7,0,0,1,0,0,0,0,0,0,0,0,0,0,2,2,0,0,7,7,7,0,0,4],
/*24 */ [4,0,0,0,7,7,7,0,0,0,0,0,0,0,0,0,0,0,0,0,2,2,0,0,7,7,7,0,0,4],
/*25 */ [4,0,0,0,7,7,7,7,7,7,7,7,7,0,0,0,0,0,0,0,2,2,0,0,7,7,7,0,0,4],
/*26 */ [4,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,4],
/*27 */ [4,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,4],
/*28 */ [4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4],
/*29 */ [4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4],
];

export class TileMap {
  constructor(scene) {
    this.scene = scene;
    this.width  = 30;
    this.height = 30;
    this.data   = RAW_MAP;
    this._meshes = [];
    this._group  = new THREE.Group();
    scene.add(this._group);
    this._build();
  }

  _build() {
    const geo = new THREE.PlaneGeometry(1, 1);
    for (let row = 0; row < this.height; row++) {
      for (let col = 0; col < this.width; col++) {
        const tileType = this.data[row][col];
        const mat  = new THREE.MeshBasicMaterial({ color: TILE_COLORS[tileType] });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(col, -row, 0);
        this._group.add(mesh);
        this._meshes.push(mesh);
      }
    }
    // Add subtle grid lines by adding slightly smaller slightly darker overlays... skip for perf.
  }

  getTile(col, row) {
    if (col < 0 || col >= this.width || row < 0 || row >= this.height) return TILE.TREE;
    return this.data[row][col];
  }

  isSolid(col, row) {
    return TILE_SOLID[this.getTile(col, row)] === true;
  }

  isDoor(col, row) {
    return this.getTile(col, row) === TILE.DOOR;
  }

  isEncounterTile(col, row) {
    return !!TILE_ENCOUNTER[this.getTile(col, row)];
  }

  dispose() {
    this._group.clear();
    this.scene.remove(this._group);
  }
}
