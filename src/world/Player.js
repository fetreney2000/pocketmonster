import * as THREE from 'three';

const MOVE_SPEED = 8; // tiles per second
const DIRS = {
  up:    { dx:  0, dy: -1 },
  down:  { dx:  0, dy:  1 },
  left:  { dx: -1, dy:  0 },
  right: { dx:  1, dy:  0 },
};

export class Player {
  constructor(scene, collision, startX = 12, startY = 18) {
    this.collision = collision;
    this.tileX = startX;
    this.tileY = startY;
    this.visualX = startX;
    this.visualY = startY;
    this.direction = 'down';
    this.isMoving = false;
    this.justMoved = false;
    this._pendingDx = 0;
    this._pendingDy = 0;
    this._moveProgress = 0;

    // Build Three.js mesh — colored rectangle + direction dot
    this._group = new THREE.Group();

    const bodyGeo = new THREE.PlaneGeometry(0.75, 0.75);
    const bodyMat = new THREE.MeshBasicMaterial({ color: 0xE74C3C });
    this._body = new THREE.Mesh(bodyGeo, bodyMat);
    this._body.position.z = 0.1;
    this._group.add(this._body);

    // Direction indicator (small square)
    const dotGeo = new THREE.PlaneGeometry(0.2, 0.2);
    const dotMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
    this._dot = new THREE.Mesh(dotGeo, dotMat);
    this._dot.position.z = 0.2;
    this._group.add(this._dot);

    this._group.position.set(this.tileX, -this.tileY, 0.1);
    scene.add(this._group);
    this._updateDot();
  }

  _updateDot() {
    const offsets = { up: [0, 0.22], down: [0, -0.22], left: [-0.22, 0], right: [0.22, 0] };
    const [ox, oy] = offsets[this.direction];
    this._dot.position.set(ox, oy, 0.1);
  }

  tryMove(dx, dy) {
    if (this.isMoving) return false;

    let dir = 'down';
    if (dx < 0) dir = 'left';
    else if (dx > 0) dir = 'right';
    else if (dy < 0) dir = 'up';
    else if (dy > 0) dir = 'down';
    this.direction = dir;
    this._updateDot();

    const nx = this.tileX + dx;
    const ny = this.tileY + dy;
    if (!this.collision.canMoveTo(nx, ny)) return false;

    this._pendingDx = dx;
    this._pendingDy = dy;
    this._moveProgress = 0;
    this.isMoving = true;
    this.justMoved = false;
    return true;
  }

  update(delta) {
    this.justMoved = false;
    if (!this.isMoving) return;

    this._moveProgress += MOVE_SPEED * delta;
    if (this._moveProgress >= 1) {
      this.tileX += this._pendingDx;
      this.tileY += this._pendingDy;
      this.visualX = this.tileX;
      this.visualY = this.tileY;
      this._moveProgress = 0;
      this.isMoving = false;
      this.justMoved = true;
    } else {
      this.visualX = (this.tileX) + this._pendingDx * this._moveProgress;
      this.visualY = (this.tileY) + this._pendingDy * this._moveProgress;
    }
    this._group.position.set(this.visualX, -this.visualY, 0.1);
  }

  setPosition(x, y) {
    this.tileX = x;
    this.tileY = y;
    this.visualX = x;
    this.visualY = y;
    this.isMoving = false;
    this._group.position.set(x, -y, 0.1);
  }

  dispose(scene) {
    scene.remove(this._group);
  }
}
