const STATUSES=new Set(["active","paused","completed","archived"]);
const PRIORITIES=new Set(["low","normal","high"]);
export function normalizeObjectiveInput(input){
 if(!input||typeof input!=="object"||Array.isArray(input))throw new TypeError("objective input must be an object");
 const title=typeof input.title==="string"?input.title.trim():"";
 if(title.length<2||title.length>120)throw new Error("title must be 2-120 characters");
 const progress=input.progress??0;if(!Number.isInteger(progress)||progress<0||progress>100)throw new Error("progress must be an integer from 0 to 100");
 const status=input.status??"active";if(!STATUSES.has(status))throw new Error("invalid status");
 const priority=input.priority??"normal";if(!PRIORITIES.has(priority))throw new Error("invalid priority");
 if(status==="completed"&&progress!==100)throw new Error("completed objectives must have 100% progress");
 return {...input,title,progress,status,priority};
}
export function buildObjectiveUpdate(input,current={status:"active",progress:0},now=new Date().toISOString()){
 if(!input||typeof input!=="object"||Array.isArray(input))throw new TypeError("objective update must be an object");
 const values={};for(const key of ["title","description","category","priority","progress","status"])if(input[key]!==undefined)values[key]=input[key];
 if(values.title!==undefined){values.title=String(values.title).trim();if(values.title.length<2||values.title.length>120)throw new Error("title must be 2-120 characters")}
 if(values.progress!==undefined&&(!Number.isInteger(values.progress)||values.progress<0||values.progress>100))throw new Error("progress must be an integer from 0 to 100");
 if(values.priority!==undefined&&!PRIORITIES.has(values.priority))throw new Error("invalid priority");
 if(values.status!==undefined&&!STATUSES.has(values.status))throw new Error("invalid status");
 if(!Object.keys(values).length)throw new Error("provide at least one field to update");
 if(values.status==="completed"||values.progress===100){values.status="completed";values.progress=100;values.completed_at=current.status==="completed"?undefined:now;if(values.completed_at===undefined)delete values.completed_at}
 else if(values.progress!==undefined&&values.progress<100&&current.status==="completed"){values.status="active";values.completed_at=null}
 return values;
}