import { test } from "node:test";
import assert from "node:assert/strict";
import { moderateText, normalizeMessage } from "../lib/chat/policy";
import { chatAvailable, retentionSettings } from "../lib/chat/config";
test("deterministic moderation preserves harmless multilingual discussion and explains risk signals", () => {
  for(const body of ["How do we report scams and illegal goods?", "請問如何檢舉毒品與性交易？", "Bagaimana melaporkan narkoba dan penipuan?", "Is sex a prohibited discussion topic?", "We should avoid threats and harassment."]) assert.equal(moderateText(body).outcome,"ALLOWED",body);
  for(const body of ["I will kill you", "我要殺死你", "Aku akan membunuhmu", "I sell cocaine", "jual narkoba", "販售毒品", "I offer paid sex", "menjual jasa seks", "提供性交易服務"]) {const r=moderateText(body);assert.equal(r.outcome,"HELD",body);assert.ok(r.ruleCodes.length);}
  for(const body of ["Someone said 'I will kill you'; I am reporting this threat", "不要販售毒品", "Jangan jual narkoba"]) assert.notEqual(moderateText(body).outcome,"HELD",body);
  for(const body of ["Send me your OTP", "傳我驗證碼", "kirim kode otp", "you are an idiot", "你是白痴", "kamu bodoh", "https://bit.ly/unsafe"]) assert.equal(moderateText(body).outcome,"FLAGGED",body);
});
test("normalization and technical rejection do not pretend to be a legal classification",()=>{
  assert.equal(normalizeMessage("Ａ\u200b B\n C"),"a b c");
  for(const body of ["", "\u200b", "bad\u0000text", "a".repeat(4001)]) assert.equal(moderateText(body).outcome,"REJECTED");
});
test("chat defaults off and retention never activates deletion",()=>{
  const names=["CHAT_ENABLED","CHAT_PREVIEW_USER_IDS","CHAT_MESSAGE_RETENTION_DAYS","CHAT_EVIDENCE_RETENTION_DAYS"];
  const old=names.map(n=>process.env[n]);
  try{names.forEach(n=>delete process.env[n]);assert.equal(chatAvailable(10),false);process.env.CHAT_PREVIEW_USER_IDS="10, 11";assert.equal(chatAvailable(10),true);assert.equal(chatAvailable(12),false);process.env.CHAT_MESSAGE_RETENTION_DAYS="90";process.env.CHAT_EVIDENCE_RETENTION_DAYS="365";assert.deepEqual(retentionSettings(),{messageDays:90,reportedEvidenceDays:365,automaticDeletionEnabled:false});}
  finally{names.forEach((n,i)=>{if(old[i]===undefined)delete process.env[n];else process.env[n]=old[i];});}
});
