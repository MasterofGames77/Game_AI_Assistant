import mongoose, { Document, Schema } from 'mongoose';

interface Progress {
  firstQuestion?: number;
  frequentAsker?: number;
  rpgEnthusiast?: number;
  bossBuster?: number;
  platformerPro?: number;
  survivalSpecialist?: number;
  strategySpecialist?: number;
  simulationSpecialist?: number;
  fightingFanatic?: number;
  actionAficionado?: number;
  battleRoyale?: number;
  sportsChampion?: number;
  adventureAddict?: number;
  shooterSpecialist?: number;
  puzzlePro?: number;
  racingRenegade?: number;
  stealthExpert?: number;
  horrorHero?: number;
  triviaMaster?: number;
  storySeeker?: number;
  beatEmUpBrawler?: number;
  rhythmMaster?: number;
  totalQuestions?: number;
  dailyExplorer?: number;
  speedrunner?: number;
  collectorPro?: number;
  dataDiver?: number;
  performanceTweaker?: number;
  conversationalist?: number;
  proAchievements: {
    gameMaster: number;
    speedDemon: number;
    communityLeader: number;
    achievementHunter: number;
    proStreak: number;
    expertAdvisor: number;
    genreSpecialist: number;
    proContributor: number;
  };
}

interface Achievement {
  name: string;
  dateEarned: Date;
}

export interface IUser extends Document {
  userId: string;
  username: string;
  email: string;
  conversationCount: number;
  hasProAccess: boolean;
  achievements: Achievement[];
  progress: Progress;
}

const UserSchema = new Schema<IUser>({
  userId: { type: String, required: true },
  username: {
    type: String,
    required: true,
    unique: true,
    minlength: 3,
    maxlength: 32,
    match: /^[\w#@.-]+$/
  },
  email: { type: String, required: true },
  conversationCount: { type: Number, required: true, default: 0 },
  hasProAccess: { type: Boolean, default: false },
  achievements: [
    {
      name: { type: String, required: true },
      dateEarned: { type: Date, required: true },
    },
  ],
  progress: {
    firstQuestion: { type: Number, default: 0 },
    frequentAsker: { type: Number, default: 0 },
    rpgEnthusiast: { type: Number, default: 0 },
    bossBuster: { type: Number, default: 0 },
    platformerPro: { type: Number, default: 0 },
    survivalSpecialist: { type: Number, default: 0 },
    strategySpecialist: { type: Number, default: 0 },
    actionAficionado: { type: Number, default: 0 },
    fightingFanatic: { type: Number, default: 0 },
    simulationSpecialist: { type: Number, default: 0 },
    battleRoyale: { type: Number, default: 0 },
    sportsChampion: { type: Number, default: 0 },
    adventureAddict: { type: Number, default: 0 },
    shooterSpecialist: { type: Number, default: 0 },
    puzzlePro: { type: Number, default: 0 },
    racingRenegade: { type: Number, default: 0 },
    stealthExpert: { type: Number, default: 0 },
    horrorHero: { type: Number, default: 0 },
    triviaMaster: { type: Number, default: 0 },
    storySeeker: { type: Number, default: 0 },
    beatEmUpBrawler: { type: Number, default: 0 },
    rhythmMaster: { type: Number, default: 0 },
    totalQuestions: { type: Number, default: 0 },
    dailyExplorer: { type: Number, default: 0 },
    speedrunner: { type: Number, default: 0 },
    collectorPro: { type: Number, default: 0 },
    dataDiver: { type: Number, default: 0 },
    performanceTweaker: { type: Number, default: 0 },
    conversationalist: { type: Number, default: 0 },
    proAchievements: {
      gameMaster: { type: Number, default: 0 },
      speedDemon: { type: Number, default: 0 },
      communityLeader: { type: Number, default: 0 },
      achievementHunter: { type: Number, default: 0 },
      proStreak: { type: Number, default: 0 },
      expertAdvisor: { type: Number, default: 0 },
      genreSpecialist: { type: Number, default: 0 },
      proContributor: { type: Number, default: 0 }
    }
  },
}, { collection: 'users' });

const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;