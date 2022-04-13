import { getDirection } from "game";
import { ATTACK, HEAL, MOVE, RANGED_ATTACK } from "game/constants";
import { searchPath } from "game/path-finder";
import { Creep, GameObject } from "game/prototypes";

export class Common {
  public static positionDiff(a: number, b: number): number {
    if (a == b) {
      return 0;
    }
    if (a > b) {
      return 1;
    }
    return -1;
  }

  public static flee(creep: Creep, targets: GameObject[], range: number) {
    const result = searchPath(
      creep,
      targets.map(i => ({ pos: i, range })),
      { flee: true }
    );
    if (result.path.length > 0) {
      const direction = getDirection(result.path[0].x - creep.x, result.path[0].y - creep.y);
      creep.move(direction);
    }
  }
  public static canAttack(creep:Creep){
    return creep.body.some(bodyPart => bodyPart.type == ATTACK && bodyPart.hits >0)
  }
  public static canRangedAttack(creep:Creep){
    return creep.body.some(bodyPart => bodyPart.type == RANGED_ATTACK && bodyPart.hits >0)
  }
  public static canHeal(creep: Creep){
    return creep.body.some(bodyPart => bodyPart.type == HEAL && bodyPart.hits >0)
  }
  public static canMove(creep: Creep){
    return creep.body.some(bodyPart => bodyPart.type == MOVE && bodyPart.hits >0)
  }
}
