import Link from "next/link";
import {ArrowRight, Award, BookOpen, ShieldCheck, Sparkles} from "lucide-react";

export const metadata = {
  title: "EFF Leadership Training Academy",
  description: "Practical, faith-rooted leadership and student-support training from Esther Funds Foundation.",
};

export default function AcademyPage() {
  return (
    <main className="academy-page">
      <section className="academy-hero">
        <div className="shell academy-hero-grid">
          <div>
            <div className="eyebrow">EFF Leadership Training Academy</div>
            <h1>Learn it. Practice it. <span>Use it to serve.</span></h1>
            <p>Training for students and leaders who want to show up with knowledge, care, professionalism, and strong boundaries.</p>
            <div className="hero-actions">
              <Link className="button lavender" href="/academy/financial-aid-peer-mentor">Start the featured course <ArrowRight size={18}/></Link>
            </div>
          </div>
          <aside className="academy-hero-note">
            <Sparkles aria-hidden="true"/>
            <strong>Every Future Fulfilled.</strong>
            <p>EFF training turns compassion into responsible action—one clear next step at a time.</p>
          </aside>
        </div>
      </section>

      <section className="section">
        <div className="shell">
          <div className="section-head">
            <div>
              <div className="eyebrow">Top course · New</div>
              <h2>Featured first</h2>
            </div>
            <p>Complete the lessons, pass the final assessment, and earn an EFF course-completion certificate.</p>
          </div>
          <article className="academy-featured-course">
            <div className="academy-course-number">01</div>
            <div>
              <span className="academy-pill">Featured certification course</span>
              <h3>EFF Financial Aid Peer Mentor</h3>
              <p>Learn how to help another student navigate FAFSA accounts, contributors, dependency questions, corrections, verification, aid offers, and urgent barriers—without replacing a financial-aid professional or handling private credentials.</p>
              <div className="academy-meta">
                <span><BookOpen size={17}/> 8 practical modules</span>
                <span><ShieldCheck size={17}/> Privacy-first boundaries</span>
                <span><Award size={17}/> Certificate at 80%</span>
              </div>
              <Link className="button" href="/academy/financial-aid-peer-mentor">Enter course <ArrowRight size={18}/></Link>
            </div>
          </article>
          <div className="academy-coming-soon">
            <div className="eyebrow">Academy note</div>
            <h3>More leadership training will be added here.</h3>
            <p>The Financial Aid Peer Mentor course is placed first so students can immediately learn the safe, practical skills most often needed during financial-aid season.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
