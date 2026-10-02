export type AppRole="CUSTOMER"|"MAID"|"MAID_MANAGER"|"ADMIN"|"DOCTOR"|"NURSE"|"DRIVER"|"COOK"|"PHARMACY"|"VENDOR"|"OTHER_SERVICE_PROVIDER";
export function hasRoleAccess(actual:AppRole,allowed:readonly AppRole[]){return allowed.includes(actual)}
export function canAssignMaid(status:string,isActive:boolean){return isActive&&(status==="VERIFIED"||status==="ACTIVE")}
