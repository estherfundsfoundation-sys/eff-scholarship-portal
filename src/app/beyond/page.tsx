import Link from "next/link";
import {ArrowRight,BriefcaseBusiness,HeartHandshake,Landmark,LifeBuoy,MessageCircle,Sparkles,UsersRound} from "lucide-react";

export default function BeyondHome(){return <main>
  <section className="beyond-hero"><div className="beyond-orbit" aria-hidden="true"><span>STUDENT</span><span>GRADUATE</span><span>PROFESSIONAL</span><span>MENTOR</span></div><div className="beyond-hero-copy"><p className="beyond-kicker">A new chapter by Esther Funds Foundation</p><h1>College was one chapter.<br/><em>There&apos;s more Beyond.</em></h1><p className="beyond-lead">You graduated from college. You didn&apos;t graduate from needing community.</p><div className="beyond-actions"><a className="beyond-button beyond-groupme-button" href="https://groupme.com/join_group/117295571/z5lprYGT" target="_blank" rel="noopener noreferrer"><MessageCircle/> Join the Beyond groupchat <ArrowRight/></a><Link className="beyond-button beyond-button-secondary" href="/beyond/join">Create my Beyond profile</Link><Link className="beyond-text-link" href="/beyond/explore">See what&apos;s here</Link></div></div><div className="beyond-side-note"><b>01 — THE PROMISE</b><p>No one should have to navigate life after college alone.</p></div></section>

  <section className="beyond-manifesto"><p>NOT AN ALUMNI LIST.</p><p>NOT AN ENDLESS FEED.</p><h2>A living community for the years nobody prepares you for.</h2><div><span>Belong.</span><span>Become.</span><span>Build.</span><span>Give back.</span></div></section>

  <section className="beyond-pathways"><div className="beyond-section-intro"><p className="beyond-kicker dark">Start with what you need now</p><h2>Life after college is not one straight line.</h2><p>Beyond meets members across changing cities, careers, relationships, faith journeys, and seasons of becoming.</p></div><div className="beyond-path-grid">
    <article><UsersRound/><small>COMMUNITY</small><h3>I need my people.</h3><p>Find Brotherhood, Sisterhood, city groups, shared-interest Circles, and meaningful events.</p><Link href="/beyond/explore#circles">Find a Circle <ArrowRight/></Link></article>
    <article><BriefcaseBusiness/><small>CAREER</small><h3>I need my next move.</h3><p>Navigate résumés, interviews, offers, workplace culture, layoffs, pivots, and graduate school.</p><Link href="/beyond/explore#career">Build my plan <ArrowRight/></Link></article>
    <article><LifeBuoy/><small>LIFE</small><h3>I need real-life guidance.</h3><p>Learn the money, benefits, housing, boundaries, and routines missing from the graduation packet.</p><Link href="/beyond/explore#life">Open Life 101 <ArrowRight/></Link></article>
    <article><HeartHandshake/><small>MENTORSHIP</small><h3>I need—or can be—the bridge.</h3><p>Receive support at one stage and offer it at another through EFF FutureLink.</p><a href="https://mentor.estherfundsfoundation.org">Enter FutureLink <ArrowRight/></a></article>
  </div></section>

  <section className="beyond-loop"><div><p className="beyond-kicker">The EFF lifelong loop</p><h2>The mission doesn&apos;t end at graduation.</h2><p>Beyond keeps graduates connected to support—and creates a clear path back to the students coming behind them.</p></div><ol><li><b>01</b>Student</li><li><b>02</b>Graduate</li><li><b>03</b>Professional</li><li><b>04</b>Mentor</li><li><b>05</b>Leader</li><li><b>06</b>Giver</li></ol></section>

  <section className="beyond-editorial"><div className="beyond-editorial-number">BE<br/>YO<br/>ND</div><div><Sparkles/><p className="beyond-kicker dark">The things nobody put in the graduation packet</p><h2>Work. Money. Faith. Friendship. Purpose. Real life.</h2><p>Beyond turns scattered questions into clear next steps, trusted people, and a community designed around purposeful connection.</p><Link className="beyond-button dark-button" href="/beyond/join">Join the founding community <ArrowRight/></Link></div></section>

  <section className="beyond-final"><Landmark/><p>For every future still unfolding.</p><h2>Graduation was not the end of your support system.</h2><Link href="/beyond/join">Meet us Beyond <ArrowRight/></Link></section>
</main>}
