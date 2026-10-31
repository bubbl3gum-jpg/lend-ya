export type TranslationLocale="en"|"zh-TW";
export const translationCodes=["UNAVAILABLE","DENIED","SESSION","INPUT","STALE_SNAPSHOT","LIMIT","MOCK_UNAVAILABLE","MIXED_SOURCE_UNSUPPORTED","PROTECTED_VALUE_MISMATCH","REJECTED_OUTPUT","CANCELED"] as const;
export type TranslationCode=typeof translationCodes[number];
export class TranslationError extends Error{constructor(public code:TranslationCode){super(code);}}
export type SnapshotDescriptor={version:"translation-snapshot-v1";responseRef:string;canonicalDigest:string;manifestDigest:string;sourceLocale:TranslationLocale;expiresAt:string;fieldPaths:string[];mode:"MOCK_ONLY"};
export type TranslationRequest={version:"advisory-translation-request-v1";responseRef:string;canonicalDigest:string;targetLocale:TranslationLocale;fieldPaths:string[];requestId:string};
export type TranslationArtifact={version:"advisory-translation-v1";state:"AVAILABLE_UNREVIEWED"|"NOT_NEEDED";responseRef:string;canonicalDigest:string;manifestDigest:string;sourceLocale:TranslationLocale;targetLocale:TranslationLocale;requestId:string;provenance:"MOCK_TEST_OUTPUT";provider:{name:"AUTHORED_MOCK_CATALOGUE";version:"authored-translation-v1";model:null};latencyMs:number;warnings:string[];fields:{path:string;canonicalTextDigest:string;original:string;translatedText:string}[]};

export type TranslationFailure={version:"advisory-translation-v1";state:"UNAVAILABLE"|"REJECTED"|"FAILED"|"CANCELED";code:TranslationCode;originalPreserved:true};
export type TranslationResult=TranslationArtifact|TranslationFailure;
