import { checkContent } from './contentModerationService';

// This is a list of words/names/phrases/organizations that are considered offensive and should not be used in this application.
const OFFENSIVE_WORDS = [
  'ejaculate',
  'ejaculation',
  'arsehead',
  'arse',
  'arsehole',
  'asshat',
  'assfart',
  'shite',
  'dumbass',
  'dumb fuck',
  'dyke',
  'load of shit',
  'full of shit',
  'horseshit',
  'dogshit',
  'son of a bitch',
  'son of a whore',
  'prick',
  'shit',
  'shithead',
  'fuck face',
  'finger yourself',
  'Satan',
  'Nazi',
  'Vladimir Putin',
  'Kremlin',
  'Putin',
  'Pro-Putin',
  'Pro-Russia',
  'Benjamin Netanyahu',
  'Viktor Orbán',
  'Xi Jinping',
  'Ayatollah Ali Khamenei',
  'Ahmed al‑Sharaa',
  'Adolf Hitler',
  'Hitler',
  'Augusto Pinochet',
  'Alberto Fujimori',
  'Lee Kuan Yew',
  'Recep Tayyip Erdoğan',
  'Boris Yeltsin',
  'unified reich',
  'Donald Trump',
  'Trump',
  'Trumpism',
  'Trump2028',
  'Make America Great Again',
  'Maga',
  'Mein Kampf',
  'fascist',
  'faggot',
  'fuck',
  'fuck you',
  'fuck off',
  'fuck me',
  'fucking',
  'bastard',
  'spastic',
  'retard',
  'retarded',
  'bitch',
  'pussy',
  'asshole',
  'ass',
  'anal',
  'anus',
  'dick',
  'dickhead',
  'cunt',
  'penis',
  'penal',
  'scrotum',
  'vagina',
  'dildo',
  'neo-nazi',
  'proud boys',
  'oathkeepers',
  'Al Qaeda',
  'Taliban',
  'ISIS',
  'Qatar',
  'Osama Bin Laden',
  'qanon',
  'cum',
  'cumming',
  'Kim Jong Un',
  'Hamas',
  'Bashar al-Assad',
  'Hayʼat Tahrir al-Sham',
  'Hezbollah',
  'Houthi',
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
  'kys',
  'rape',
  'rapist',
  'raped',
  'fucked',
  'fucked up',
  'motherfucker',
  'motherfucking',
  'J.D. Vance',
  'Elon Musk',
  'Tulsi Gabbard',
  'Tucker Carlson',
  'Jesse Watters',
  'Kari Lake',
  'Marco Rubio',
  'Jeffrey Epstein',
  'Ghislaine Maxwell',
  'Rudy Giuliani',
  'Linda McMahon',
  'Chuck Grassley',
  'Steve Bannon',
  'Tim Scott',
  'Niki Haley',
  'Asa Hutchinson',
  'Francis Suarez',
  'Will Hurd',
  'Perry Johnson',
  'Vivek Ramaswamy',
  'Kash Patel',
  'Dan Bongino',
  'Paul Dans',
  'Winsome Earle-Sears',
  'Mike Johnson',
  'Kyle Rittenhouse',
  'Rick Scott',
  'Ron DeSantis',
  'Casey DeSantis',
  'Pam Bondi',
  'Emil Bove',
  'Pete Hegseth',
  'Ted Cruz',
  'Robert F. Kennedy Jr.',
  'Byron Donalds',
  'Russel Vought',
  'Jon Voight',
  'Marjorie Taylor Greene',
  'Joe Wilson',
  'Lauren Boebert',
  'Matt Gaetz',
  'Alice Johnson',
  'Jim Jordan',
  'Melania Trump',
  'Donald Trump Jr.',
  'Laura Trump',
  'Eric Trump',
  'Ivanka Trump',
  'Mitch McConnell',
  'Doug Burgum',
  'Tom Homan',
  'John Roberts',
  'Amy Coney Barrett',
  'Clarence Thomas',
  'Lindsey Graham',
  'Samuel Alito',
  'Brett Kavanaugh',
  'Neil Gorsuch',
  'Aileen Cannon',
  'Tommy Tuberville',
  'Brandon Carr',
  'Dr. Oz',
  'Mehmet Oz',
  'Greg Abbott',
  'Enrique Tarrio',
  'Steward Rhodes',
  'Eric Adams',
  'Brad Schimel',
  'Katie Britt',
  'Tom Cotton',
  'Rand Paul',
  'Bill Cassidy',
  'Markwayne Mullin',
  'John Thune',
  'Larry Kudlow',
  'John Barraso',
  'Sarah Palin',
  'James Lankford',
  'Steve Scalise',
  'Kanye West',
  'Bill Cosby',
  'Ben Shapiro',
  'Derek Chauvin',
  'Karoline Leavitt',
  'John Eastman',
  'Kenneth Chesebro',
  'Sidney Powell',
  'Mark Meadows',
  'Howard Lutnick',
  'Mike Waltz',
  'John Ratcliffe',
  'Steve Witkoff',
  'Laura Loomer',
  'Rush Limbaugh',
  'Alina Habba',
  'Chip Roy',
  'David Richardson',
  'Kristi Noem',
  'Elise Stefanik',
  'Boris Epstein',
  'Ed Martin',
  'Sean Duffy',
  'Susan Collins',
  'Robert Giuffra',
  'Mike Lindell',
  'Harmeet Dhillon',
  'Ryan Walters',
  'Jeanine Pirro',
  'J. K. Rowling',
  'Josh Hawley',
  'Mike Lee',
  'John Kennedy',
  'Jeff Bezos',
  'Scott Bessent',
  'Lisa McClain',
  'Brooke Rollins',
  'Dabney Friedrich',
  'Jeff Sessions',
  'Kevin Roberts',
  'Rodney Scott',
  'Steve Moore',
  'Robert Wolf',
  'Joshua Divine',
  'Salvatore Cordileone',
  'Vance Boelter',
  'Charlie Kirk',
  'Paul Szypula',
  'Bill Hagerty',
  'Nick Sortor',
  'Thom Tillis',
  'Anna Paulina',
  'Stephen Miller',
  'Jason Smith',
  'John Sauer',
  'Zach Rehl',
  'Jessica Watkins',
  'Kenneth Harrelson',
  'Kyle Young',
  'Ashley Moody',
  'Mike DeWine',
  'Robert Morss',
  'Kelly Meggs',
  'Greg Gutfeld',
  'Joseph Hackett',
  'Dominic Pezzola',
  'Tim Hale',
  'Sean Combs',
  'Bret Baier',
  'Elliot Gaiser',
  'Joni Ernst',
  'Andy Harris',
  'Nancy Mace',
  'Brendan Carr',
  'John Cornyn',
  'Sarah Huckabee Sanders',
  'Gregory Katsas',
  'Justin Walker',
  'Jeffrey Wall',
  'Marsha Blackburn',
  'Tony Fabrizio',
  'Markwayne Mullin',
  'Debra Fischer',
  'Jon Husted',
  'Chris LaCivita',
  'Jimmy Patronis Jr.',
  'Randy Fine',
  'Shelley Moore Capito',
  'James Comer',
  'Phil McGraw',
  'Bryan Steil',
  'Virginia Foxx',
  'Rick Snyder',
  'Mike Rogers',
  'John Boozman',
  'Jon Husted',
  'Ashley Moore',
  'Jim Justice',
  'David Valadao',
  'Kandiss Taylor',
  'James Murphy',
  'Scott Mayer',
  'Jordan Emery Pratt',
  'Laura Ingraham',
  'Sean Hannity',
  'Glenn Beck',
  'Charlie Hurt',
  'Joe Rogan',
  'Alex Jones',
  'Liz Wheeler',
  'Megyn Kelly',
  'Bryan Kohberger',
  'Robert Durst',
  'Ted Bundy',
  'herpes',
  'genitalia',
  'genitals',
  'sex trafficking',
  'kiss my ass',
  'suck my dick',
  'eat a dick',
  'blew my load',
  'titty fuck',
  'nipples',
  'paizuri',
  'shotacon',
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
  'handjob',
  'thighjob',
  'footjob',
  'cunnilingus',
  'butt fuck',
  'D.O.G.E',
  'bitch tits',
  'bitch ass',
  'masterbate',
  'masterbating',
  'masterbated',
  'horny',
  'horny bitch',
  'slut',
  'slutty',
  'Bollocks',
  'cumdumpster',
  'testicles',
  'neek',
  'prick',
  'twat',
  'gooning',
  'buttfucker',
  'buttfucked',
  'pussy hole',
  'blow me',
  'Medical Ethics Defense Act',
  'The Federalist Society',
  'Heritage Foundation',
  'Fox News',
  'One America News Network',
  'Project 2025',
  'National Socialist Movement',
  'Order of the Black Sun',
  'Blood Tribe',
  'Patriot Front',
  'Atomwaffen Division',
  'Phyllis Schlafly Eagles',
  'Religious Liberty Commission'
  // I do not approve any of these words, names, organizations and or phrases being used in this application.
];

export const containsOffensiveContent = async (content: string, userId: string) => {
  // First do a quick local check
  const lowercaseContent = content.toLowerCase();
  const foundWords = OFFENSIVE_WORDS.filter(word => 
    lowercaseContent.includes(word.toLowerCase())
  );

  if (foundWords.length === 0) {
    return {
      isOffensive: false,
      offendingWords: []
    };
  }

  // If offensive words were found locally, verify with the server
  const result = await checkContent(content, userId);

  return {
    isOffensive: !result.isValid,
    offendingWords: result.offendingWords || foundWords,
    violationResult: result.violationResult
  };
}; 