// Log coordinates are shared by points, ticks, grid lines, and projections.
export const plotAxes={answerable:[53,78],refusal:[56,94],auc:[.625,.835]};
export const paperCamera={yaw:-.26,tilt:.48};
export function logPosition(value,[low,high]){return Math.log(value/low)/Math.log(high/low);}
export function modelPosition(model,axes=plotAxes){return ['answerable','refusal','auc'].map(key=>logPosition(model[key],axes[key]));}
export function projectPoint([x,y,z],width,height,{yaw,tilt}=paperCamera){
  const a=(x-.5)*Math.cos(yaw)+(y-.5)*Math.sin(yaw);
  const b=-(x-.5)*Math.sin(yaw)+(y-.5)*Math.cos(yaw);
  return [width*.51+a*width*.67,height*.715-a*height*.025-b*height*.255-z*height*tilt];
}
