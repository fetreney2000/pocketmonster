import * as THREE from 'three';

const PATROL_WAIT = 2.0; // seconds between patrol steps

export class NPC {
  constructor(scene, config) {
    this.scene      = scene;
    this.id         = config.id;
    this.name       = config.name;
    this.tileX      = config.x;
    this.tileY      = config.y;
    this.direction  = config.direction || 'down';
    this.type       = config.type || 'normal'; // 'normal' | 'trainer'
    this.dialogue   = config.dialogue || ['...'];
    this.defeated   = false;
    this.trainerParty = config.trainerParty || null;
    this.sightRange = config.sightRange || 3;

    // Patrol
    this.waypoints      = config.waypoints || null;
    this._wpIndex       = 0;
    this._patrolTimer   = 0;
    this._isMoving      = false;
    this._moveProgress  = 0;
    this._pendingDx     = 0;
    this._pendingDy     = 0;
    this._visualX       = this.tileX;
    this._visualY       = this.tileY;

    this._buildMesh();
  }

  _buildMesh() {
    this._group = new THREE.Group();

    const bodyGeo = new THREE.PlaneGeometry(0.7, 0.7);
    const bodyMat = new THREE.MeshBasicMaterial({
      color: this.type === 'trainer' ? 0x8E44AD : 0x2980B9,
    });
    this._body = new THREE.Mesh(bodyGeo, bodyMat);
    this._body.position.z = 0.1;
    this._group.add(this._body);

    const dotGeo = new THREE.PlaneGeometry(0.18, 0.18);
    const dotMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
    this._dot = new THREE.Mesh(dotGeo, dotMat);
    this._dot.position.z = 0.2;
    this._group.add(this._dot);

    this._group.position.set(this.tileX, -this.tileY, 0.1);
    this.scene.add(this._group);
    this._updateDot();
  }

  _updateDot() {
    const off = { up: [0,.22], down: [0,-.22], left: [-.22,0], right: [.22,0] };
    const [ox, oy] = off[this.direction] || [0, -0.22];
    this._dot.position.set(ox, oy, 0.1);
  }

  /** Returns true if this trainer NPC has line-of-sight to player position */
  canSeePlayer(px, py) {
    if (this.type !== 'trainer' || this.defeated) return false;
    const dx = px - this.tileX;
    const dy = py - this.tileY;
    switch (this.direction) {
      case 'up':    return dx === 0 && dy < 0 && dy >= -this.sightRange;
      case 'down':  return dx === 0 && dy > 0 && dy <= this.sightRange;
      case 'left':  return dy === 0 && dx < 0 && dx >= -this.sightRange;
      case 'right': return dy === 0 && dx > 0 && dx <= this.sightRange;
    }
    return false;
  }

  /** Returns true if the player is standing adjacent to this NPC */
  isAdjacentTo(px, py) {
    return Math.abs(px - this.tileX) + Math.abs(py - this.tileY) === 1;
  }

  update(delta, collision) {
    if (this._isMoving) {
      this._moveProgress += 6 * delta;
      if (this._moveProgress >= 1) {
        this.tileX += this._pendingDx;
        this.tileY += this._pendingDy;
        this._visualX = this.tileX;
        this._visualY = this.tileY;
        this._isMoving = false;
        this._moveProgress = 0;
        this._wpIndex = (this._wpIndex + 1) % this.waypoints.length;
        this._patrolTimer = 0;
      } else {
        this._visualX = this.tileX + this._pendingDx * this._moveProgress;
        this._visualY = this.tileY + this._pendingDy * this._moveProgress;
      }
      this._group.position.set(this._visualX, -this._visualY, 0.1);
      return;
    }

    if (!this.waypoints || this.waypoints.length < 2) return;

    this._patrolTimer += delta;
    if (this._patrolTimer < PATROL_WAIT) return;

    const nextWp = this.waypoints[(this._wpIndex + 1) % this.waypoints.length];
    const dx = Math.sign(nextWp.x - this.tileX);
    const dy = Math.sign(nextWp.y - this.tileY);

    if (dx === 0 && dy === 0) {
      this._wpIndex = (this._wpIndex + 1) % this.waypoints.length;
      this._patrolTimer = 0;
      return;
    }

    // Move one step towards next waypoint
    const nx = this.tileX + (dx !== 0 ? dx : 0);
    const ny = this.tileY + (dy !== 0 ? 0 : dy);
    if (collision && !collision.canMoveTo(nx, ny)) return;

    this._pendingDx = dx !== 0 ? dx : 0;
    this._pendingDy = dx !== 0 ? 0  : dy;

    const dirMap = { '0,-1':'up','0,1':'down','-1,0':'left','1,0':'right' };
    this.direction = dirMap[`${this._pendingDx},${this._pendingDy}`] || 'down';
    this._updateDot();

    this._isMoving = true;
    this._moveProgress = 0;
  }

  facePlayer(px, py) {
    const dx = px - this.tileX;
    const dy = py - this.tileY;
    if (Math.abs(dx) >= Math.abs(dy)) {
      this.direction = dx > 0 ? 'right' : 'left';
    } else {
      this.direction = dy > 0 ? 'down' : 'up';
    }
    this._updateDot();
  }

  dispose() {
    this.scene.remove(this._group);
  }
}
