// ─────────────────────────────────────────────────────────────
//  EDIT THIS FILE. Everything the site says about you lives here.
//  Text comes from your résumé. Anything marked PLACEHOLDER is
//  filler I could not source — replace or delete it before launch.
// ─────────────────────────────────────────────────────────────

export const content = {
  name: 'Cameron Weston',
  tagline: 'Senior full-stack engineer who knows where AI-written code breaks. Look around, then go into the computer.',

  // Pills in the top-left corner and the Contact app.
  links: [
    { label: 'GitHub', url: 'https://github.com/cameron-weston' },
    { label: 'LinkedIn', url: 'https://www.linkedin.com/in/cameronweston' },
    { label: 'Résumé', url: 'resume.pdf' }, // export a PDF and drop it next to index.html
    { label: 'Email', url: 'mailto:cameronbweston@gmail.com' },
  ],

  about: {
    headline: 'Hi, I’m Cameron.',
    paragraphs: [
      'I’m a full-stack software engineer in Seattle with 10 years of experience shipping production code, plus daily hands-on agentic coding with Claude Code and frontier models.',
      'I know where AI-generated code breaks: confidently wrong solutions, silent data bugs, stale async state, unsafe code that skips authorization, and faked test passes. At my last company I used AI to find bugs nobody had reported, filed them, then fixed, tested and merged them myself.',
      'I write clear, specific bug reports that explain the failure and why it happened.',
    ],
    stats: [
      { n: '10', label: 'years shipping production code' },
      { n: '116', label: 'pull requests merged in two years' },
      { n: '837', label: 'commits, Sep 2024 – Sep 2026' },
      { n: '4', label: 'junior engineers mentored' },
    ],
    skills: {
      'AI code evaluation': ['Claude Code', 'Agentic coding', 'Red-teaming', 'AI code review', 'Failure analysis', 'LLM integration'],
      Languages: ['C#', 'TypeScript', 'JavaScript', 'SQL', 'Python', 'Swift'],
      Backend: ['ASP.NET Core', 'REST APIs', 'Background workers', 'OAuth 2.0', 'SQL Server', 'Redis'],
      Frontend: ['Blazor', 'ASP.NET MVC', 'React', 'Telerik / Kendo UI'],
      'Cloud & tooling': ['Azure App Service', 'Azure Key Vault', 'Azure DevOps', 'Git', 'CI/CD'],
      Practices: ['Unit & integration testing', 'Code review', 'Incident response', 'Security & authorization review'],
    },
  },

  // Shown in the Projects app on the computer.
  // Optional per project: image: 'images/shot.png' (replaces the colour tile),
  // links: [{ label, url }].
  projects: [
    {
      title: 'AI-assisted bug hunt',
      org: 'Catalyst IQ · AI code evaluation',
      blurb: 'Used AI code analysis to find defects nobody had reported, then fixed and merged them myself.',
      description: [
        'I audited a Blazor migration against the legacy behaviour it replaced, using AI-assisted analysis to surface the differences. Each failure was documented on the Azure DevOps board, then fixed, tested and merged.',
        'The bugs were the confidently wrong kind: filters that silently dropped, numeric and percentage ranges that returned the wrong rows, and saved dashboards that looked restored but were not. I traced each one from the UI through service parsing into SQL scope.',
      ],
      highlights: [
        'Root causes included integer casts crushing values, off-by-one date boundaries and stale async results overwriting newer ones',
        'Red-teamed for unsafe code: tenant-context leaks, role-permission gaps and inconsistent market-access enforcement',
        'Every AI-written change was reviewed against production standards before it merged',
      ],
      tags: ['Claude Code', 'C#', 'Blazor', 'SQL Server'],
      colors: ['#e2725b', '#7a2e4d'],
      note: 'Proprietary code — happy to walk through it on a call.',
    },
    {
      title: 'Strategy Builder',
      org: 'Catalyst IQ · Core revenue product',
      blurb: 'Architected the company’s core revenue product and led its 2.0 rebuild.',
      description: [
        'Strategy Builder is the core revenue product of a multi-tenant automotive analytics SaaS. I architected it end to end and later led the 2.0 rebuild.',
        'I was one of the first engineers on a team that grew to more than 20.',
      ],
      highlights: [
        'Stabilised the revenue workflows around it: quote submission, integer entry, charts that never loaded',
        'Replaced a load-every-dealer query with scoped server reads and debounced search',
      ],
      tags: ['C#', 'ASP.NET Core', 'SQL Server', 'Blazor'],
      colors: ['#f2b66d', '#8a4b2a'],
      note: 'Proprietary code — happy to walk through it on a call.',
    },
    {
      title: 'Health Score',
      org: 'Catalyst IQ · Algorithm design',
      blurb: 'A 0–100 score built from 7 weighted metrics, with configurable Competitive Sets.',
      description: [
        'I designed the Health Score algorithms: a single 0–100 number built from seven weighted metrics, benchmarked against Competitive Sets that each customer can configure.',
      ],
      highlights: ['7 weighted metrics on a 0–100 scale', 'Configurable Competitive Sets for benchmarking'],
      tags: ['C#', 'SQL Server', 'Analytics'],
      colors: ['#58b99d', '#1f5f6b'],
      note: 'Proprietary code — happy to walk through it on a call.',
    },
    {
      title: 'CatalystSEO & AI search visibility',
      org: 'Catalyst IQ · Built solo',
      blurb: 'A product line built solo, including LLM jobs that measure how visible client sites are in AI search.',
      description: [
        'I built the CatalystSEO product line on my own.',
        'It includes recurring AEO (Answer Engine Optimization) jobs that query LLMs against every active SEO client website to measure AI search visibility.',
      ],
      highlights: ['Shipped LLM features to production', 'Recurring background jobs across every active client site'],
      tags: ['LLM integration', 'Background workers', 'C#'],
      colors: ['#9b7bea', '#3a2a7a'],
      note: 'Proprietary code — happy to walk through it on a call.',
    },
    {
      title: 'Google OAuth 2.0 & GA4 integration',
      org: 'Catalyst IQ · Solo, 13 backlog items',
      blurb: 'From proof of concept through Google’s formal app verification, with zero regressions at launch.',
      description: [
        'I took the Google OAuth 2.0 and GA4 integration from proof of concept through Google’s formal app verification by myself.',
      ],
      highlights: [
        'Redis token cache and Azure Key Vault secrets',
        'Account pagination, policy pages and model tests',
        'Zero regressions at launch',
      ],
      tags: ['OAuth 2.0', 'Redis', 'Azure Key Vault', 'GA4'],
      colors: ['#5c9dff', '#2c3f9e'],
      note: 'Proprietary code — happy to walk through it on a call.',
    },
    {
      title: 'Production incident: memory overflow',
      org: 'Catalyst IQ · Incident response',
      blurb: 'Root-caused an Azure App Service memory overflow and rewrote a 17-second stored procedure.',
      description: [
        'An Azure App Service was overflowing memory. I traced it to Newtonsoft buffering huge JSON payloads to a temp drive that had filled up, then moved the service to System.Text.Json streaming with API pagination.',
        'Separately, I rewrote a 17-second SQL stored procedure to use table partitions.',
      ],
      highlights: ['Streaming instead of buffering', 'Pagination at the API boundary', 'Partitioned the slow query'],
      tags: ['Azure App Service', 'System.Text.Json', 'SQL Server'],
      colors: ['#ef6f6c', '#5a1f2e'],
      note: 'Proprietary code — happy to walk through it on a call.',
    },
    {
      title: 'Reel Taste',
      org: 'Side project',
      blurb: 'Film and TV recommendations that fit your taste better than Netflix or Letterboxd.',
      description: [
        'Reel Taste sets out to improve on the film and TV recommendations you get from Netflix and Letterboxd.',
        'It uses a proprietary algorithm that leverages an LLM to build a taste profile tailored specifically to you.',
      ],
      highlights: [],
      tags: ['LLM', 'Recommendations'],
      colors: ['#ff8a5c', '#c2416b'],
    },
    {
      title: 'This portfolio',
      org: 'Side project',
      blurb: 'A 3D room with a working computer, built with Three.js.',
      description: [
        'The room is modelled entirely in code, with no downloaded 3D assets, and lit with soft shadows and bloom.',
        'The monitor is a real HTML interface that the camera flies into, so everything on it stays crisp, selectable and accessible.',
      ],
      highlights: ['No build step: plain HTML, CSS and ES modules', 'Full-screen fallback for phones and browsers without WebGL'],
      tags: ['Three.js', 'WebGL', 'CSS'],
      colors: ['#c9a27a', '#4a3324'],
    },
  ],

  experience: [
    {
      role: 'Software Engineer',
      org: 'Catalyst IQ (formerly Cloud Theory) · Remote',
      when: 'Nov 2021 — Oct 2026',
      points: [
        'One of the first engineers on a multi-tenant automotive analytics SaaS team that grew to 20+.',
        '116 completed PRs and 837 commits in two years across C# services, REST APIs, background workers, SQL Server, and Blazor, MVC and TypeScript frontends.',
        'Architected Strategy Builder, the core revenue product, and led its 2.0 rebuild; designed the Health Score algorithms; built CatalystSEO solo.',
        'Migrated Tenants, Subscriptions, Meta Ads, Amazon Setup and Client Onboarding from MVC to Blazor without breaking routes, grids or authorization.',
        'Wrote unit and integration test suites, reviewed code daily and mentored 4 junior engineers.',
      ],
    },
    {
      role: 'Software Engineer I',
      org: 'Jack Henry & Associates · Springfield, MO',
      when: 'Jan 2018 — May 2021',
      points: [
        'Built and tested custom C#/.NET backend solutions for individual banking clients, deployed with no ongoing support burden.',
        'Built SQL tooling and data pipelines that cut client data errors by 20%.',
        'Sole technical liaison turning ambiguous requirements from bank executives into on-spec deliverables.',
      ],
    },
    {
      role: 'iOS Engineering Intern',
      org: 'Banno (Jack Henry) · Springfield, MO',
      when: 'May 2016 — Jan 2018',
      points: [
        'Shipped features and critical bug fixes in Swift and Objective-C for a white-label iOS banking app used by hundreds of financial institutions.',
      ],
    },
  ],

  education: [
    { what: 'M.A. in Counseling (in progress)', where: 'Northwestern University', when: 'expected December 2028' },
    { what: 'B.S. Computer Science', where: 'Missouri State University', when: '' },
    { what: 'Microsoft Azure AI Fundamentals (AI-900)', where: 'Microsoft', when: '2023' },
    { what: 'Software Engineering Immersive', where: 'General Assembly', when: '2021' },
  ],

  // The glowing dots on objects around the room.
  // `app` adds a button that opens that app on the computer.
  hotspots: {
    about: {
      label: 'About me',
      text: 'Full-stack engineer with 10 years of production code behind me, working remotely from Seattle. The desk crew keeps me company.',
      app: 'about',
    },
    skills: {
      label: 'How I work',
      text: 'C#/.NET, TypeScript and SQL on Azure. I like taking things apart: tracing a bug from the UI through the service layer into the query.',
      app: 'about',
    },
    ios: {
      label: 'Where I started',
      text: 'iOS intern at Banno, shipping Swift and Objective-C to a banking app used by hundreds of financial institutions.',
      app: 'experience',
    },
    education: {
      label: 'Education',
      text: 'B.S. Computer Science, Missouri State. Now studying for an M.A. in Counseling at Northwestern.',
      app: 'experience',
    },
    experience: {
      label: 'Experience',
      text: 'Five years at Catalyst IQ (formerly Cloud Theory) as one of its first engineers, after three building banking software at Jack Henry.',
      app: 'experience',
    },
    ai: {
      label: 'AI code evaluation',
      text: 'Daily agentic coding with Claude Code, and a record of catching what AI gets confidently wrong before it ships.',
      app: 'projects',
    },
    films: {
      label: 'Film nerd',
      text: 'The posters are not just decoration. Caring too much about what to watch next is why I built Reel Taste.',
      app: 'projects',
    },
    location: { label: 'Seattle, WA', text: 'Based in Seattle and working remotely.' },
    resume: { label: 'Résumé', text: 'The full résumé, as a PDF.', link: { label: 'Open résumé', url: 'resume.pdf' } },
  },
};
