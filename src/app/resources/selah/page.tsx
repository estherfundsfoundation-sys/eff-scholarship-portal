import type {Metadata} from "next";
import SelahExperience from "./SelahExperience";
import "./selah.css";

export const metadata: Metadata = {
  title: "Selah - Mental Wellness for College Students",
  description: "A free Christ-centered mental wellness space for college students with phone-friendly rain and music soundscapes, breathing, grounding, scripture, and real-time support.",
  alternates: {canonical: "https://selah.estherfundsfoundation.org"},
  openGraph: {
    title: "Selah by Esther Funds Foundation",
    description: "Breathe, pray, rest, and find your next step in a free mental wellness space for college students.",
    url: "https://selah.estherfundsfoundation.org",
    type: "website",
  },
};

export default function SelahPage() {
  return <SelahExperience />;
}
