import type { ModerationOutcome } from "./policy";
export type Example = {id:string;split:string;language:string;group:string;body:string;expectedOutcome:ModerationOutcome;expectedCategories:string[]};
type Decision={outcome:ModerationOutcome;categories:string[]};
export function metrics(pairs:{expected:boolean;actual:boolean}[]) {
  const confusion={TP:0,FP:0,TN:0,FN:0};
  for(const p of pairs) confusion[p.expected?(p.actual?"TP":"FN"):(p.actual?"FP":"TN")]++;
  const {TP,FP,TN,FN}=confusion;
  const ratio=(a:number,b:number)=>b?a/b:null;
  return {count:pairs.length,confusion,precision:ratio(TP,TP+FP),recall:ratio(TP,TP+FN),falsePositiveRate:ratio(FP,FP+TN),falseNegativeRate:ratio(FN,FN+TP)};
}
export function evaluate(examples:Example[], classify:(body:string)=>Decision) {
  const rows=examples.map(e=>({...e,actual:classify(e.body)}));
  const summary=(selected:typeof rows)=>{
    const categories=[...new Set(selected.flatMap(r=>[...r.expectedCategories,...r.actual.categories]))].sort();
    const escalation=(outcome:ModerationOutcome)=>outcome==="FLAGGED"||outcome==="HELD";
    return {technicalRejectionCount:selected.filter(r=>r.actual.outcome==="REJECTED").length,binaryEscalation:metrics(selected.filter(r=>r.expectedOutcome!=="REJECTED").map(r=>({expected:escalation(r.expectedOutcome),actual:escalation(r.actual.outcome)}))),
      outcomeConfusion:Object.fromEntries(["ALLOWED","FLAGGED","HELD","REJECTED"].map(e=>[e,Object.fromEntries(["ALLOWED","FLAGGED","HELD","REJECTED"].map(a=>[a,selected.filter(r=>r.expectedOutcome===e&&r.actual.outcome===a).length]))])),
      categories:Object.fromEntries(categories.map(c=>[c,metrics(selected.map(r=>({expected:r.expectedCategories.includes(c),actual:r.actual.categories.includes(c)})))]))};
  };
  return {overall:summary(rows),byLanguage:Object.fromEntries([...new Set(rows.map(r=>r.language))].sort().map(l=>[l,summary(rows.filter(r=>r.language===l))])),
    byGroup:Object.fromEntries([...new Set(rows.map(r=>r.group))].sort().map(g=>[g,summary(rows.filter(r=>r.group===g))])),
    mismatches:rows.filter(r=>r.expectedOutcome!==r.actual.outcome||[...r.expectedCategories].sort().join()!==[...r.actual.categories].sort().join()),rows};
}
