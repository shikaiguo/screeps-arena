import { getCpuTime, getDirection, getObjectsByPrototype, getTicks } from "game/utils";
import {
  Creep,
  StructureSpawn,
  Source,
  StructureContainer,
  GameObject,
  Structure,
  StructureConstant,
  StructureWall
} from "game/prototypes";
import { MOVE, CARRY, ATTACK, WORK, ERR_NOT_IN_RANGE, RESOURCE_ENERGY, RANGED_ATTACK, HEAL } from "game/constants";
import { BodyPart } from "arena";
import { Visual } from "game/visual";
import { arenaInfo } from "game";
import { CostMatrix } from "game/path-finder";
import { Common } from "utils/Common";
const ACTION_STYLE = {
  font: "0.5",
  opacity: 0.7,
  backgroundColor: "#808080",
  backgroundPadding: 0.03
};
declare module "game/prototypes" {
  interface Creep {
    actionVisual: Visual;
  }
}
let hasLoad = false;
let containers: StructureContainer[];
let mySpawn: StructureSpawn;
let enemySpawn: StructureSpawn;

let myCreeps: Creep[];
let enemyCreeps: Creep[];

let nearestEnemy: Creep | undefined;
let healTarget: Creep | undefined;
export function loop(): void {
  if (!hasLoad) {
    loadStructures();
  }
  containers = getObjectsByPrototype(StructureContainer);
  const ticks = getTicks();
  // for(let i =0;i<100;i++){
  //   for(let j =0;j<100;j++){
  //     new Visual().text(costMatrix.get(i, j).toString(), {x:i, y:j},ACTION_STYLE);
  //   }
  // }
  myCreeps = getObjectsByPrototype(Creep).filter(i => i.my);
  myCreeps.forEach(creep => {
    if (!creep.actionVisual) {
      creep.actionVisual = new Visual(10, true);
    }
  });
  enemyCreeps = getObjectsByPrototype(Creep).filter(i => !i.my);
  const creep = myCreeps.filter(i => i.body.some(bodyPart => bodyPart.type == CARRY));
  // const heals = myCreeps.filter(i => i.body.some(bodyPart => bodyPart.type == HEAL));
  var body = [];
  if (creep.length < 3) {
    body = [CARRY, CARRY, MOVE, MOVE];
    // } else if (heals.length < 2) {
    //   body = [MOVE, MOVE, MOVE, HEAL];
  } else {
    body = [MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, RANGED_ATTACK, RANGED_ATTACK, HEAL];
  }
  mySpawn?.spawnCreep(body);

  // find nearest enemy creep
  nearestEnemy = undefined;
  enemyCreeps.forEach(enemy => {
    var min = 9999;
    var tmp = mySpawn.getRangeTo(enemy);
    if (tmp < min) {
      min = tmp;
      nearestEnemy = enemy;
    }
  });

  myCreeps.forEach(creep => {
    // define carry
    if (creep.body.some(bodyPart => bodyPart.type == CARRY)) {
      if (creep.store.getFreeCapacity(RESOURCE_ENERGY)) {
        // find nearest container
        let targetContainer: StructureContainer | undefined;
        let min = 9999;
        containers.forEach(container => {
          if (container.store.energy > 80) {
            const tmp = creep.getRangeTo(container);
            if (tmp < min) {
              min = tmp;
              targetContainer = container;
            }
          }
        });
        if (targetContainer != undefined && creep.withdraw(targetContainer, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
          creep.moveTo(targetContainer);
          new Visual().line(creep, targetContainer, { lineStyle: "dotted", color: "#0000ff" });
        }
      } else {
        if (creep.transfer(mySpawn, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
          creep.moveTo(mySpawn);
        }
      }
    } else {
      // define solider
      if (ticks < 250) {
        Common.flee(creep, [mySpawn], 40);
        return;
      }
      // if (creep.body.some(bodyPart => bodyPart.type == HEAL)) {
      // healerAction(creep);
      // } else {
      attackerAction(creep);
      // }
    }
  });
  // console.log(`CPU time used: ${getCpuTime() / 1000000}/${arenaInfo.cpuTimeLimit / 1000000} ms`);
}
function loadStructures() {
  mySpawn = getObjectsByPrototype(StructureSpawn).find(i => i.my) as StructureSpawn;
  enemySpawn = getObjectsByPrototype(StructureSpawn).find(i => !i.my) as StructureSpawn;
  hasLoad = true;
}
function attackerAction(creep: Creep) {
  // let distance = 9999;
  let enemyCreepsAround = creep
    .findInRange(enemyCreeps, 2)
    .filter(i => Common.canAttack(i) || Common.canRangedAttack(i));

  if (enemyCreepsAround.length > 0 && Common.canMove(creep)) {
    // 2距离内有敌人 逃跑
    Common.flee(creep, enemyCreepsAround, 3);
    // let distance = 10;
    // let avoidTarget: Creep | undefined;
    // enemyCreepsAround.forEach(enemyCreep => {
    //   let avoidDistance = 0;
    //   if (enemyCreep.body.some(bodyPart => bodyPart.type == RANGED_ATTACK||bodyPart.type == ATTACK)) {
    //     avoidDistance = 3;
    //   } else if (enemyCreep.body.some(bodyPart => bodyPart.type == ATTACK)) {
    //     avoidDistance = 2;
    //   }
    //   const tmp = creep.getRangeTo(enemyCreep);
    //   if (tmp < avoidDistance && tmp < distance) {
    //     distance = tmp;
    //     avoidTarget = enemyCreep;
    //   }
    // });
    // 附近有敌人 远离

    // if (avoidTarget) {
    new Visual().text("避", { x: creep.x, y: creep.y - 0.5 }, ACTION_STYLE);
    // let position = getAvoidPosition(creep, avoidTarget);
    // console.log(costMatrix.get(position.x, position.y))
    // if (costMatrix.get(position.x, position.y)>10) {
    // creep.moveTo(mySpawn);
    // } else {
    // creep.moveTo(position);
    // }
    // creep.move(getDirection(creep.x - avoidTarget.x, creep.y - avoidTarget.y));
    return;
    // }
  }
  enemyCreepsAround = creep.findInRange(enemyCreeps, 7).filter(i => Common.canAttack(i) || Common.canRangedAttack(i));
  // 进行治疗
  if (
    enemyCreepsAround.length == 0 ||
    (!Common.canAttack(creep) && !Common.canRangedAttack(creep) && Common.canHeal(creep))
  ) {
    // 7格内没有敌人 或 不能攻击 -> 进行治疗
    let myCreepsAround = creep.findInRange(myCreeps, 3);
    let rate = creep.hits / creep.hitsMax;
    let healTarget = creep;
    myCreepsAround.forEach(myCreep => {
      const tmp = myCreep.hits / myCreep.hitsMax;
      if (rate > tmp) {
        rate = tmp;
        healTarget = myCreep;
      }
    });
    if (rate < 1) {
      new Visual().text(
        "疗",
        { x: creep.x, y: creep.y - 0.5 }, // above the creep
        ACTION_STYLE
      );
      if (creep.getRangeTo(healTarget) < 2) {
        creep.heal(healTarget);
      } else {
        creep.rangedHeal(healTarget);
      }
      return;
    }
  }
  // 寻找攻击目标
  let target: Creep | Structure<StructureConstant> = enemySpawn; // 目标
  // 附近的敌人
  let distance = 10;
  let attackEnemyCreeps = creep.findInRange(enemyCreeps, 3).filter(Common.canHeal);
  if (attackEnemyCreeps.length == 0) {
    attackEnemyCreeps = creep
      .findInRange(enemyCreeps, 7)
      .filter(i => (Common.canAttack(i) || Common.canRangedAttack(i)) && (i.x != enemySpawn.x && i.y != enemySpawn.y));
  }
  attackEnemyCreeps.forEach(enemyCreep => {
    const tmp = creep.getRangeTo(enemyCreep);
    if (tmp < distance) {
      distance = tmp;
      target = enemyCreep;
    }
  });
  new Visual().line(creep, target, { lineStyle: "dashed", color: "#ff0000" });
  new Visual().text("击", creep, ACTION_STYLE);
  if (creep.rangedAttack(target) == ERR_NOT_IN_RANGE) {
    creep.moveTo(target);
  }
}
function attackerAction2(creep: Creep) {
  let target: Creep | Structure<StructureConstant> = enemySpawn; // 目标
  var distance = 9999;
  // 获得最近的敌人
  creep.findInRange(enemyCreeps, 10).forEach(enemyCreep => {
    if ((Common.canAttack(enemyCreep) || Common.canRangedAttack(enemyCreep)) && enemyCreep.hits > 0) {
      const tmp = creep.getRangeTo(enemyCreep);
      if (tmp < distance) {
        distance = tmp;
        target = enemyCreep;
      }
    }
  });
  if (distance < 3) {
    // 远离敌人
    // creep.moveTo(mySpawn)
    creep.move(getDirection(creep.x - target.x, creep.y - target.y));
    return;
  } else {
    new Visual().line(creep, target, { lineStyle: "dashed", color: "#ff0000" });
    new Visual().text("击", creep, ACTION_STYLE);
    if (creep.rangedAttack(target) == ERR_NOT_IN_RANGE) {
      creep.moveTo(target);
    }
  }
}
function healerAction(creep: Creep) {
  new Visual().text("❤", creep, { color: "#0f0" });
  let needHealCreep: Creep | undefined;
  let furthestDistance = 99999;
  let farTarget: Creep | undefined;
  // let secTarget: Creep | undefined;
  const healGoal = 0.8;

  if (healTarget != undefined && healTarget.exists && healTarget.hits / healTarget.hitsMax > healGoal) {
    healTarget = undefined;
  }
  if (healTarget == undefined || !healTarget.exists) {
    // find new target
    let hitsRate = 1;
    myCreeps.forEach(myCreep => {
      const tmpHitsRate = myCreep.hits / myCreep.hitsMax;
      if (tmpHitsRate < hitsRate && tmpHitsRate < healGoal) {
        hitsRate = tmpHitsRate;
        needHealCreep = myCreep;
      }
      // const tmpDistance = myCreep.findPathTo(mySpawn).length;
      const tmpDistance = myCreep.getRangeTo(enemySpawn);
      if ((Common.canAttack(myCreep) || Common.canRangedAttack(myCreep)) && tmpDistance < furthestDistance) {
        furthestDistance = tmpDistance;
        // secTarget = farTarget;
        farTarget = myCreep;
      }
    });
    farTarget && new Visual().text("F", farTarget, { color: "#f00" });
    if (needHealCreep == undefined) {
      if (farTarget != undefined) {
        healTarget = farTarget;
      } else {
        healTarget = undefined;
      }
    } else {
      healTarget = needHealCreep;
    }
  }
  if (healTarget != undefined && healTarget.hits < healTarget.hitsMax) {
    new Visual().line(creep, healTarget, { color: "#00ff00", lineStyle: "dashed" });
    if (creep.rangedHeal(healTarget) == ERR_NOT_IN_RANGE) {
      creep.moveTo(healTarget);
    }
  } else {
    creep.moveTo(mySpawn);
  }
}
function getAvoidPosition(source: GameObject, target: GameObject): { x: number; y: number } {
  return {
    x: source.x + Common.positionDiff(source.x, target.x),
    y: source.y + Common.positionDiff(source.y, target.y)
  };
}
