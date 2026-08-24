import type {Metadata} from "next";
import SelahExperience from "./SelahExperience";
import "./selah.css";

export const metadata: Metadata = {
  title: "Selah - A Quiet Space for College Students",
  description: "A free Christ-centered pause for college students with gentle instrumental ambience, scripture, breathing, and support resources.",
};

export default function SelahPage() {
  return <SelahExperience />;
}
