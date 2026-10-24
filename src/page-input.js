// A wheel gesture remains claimed until its inertia has stopped.
export function createWheelIntent({idleMs=190,threshold=36}={}){
  let last=-Infinity,total=0,consumed=false,nestedClaimed=false;
  return {
    update(delta,now,{locked=false,nested=false}={}){
      if(now-last>idleMs){total=0;consumed=false;nestedClaimed=false;}
      last=now;
      if(locked||consumed){consumed=true;return {direction:0,allowNative:false};}
      if(nested){nestedClaimed=true;return {direction:0,allowNative:true};}
      if(nestedClaimed)return {direction:0,allowNative:false};
      if(Math.sign(delta)!==Math.sign(total))total=0;
      total+=delta;
      if(Math.abs(total)<threshold)return {direction:0,allowNative:false};
      consumed=true;
      return {direction:Math.sign(total),allowNative:false};
    }
  };
}

export function wheelPixels(delta,mode,height){return delta*(mode===1?16:mode===2?height:1);}
export function swipeDirection(dx,dy,threshold=64){return Math.abs(dy)>=threshold&&Math.abs(dy)>Math.abs(dx)*1.25?Math.sign(dy):0;}
