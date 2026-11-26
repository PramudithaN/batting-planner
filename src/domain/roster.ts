import type { CoachAccount, Player } from './types';

export const PLAYER_POOL_SOURCES = [
  'ODI XI - Pakistan tri-series final, 31 October 2026',
  'T20I XI - Pakistan third T20I, 13 October 2026',
  'Test XI - Pakistan first Test, 9 November 2026',
  'Sri Lanka A squad - ACC Asia Cup Rising Stars 2025',
] as const;

export const INITIAL_PLAYER_POOL: Player[] = [
  {
    id: 'akila-dananjaya',
    name: 'Akila Dananjaya',
    squads: ['ODI'],
    avatarUrl: 'https://static.cricbuzz.com/a/img/v1/i1/c717699/akila-dananjaya.jpg?d=low&p=gthumb',
  },
  {
    id: 'ashen-bandara',
    name: 'Ashen Bandara',
    squads: ['Sri Lanka A'],
    avatarUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/99/Ashen_Bandara.jpg/330px-Ashen_Bandara.jpg',
  },
  {
    id: 'avishka-fernando',
    name: 'Avishka Fernando',
    squads: ['ODI'],
    avatarUrl: 'https://static.cricbuzz.com/a/img/v1/i1/c170702/avishka-fernando.jpg?d=low&p=gthumb',
  },
  {
    id: 'bhanuka-rajapaksa',
    name: 'Bhanuka Rajapaksa',
    squads: ['T20I'],
  },
  {
    id: 'chamika-karunaratne',
    name: 'Chamika Karunaratne',
    squads: ['ODI', 'T20I'],
    avatarUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Chamika_Karunaratne.jpg/330px-Chamika_Karunaratne.jpg',
  },
  {
    id: 'charith-asalanka',
    name: 'Charith Asalanka',
    squads: ['ODI', 'T20I'],
    avatarUrl: 'https://static.cricbuzz.com/a/img/v1/i1/c847180/charith-asalanka.jpg?d=low&p=gthumb',
  },
  {
    id: 'dasun-shanaka',
    name: 'Dasun Shanaka',
    squads: ['ODI', 'T20I'],
  },
  {
    id: 'dhananjaya-de-silva',
    name: 'Dhananjaya de Silva',
    squads: ['Test', 'ODI'],
    avatarUrl: 'https://static.cricbuzz.com/a/img/v1/i1/c351878/dhananjaya-de-silva.jpg?d=low&p=gthumb',
  },
  {
    id: 'dilshan-madushanka',
    name: 'Dilshan Madushanka',
    squads: ['ODI', 'T20I'],
  },
  {
    id: 'dinesh-chandimal',
    name: 'Dinesh Chandimal',
    squads: ['Test'],
    avatarUrl: 'https://static.cricbuzz.com/a/img/v1/i1/c582334/dinesh-chandimal.jpg?d=low&p=gthumb',
  },
  {
    id: 'dunith-wellalage',
    name: 'Dunith Wellalage',
    squads: ['ODI', 'T20I', 'Sri Lanka A'],
    avatarUrl: 'https://static.cricbuzz.com/a/img/v1/i1/c847184/dunith-wellalage.jpg?d=low&p=gthumb',
  },
  {
    id: 'dushmantha-chameera',
    name: 'Dushmantha Chameera',
    squads: ['ODI', 'T20I'],
    avatarUrl: 'https://static.cricbuzz.com/a/img/v1/i1/c847167/dushmantha-chameera.jpg?d=low&p=gthumb',
  },
  {
    id: 'eshan-malinga',
    name: 'Eshan Malinga',
    squads: ['Sri Lanka A'],
  },
  {
    id: 'janith-liyanage',
    name: 'Janith Liyanage',
    squads: ['ODI'],
    avatarUrl: 'https://static.cricbuzz.com/a/img/v1/i1/c847190/janith-liyanage.jpg?d=low&p=gthumb',
  },
  {
    id: 'kamindu-mendis',
    name: 'Kamindu Mendis',
    squads: ['Test', 'ODI', 'T20I'],
    avatarUrl: 'https://static.cricbuzz.com/a/img/v1/i1/c847173/kamindu-mendis.jpg?d=low&p=gthumb',
  },
  {
    id: 'kamil-mishara',
    name: 'Kamil Mishara',
    squads: ['Sri Lanka A'],
  },
  {
    id: 'kasun-rajitha',
    name: 'Kasun Rajitha',
    squads: ['Test'],
    avatarUrl: 'https://static.cricbuzz.com/a/img/v1/i1/c351884/kasun-rajitha.jpg?d=low&p=gthumb',
  },
  {
    id: 'kusal-mendis',
    name: 'Kusal Mendis',
    squads: ['Test', 'ODI', 'T20I'],
    avatarUrl: 'https://static.cricbuzz.com/a/img/v1/i1/c847148/kusal-mendis.jpg?d=low&p=gthumb',
  },
  {
    id: 'kusal-perera',
    name: 'Kusal Perera',
    squads: ['ODI', 'T20I'],
  },
  {
    id: 'lahiru-kumara',
    name: 'Lahiru Kumara',
    squads: ['Test', 'ODI'],
    avatarUrl: 'https://static.cricbuzz.com/a/img/v1/i1/c351887/lahiru-kumara.jpg?d=low&p=gthumb',
  },
  {
    id: 'lahiru-udhara',
    name: 'Lahiru Udara',
    squads: ['Sri Lanka A'],
    avatarUrl: 'https://static.cricbuzz.com/a/img/v1/i1/c717709/lahiru-udara.jpg?d=low&p=gthumb',
  },
  {
    id: 'maheesh-theekshana',
    name: 'Maheesh Theekshana',
    squads: ['ODI', 'T20I'],
    avatarUrl: 'https://static.cricbuzz.com/a/img/v1/i1/c847197/maheesh-theekshana.jpg?d=low&p=gthumb',
  },
  {
    id: 'matheesha-pathirana',
    name: 'Matheesha Pathirana',
    squads: ['T20I'],
    avatarUrl: 'https://static.cricbuzz.com/a/img/v1/i1/c847143/matheesha-pathirana.jpg?d=low&p=gthumb',
  },
  {
    id: 'milan-rathnayake',
    name: 'Milan Rathnayake',
    squads: ['Test', 'Sri Lanka A'],
    avatarUrl: 'https://static.cricbuzz.com/a/img/v1/i1/c717700/milan-priyanath-rathnayake.jpg?d=low&p=gthumb',
  },
  {
    id: 'nishan-madushka',
    name: 'Nishan Madushka',
    squads: ['Test', 'ODI', 'Sri Lanka A'],
    avatarUrl: 'https://static.cricbuzz.com/a/img/v1/i1/c155859/nishan-madushka.jpg?d=low&p=gthumb',
  },
  {
    id: 'nuwan-thushara',
    name: 'Nuwan Thushara',
    squads: ['T20I'],
    avatarUrl: 'https://static.cricbuzz.com/a/img/v1/i1/c226338/nuwan-thushara.jpg?d=low&p=gthumb',
  },
  {
    id: 'nuwanidu-fernando',
    name: 'Nuwanidu Fernando',
    squads: ['ODI', 'Sri Lanka A'],
    avatarUrl: 'https://static.cricbuzz.com/a/img/v1/i1/c155852/nuwanidu-fernando.jpg?d=low&p=gthumb',
  },
  {
    id: 'pathum-nissanka',
    name: 'Pathum Nissanka',
    squads: ['Test', 'ODI', 'T20I'],
    avatarUrl: 'https://static.cricbuzz.com/a/img/v1/i1/c847160/pathum-nissanka.jpg?d=low&p=gthumb',
  },
  {
    id: 'pavan-rathnayake',
    name: 'Pavan Rathnayake',
    squads: ['Sri Lanka A'],
    avatarUrl: 'https://static.cricbuzz.com/a/img/v1/i1/c847149/pavan-rathnayake.jpg?d=low&p=gthumb',
  },
  {
    id: 'prabath-jayasuriya',
    name: 'Prabath Jayasuriya',
    squads: ['Test'],
    avatarUrl: 'https://static.cricbuzz.com/a/img/v1/i1/c582353/prabath-jayasuriya.jpg?d=low&p=gthumb',
  },
  {
    id: 'ramesh-mendis',
    name: 'Ramesh Mendis',
    squads: ['Test'],
  },
  {
    id: 'sadeera-samarawickrama',
    name: 'Sadeera Samarawickrama',
    squads: ['Test', 'ODI'],
    avatarUrl: 'https://static.cricbuzz.com/a/img/v1/i1/c351890/sadeera-samarawickrama.jpg?d=low&p=gthumb',
  },
  {
    id: 'sahan-arachchige',
    name: 'Sahan Arachchige',
    squads: ['Sri Lanka A'],
  },
  {
    id: 'vijayakanth-viyaskanth',
    name: 'Vijayakanth Viyaskanth',
    squads: ['Sri Lanka A'],
  },
  {
    id: 'wanindu-hasaranga',
    name: 'Wanindu Hasaranga',
    squads: ['ODI', 'T20I'],
    avatarUrl: 'https://static.cricbuzz.com/a/img/v1/i1/c847146/wanindu-hasaranga.jpg?d=low&p=gthumb',
  },
];

export const INITIAL_COACH_ACCOUNTS: CoachAccount[] = [
  { id: 'coach-hashan', name: 'Hashan Thilakarathna', role: 'master', pin: '1111' },
  { id: 'coach-dhammika', name: 'Dhammika Sudarshana', role: 'coach', pin: '2222' },
  { id: 'coach-saman', name: 'Saman Jayantha', role: 'coach', pin: '3333' },
  { id: 'coach-ashan', name: 'Ashan Priyanjan', role: 'coach', pin: '4444' },
  { id: 'coach-thamra', name: 'Thamra Abeyrathna', role: 'coach', pin: '5555' },
  { id: 'viewer-analyst', name: 'HP Observer (Read-Only)', role: 'viewer', pin: '0000' },
];
