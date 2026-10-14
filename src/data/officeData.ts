import { OfficeZone, ZoneId } from '../types';

export const INITIAL_BRANDING = {
  companyName: 'THE OFFICE',
  tagline: 'A space of ideas, engineering & high craft',
  domain: 'vikasbuilds.com',
  accentColor: '#10b981',
};

export const OFFICE_ZONES: Record<string, OfficeZone> = {
  street: {
    id: 'street',
    name: 'Main Street & Crossing',
    subtitle: 'Street Entrance & Pedestrian Walk',
    position: [0, 0, 14],
    cameraPosition: [12, 11, 24],
    cameraTarget: [0, 1, 12],
    description: 'The exterior street approach with pedestrian zebra crossing, palm planters, and the welcoming perimeter of the creative campus.',
    dialogue: {
      speaker: 'Campus Guide',
      avatar: '🚶‍♂️',
      text: 'Welcome to our 3D interactive virtual headquarters. You can freely orbit, zoom in, or take the guided walkthrough!',
      options: [
        { label: 'Enter through Security Gate', targetZone: 'security' },
        { label: 'Jump straight to Reception', targetZone: 'reception' },
        { label: 'View entire Campus (Overview)', targetZone: 'street', action: 'isometric' },
      ],
    },
    features: ['Pedestrian Zebra Crossing', 'Perimeter Planters & Palms', 'Visitor Walking Path', '3D Domain Signboard'],
    metrics: [
      { label: 'Interactive Zones', value: '7 Rooms' },
      { label: 'Navigation', value: '360° Free Orbit' },
    ],
  },
  security: {
    id: 'security',
    name: 'Security Gate & Check-in',
    subtitle: 'Access Control & Guard Post',
    position: [-2.5, 0, 8.5],
    cameraPosition: [6, 7, 15],
    cameraTarget: [-2, 1, 8],
    description: 'The automated security access gate with security personnel booth, automated sliding barrier, and visitor registration checkpoint.',
    dialogue: {
      speaker: 'Officer Ramesh',
      avatar: '👮',
      text: 'Good day! Visitor pass approved. Gate opening for you now. Head straight into the main reception desk.',
      options: [
        { label: 'Walk into Reception', targetZone: 'reception' },
        { label: 'Tour the Workstations', targetZone: 'workstation' },
        { label: 'Back to Street Entrance', targetZone: 'street' },
      ],
    },
    features: ['Automated Sliding Security Gate', 'Guard Cabin with Watchpost', 'Visitor Logbook & Access Badge', 'Entry Plaque with Custom Domain'],
    metrics: [
      { label: 'Security Status', value: 'Active / Open' },
      { label: 'Access Level', value: 'Visitor VIP' },
    ],
  },
  reception: {
    id: 'reception',
    name: 'Reception & Welcome Lounge',
    subtitle: 'Front Desk & Visitor Hospitality',
    position: [0, 0, 3],
    cameraPosition: [4, 5, 8],
    cameraTarget: [0, 1.2, 3],
    description: 'Warm timber slat counter, corporate identity wall, waiting lounge with magazines, indoor fiddle-leaf plants, and hospitable concierge.',
    dialogue: {
      speaker: 'Receptionist Sarah',
      avatar: '👩‍💼',
      text: 'How can I help you today? Feel free to explore our creative teams or meet the founder in the executive suite!',
      options: [
        { label: '💼 Work Stations', targetZone: 'workstation' },
        { label: '🎨 Design Room', targetZone: 'design' },
        { label: '📊 Meeting Room', targetZone: 'meeting' },
        { label: '👑 Meet the Boss', targetZone: 'boss' },
      ],
    },
    features: ['Curved Wood & Marble Desk', 'Digital Visitor Tablet', 'Waiting Sofa & Coffee Corner', 'Indoor Fiddle-Leaf Figs'],
    metrics: [
      { label: 'Staff on Duty', value: '2 Concierges' },
      { label: 'Response Time', value: '< 2 mins' },
    ],
  },
  workstation: {
    id: 'workstation',
    name: 'Work Stations & Dev Hub',
    subtitle: 'Engineering & Product Development',
    position: [5.5, 0, -2],
    cameraPosition: [10, 7, 3],
    cameraTarget: [5.5, 1.2, -2],
    description: 'High-performance engineering pod with multi-monitor setups, standing desks, code repositories running live, and developer ergonomics.',
    dialogue: {
      speaker: 'Lead Architect',
      avatar: '👨‍💻',
      text: 'Hey there! We are currently building web-scale 3D experiences and full-stack software products. Take a look at our live stacks.',
      options: [
        { label: 'Check Design Studio next', targetZone: 'design' },
        { label: 'Visit Meeting Room', targetZone: 'meeting' },
        { label: 'Meet the Boss / Founder', targetZone: 'boss' },
      ],
    },
    features: ['Dual 4K Curved Displays', 'Ergonomic Mesh Task Chairs', 'Mechanical Keyboards & Git Pods', 'Acoustic Desk Dividers'],
    metrics: [
      { label: 'Active Sprints', value: '4 Sprints' },
      { label: 'Code Uptime', value: '99.98%' },
    ],
  },
  design: {
    id: 'design',
    name: 'Design Room & Creative Lab',
    subtitle: 'UI/UX, 3D Art & Prototyping',
    position: [-5.5, 0, -2],
    cameraPosition: [-10, 7, 3],
    cameraTarget: [-5.5, 1.2, -2],
    description: 'Creative studio equipped with digital drawing displays, design system color boards, user journey flows, and tactile prototyping models.',
    dialogue: {
      speaker: 'Lead Designer',
      avatar: '🎨',
      text: 'Welcome to our Design Lab! Every interaction, 3D shader, and spatial transition is crafted here with meticulous craft.',
      options: [
        { label: 'Head to Conference Room', targetZone: 'meeting' },
        { label: 'Inspect Work Stations', targetZone: 'workstation' },
        { label: 'Visit Executive Office', targetZone: 'boss' },
      ],
    },
    features: ['Drafting Tables & Color Swatches', 'Large 4K Interactive Whiteboard', 'Mood boards & Brand Guidelines', 'Design System Library'],
    metrics: [
      { label: 'Prototypes Live', value: '18 Systems' },
      { label: 'Figma Library', value: 'v3.4 Production' },
    ],
  },
  meeting: {
    id: 'meeting',
    name: 'Meeting & Strategy Room',
    subtitle: 'Conference & Stakeholder Presentations',
    position: [-5, 0, -7.5],
    cameraPosition: [-9, 6, -3],
    cameraTarget: [-5, 1.2, -7.5],
    description: 'Glass-enclosed boardroom with 8-person conference table, telepresence video screen, acoustic wall panels, and pitch deck projectors.',
    dialogue: {
      speaker: 'Project Manager',
      avatar: '📋',
      text: 'We are wrapping up our quarterly roadmap presentation. Would you like to schedule a strategy sync or pitch your ideas?',
      options: [
        { label: 'Request a Meeting / Sync', action: 'contact' },
        { label: 'Step into Founder / Boss Office', targetZone: 'boss' },
        { label: 'Back to Reception', targetZone: 'reception' },
      ],
    },
    features: ['Glass Acoustic Enclosure', 'Telepresence Smart TV Screen', 'Ergonomic Executive Board Chairs', 'Integrated Cable Well & Microphones'],
    metrics: [
      { label: 'Capacity', value: '10 Persons' },
      { label: 'Screen Display', value: '75" Ultra-HD' },
    ],
  },
  boss: {
    id: 'boss',
    name: "Founder & Boss's Suite",
    subtitle: 'Executive Leadership & Direction',
    position: [5, 0, -7.5],
    cameraPosition: [9, 6, -3],
    cameraTarget: [5, 1.2, -7.5],
    description: 'Private executive corner suite with solid walnut desk, Chesterfield leather sofa, showcase of achievements, and skyline panorama.',
    dialogue: {
      speaker: 'Founder / CEO',
      avatar: '👔',
      text: "Thanks for dropping by our 3D space! We believe every modern business deserves an interactive 3D digital presence that wows clients.",
      options: [
        { label: 'Start Project Collaboration', action: 'contact' },
        { label: 'Customize 3D Branding & Name', action: 'branding' },
        { label: 'Restart Full Guided Tour', targetZone: 'street', action: 'tour' },
      ],
    },
    features: ['Solid Walnut Executive Desk', 'Chesterfield Leather Armchair', 'Trophy & Award Display Wall', 'Private Espresso Bar'],
    metrics: [
      { label: 'Founded', value: '2023' },
      { label: 'Global Clients', value: '45+ Brands' },
    ],
  },
};

export const TOUR_STEPS: ZoneId[] = [
  'street',
  'security',
  'reception',
  'workstation',
  'design',
  'meeting',
  'boss',
];
