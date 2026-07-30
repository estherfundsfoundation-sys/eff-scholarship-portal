import type {Metadata} from "next";
import type {LucideIcon} from "lucide-react";
import {BookOpen, ExternalLink, FileCheck2, Landmark, MapPinned, ShieldCheck} from "lucide-react";

export const metadata: Metadata = {title: "National Help Desk Student Resources"};

const resources: Array<{title:string;description:string;url:string;Icon:LucideIcon}> = [
  {title:"Federal Student Aid Help Center",description:"FAFSA, federal aid, account and repayment guidance.",url:"https://studentaid.gov/help-center/contact",Icon:BookOpen},
  {title:"College Navigator",description:"Official federal college directory and institutional links.",url:"https://nces.ed.gov/collegenavigator/",Icon:Landmark},
  {title:"211 Local Resources",description:"Local food, housing, utilities, transportation, and essential-needs navigation.",url:"https://www.211.org/",Icon:MapPinned},
  {title:"Consumer Financial Protection Bureau",description:"Student banking, debt, and complaint information.",url:"https://www.consumerfinance.gov/consumer-tools/student-loans/",Icon:ShieldCheck},
];

export default function HelpDeskResources() {
  return <main className="section white"><div className="shell"><div className="eyebrow">Verified public starting points</div><h1>National Help Desk Student Resources</h1><p className="lead">Use these resources to prepare your next step. A resource does not replace school review, legal advice, or emergency care.</p><div className="help-desk-entry-grid">{resources.map(({title,description,url,Icon})=><article key={title}><Icon/><h3>{title}</h3><p>{description}</p><a className="card-link" href={url} target="_blank" rel="noreferrer">Open official resource <ExternalLink size={14}/></a></article>)}</div><div className="privacy-banner"><FileCheck2/><div><strong>Prepare, then submit through the school’s secure process.</strong><span>Redact unnecessary private data. Never send passwords, Social Security numbers, tax returns, bank details, verification codes, or unredacted IDs to the Help Desk by ordinary email.</span></div></div></div></main>;
}