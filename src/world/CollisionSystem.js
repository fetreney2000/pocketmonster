export class CollisionSystem {
  constructor(tileMap) {
    this.tileMap = tileMap;
  }

  /** Returns true if the tile at (col, row) blocks movement */
  isSolid(col, row) {
    return this.tileMap.isSolid(col, row);
  }

  /** Returns true if this position can be walked into */
  canMoveTo(col, row) {
    return !this.isSolid(col, row);
  }

  /** Returns the tile type at (col, row) */
  getTile(col, row) {
    return this.tileMap.getTile(col, row);
  }

  /** Returns true if the tile is an encounter tile */
  isEncounterTile(col, row) {
    return this.tileMap.isEncounterTile(col, row);
  }

  /** Returns true if the tile is a door */
  isDoor(col, row) {
    return this.tileMap.isDoor(col, row);
  }
}
