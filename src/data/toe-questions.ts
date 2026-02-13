export type ToeSection = 'technological' | 'organizational' | 'environmental'

export type ToeQuestion = {
  id: string
  text: string
}

// Define the TOE data structure
export const TOE_QUESTIONS: Record<ToeSection, ToeQuestion[]> = {
  technological: [
    {
      id: 'tech_1',
      text: 'We have high-quality, structured data available for AI use.',
    },
    {
      id: 'tech_2',
      text: 'Our IT infrastructure can support AI workloads.',
    },
    {
      id: 'tech_3',
      text: 'We have adequate technical expertise for AI implementation.',
    },
    {
      id: 'tech_4',
      text: 'Our systems integrate well with AI tools.',
    },
    {
      id: 'tech_5',
      text: 'We have sufficient computational resources for AI projects.',
    },
  ],
  organizational: [
    {
      id: 'org_1',
      text: 'Leadership actively supports AI initiatives.',
    },
    {
      id: 'org_2',
      text: 'We have clear AI strategy and roadmap.',
    },
    {
      id: 'org_3',
      text: 'Our teams have the skills needed for AI adoption.',
    },
    {
      id: 'org_4',
      text: 'We have dedicated budget for AI initiatives.',
    },
    {
      id: 'org_5',
      text: 'Organizational culture supports innovation and change.',
    },
  ],
  environmental: [
    {
      id: 'env_1',
      text: 'Current regulations support ethical AI deployment.',
    },
    {
      id: 'env_2',
      text: 'Market conditions favor AI adoption in our industry.',
    },
    {
      id: 'env_3',
      text: 'Partner and vendor ecosystem supports our AI goals.',
    },
    {
      id: 'env_4',
      text: 'Industry standards for AI are clear and adopted.',
    },
    {
      id: 'env_5',
      text: 'Competitors are adopting AI, creating pressure to adopt.',
    },
  ],
}
