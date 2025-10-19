export const queryKeys = {
  voteCounts: () => ['vote_counts'] as const,
  votedByIp: (ip: string | null) => ['voted_by_ip', ip] as const,
  votingSettings: () => ['voting_settings'] as const,
  ipEligibility: (ip: string | null) => ['ip_eligibility', ip] as const,
  activeContestants: () => ['active_contestants'] as const,
};
