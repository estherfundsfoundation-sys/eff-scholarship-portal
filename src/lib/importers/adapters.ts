import type { ParsedScholarship,SourceAdapter } from "./types";

const text=(value:string)=>value.replace(/<[^>]*>/g," ").replace(/&amp;/g,"&").replace(/&#8211;|&ndash;/g,"–").replace(/\s+/g," ").trim();
const links=(html:string)=>[...html.matchAll(/<a\s[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)].map(m=>({url:m[1],label:text(m[2])}));

export const scholarshipCollectiveAdapter:SourceAdapter={key:"scholarship_collective",parse(html,sourceUrl){return links(html).filter(x=>/scholarship|award|grant/i.test(x.label)&&/^https?:/i.test(x.url)).map(x=>({title:x.label,sponsor:null,amountText:null,deadlineText:"varies",originalUrl:x.url,sourceUrl}));}};
export const jlvAdapter:SourceAdapter={key:"jlv_college_counseling",parse(html,sourceUrl){const results:ParsedScholarship[]=[];for(const block of html.split(/<h[234][^>]*>/i).slice(1)){const heading=block.match(/^([\s\S]*?)<\/h[234]>/i);if(!heading)continue;const title=text(heading[1]);if(!/scholarship|award|grant/i.test(title))continue;const link=links(block)[0];if(!link)continue;const amount=text(block.match(/(?:Amount|Award):\s*([\s\S]{0,100}?)(?:<br|<\/p>)/i)?.[1]??"")||null;const deadline=text(block.match(/(?:Deadline|Closing Date):\s*([\s\S]{0,100}?)(?:<br|<\/p>)/i)?.[1]??"")||"varies";results.push({title,sponsor:null,amountText:amount,deadlineText:deadline,originalUrl:new URL(link.url,sourceUrl).toString(),sourceUrl});}return results;}};

export function adapterFor(key:string){if(key===scholarshipCollectiveAdapter.key)return scholarshipCollectiveAdapter;if(key===jlvAdapter.key)return jlvAdapter;throw new Error(`Unknown source adapter: ${key}`)}
