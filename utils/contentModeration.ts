// This is a list of words/names/phrases that are considered offensive and should be moderated
const OFFENSIVE_WORDS = [
  'ejaculate',
  'ejaculation',
  'racist',
  'shit',
  'fuck face',
  'sexist',
  'homophobic',
  'transphobic',
  'ableist',
  'Satan',
  'Nazi',
  'Putin',
  'Viktor Orbán',
  'Xi Jinping',
  'Hitler',
  'Donald Trump',
  'Trump',
  'Maga',
  'fascist',
  'faggot',
  'fuck',
  'fuck you',
  'fuck off',
  'bastard',
  'spastic',
  'retard',
  'retarded',
  'bitch',
  'pussy',
  'asshole',
  'ass',
  'anal',
  'dick',
  'dickhead',
  'cunt',
  'penis',
  'vagina',
  'dildo',
  'neo-nazi',
  'proud boys',
  'oathkeepers',
  'Al Qaeda',
  'ISIS',
  'Osama Bin Laden',
  'qanon',
  'cum',
  'cumming',
  'Kim Jong Un',
  'Hamas',
  'Hezbollah',
  'wanker',
  'whore',
  'white power',
  'white supremacy',
  'white supremacist',
  'coon',
  'cocksucker',
  'nigga',
  'nigger',
  'Stalin',
  'Hentai',
  'porn',
  'pornhub',
  'pornography',
  'pornographic',
  'pedo',
  'pedophile',
  'kill yourself',
  'rape',
  'rapist',
  'raped',
  'fucked',
  'fucked up',
  'J.D. Vance',
  'Elon Musk',
  'Robert F. Kennedy Jr.',
  'herpes',
  'genitalia',
  'genitals',
  'sex trafficking',
  'kiss my ass',
  'suck my dick',
  'blew my load',
  'titty fuck',
  'nipples',
  'butt plug',
  'Ku Klux Klan',
  'KKK',
  'Lynching',
  'buttlicker',
  'jizz',
  'cumshot',
  'blowjob',
  'titties',
  'titjob',
  'handjob'
  // I do not approve any of these words, names, and or phrases being used in the application.
];

import { handleContentViolation } from './violationHandler';

export const containsOffensiveContent = async (text: string, userId: string): Promise<{ 
  isOffensive: boolean; 
  offendingWords: string[];
  violationResult?: any;
}> => {
  const words = text.toLowerCase().split(/\s+/);
  const offendingWords = words.filter(word => OFFENSIVE_WORDS.includes(word));
  
  if (offendingWords.length > 0) {
    const violationResult = await handleContentViolation(userId, offendingWords);
    return {
      isOffensive: true,
      offendingWords,
      violationResult
    };
  }
  
  return {
    isOffensive: false,
    offendingWords: []
  };
}; 