export interface SocialProofResult {
  text: string;
  showProjectSpecific: boolean;
}

export function getSocialProofText(
  projectCount: number,
  platformCount: number,
  projectName: string
): SocialProofResult {
  // Threshold: 25+ voor project-specifiek, anders platform-breed
  if (projectCount >= 25) {
    return {
      text: `${projectCount} investeerders downloadden dit voor ${projectName}`,
      showProjectSpecific: true,
    };
  }
  
  if (projectCount >= 10) {
    return {
      text: `Tientallen investeerders oriënteerden zich al op ${projectName}`,
      showProjectSpecific: true,
    };
  }
  
  // Fallback naar platform-breed
  const displayCount = Math.max(platformCount, 50); // Minimum 50 voor geloofwaardigheid
  return {
    text: `Al ${displayCount}+ investeerders oriënteerden zich via Top Immo Spain`,
    showProjectSpecific: false,
  };
}
