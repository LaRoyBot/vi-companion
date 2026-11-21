export type ObjectiveStatus="active"|"paused"|"completed"|"archived";
export type ObjectivePriority="low"|"normal"|"high";
export interface ObjectiveInput{title:string;description?:string|null;category?:string;priority?:ObjectivePriority;progress?:number;status?:ObjectiveStatus}
export interface CurrentObjectiveState{status:ObjectiveStatus;progress:number;completed_at?:string|null}
export declare function normalizeObjectiveInput<T extends ObjectiveInput>(input:T):T&{title:string;progress:number;status:ObjectiveStatus;priority:ObjectivePriority};
export declare function buildObjectiveUpdate(input:Partial<ObjectiveInput>,current?:CurrentObjectiveState,now?:string):Record<string,unknown>;
