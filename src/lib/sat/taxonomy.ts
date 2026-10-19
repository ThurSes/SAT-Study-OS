import type { SatDomain, SatSection } from "../../types/domain";

export const SECTION_LABELS: Record<SatSection, string> = { rw: "Reading and Writing", math: "Math" };
export const DOMAIN_LABELS: Record<SatDomain, string> = {
  "information-and-ideas": "Information and Ideas",
  "craft-and-structure": "Craft and Structure",
  "expression-of-ideas": "Expression of Ideas",
  "standard-english-conventions": "Standard English Conventions",
  algebra: "Algebra",
  "advanced-math": "Advanced Math",
  "problem-solving-and-data-analysis": "Problem-Solving and Data Analysis",
  "geometry-and-trigonometry": "Geometry and Trigonometry",
};
