import Matter from 'matter-js';

export interface PhysicsCoinData {
  id: string;
  type: 'WHITE' | 'BLACK' | 'QUEEN' | 'STRIKER';
  x: number;
  y: number;
}

export class PhysicsEngine {
  public engine: Matter.Engine;
  public world: Matter.World;
  public bodies: Map<string, Matter.Body> = new Map();
  private boardSize: number;

  constructor(boardSize: number = 600) {
    this.boardSize = boardSize;
    this.engine = Matter.Engine.create({
      gravity: { x: 0, y: 0, scale: 0 },
    });
    this.world = this.engine.world;

    this.createWalls();
  }

  private createWalls(): void {
    const bs = this.boardSize;
    const wallThick = 50;

    const walls = [
      // Top
      Matter.Bodies.rectangle(bs / 2, 24 - wallThick / 2, bs, wallThick, { isStatic: true, restitution: 0.92 }),
      // Bottom
      Matter.Bodies.rectangle(bs / 2, bs - 24 + wallThick / 2, bs, wallThick, { isStatic: true, restitution: 0.92 }),
      // Left
      Matter.Bodies.rectangle(24 - wallThick / 2, bs / 2, wallThick, bs, { isStatic: true, restitution: 0.92 }),
      // Right
      Matter.Bodies.rectangle(bs - 24 + wallThick / 2, bs / 2, wallThick, bs, { isStatic: true, restitution: 0.92 }),
    ];

    Matter.World.add(this.world, walls);
  }

  public initCoins(coins: PhysicsCoinData[]): void {
    // Clear existing bodies
    this.bodies.forEach((body) => Matter.World.remove(this.world, body));
    this.bodies.clear();

    coins.forEach((c) => {
      const isStriker = c.type === 'STRIKER';
      const radius = isStriker ? 20 : 14;

      const body = Matter.Bodies.circle(c.x, c.y, radius, {
        restitution: 0.88,
        friction: 0.03,
        frictionAir: 0.018,
        density: isStriker ? 0.003 : 0.0015,
        label: c.id,
      });

      this.bodies.set(c.id, body);
      Matter.World.add(this.world, body);
    });
  }

  public applyStrikerImpulse(strikerId: string, angle: number, power: number): void {
    const body = this.bodies.get(strikerId);
    if (!body) return;

    const forceMagnitude = (power / 100) * 0.08;
    const force = {
      x: Math.cos(angle) * forceMagnitude,
      y: Math.sin(angle) * forceMagnitude,
    };

    Matter.Body.applyForce(body, body.position, force);
  }

  public stepPhysics(delta: number = 16.66): void {
    Matter.Engine.update(this.engine, delta);
  }

  public getPocketedCoins(): string[] {
    const pocketOffset = 46;
    const pocketRadiusSq = 26 * 26;
    const pockets = [
      [pocketOffset, pocketOffset],
      [this.boardSize - pocketOffset, pocketOffset],
      [pocketOffset, this.boardSize - pocketOffset],
      [this.boardSize - pocketOffset, this.boardSize - pocketOffset],
    ];

    const pocketed: string[] = [];

    this.bodies.forEach((body, id) => {
      const pos = body.position;
      pockets.forEach(([px, py]) => {
        const dx = pos.x - px;
        const dy = pos.y - py;
        if (dx * dx + dy * dy <= pocketRadiusSq) {
          pocketed.push(id);
        }
      });
    });

    return pocketed;
  }

  public isWorldAtRest(): boolean {
    let moving = false;
    this.bodies.forEach((body) => {
      const speed = Math.hypot(body.velocity.x, body.velocity.y);
      if (speed > 0.05) {
        moving = true;
      } else {
        Matter.Body.setVelocity(body, { x: 0, y: 0 });
      }
    });
    return !moving;
  }
}
