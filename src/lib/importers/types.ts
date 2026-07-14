export type ParsedScholarship={title:string;sponsor:string|null;amountText:string|null;deadlineText:string;originalUrl:string;sourceUrl:string;academicLevels?:string[]};
export interface SourceAdapter{key:string;parse(html:string,sourceUrl:string):ParsedScholarship[]}
