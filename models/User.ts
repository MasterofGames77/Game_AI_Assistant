import mongoose, { Document, Schema } from 'mongoose';

interface Progress {
  firstQuestion?: number;
  frequentAsker?: number;
  rpgEnthusiast?: number;
  bossBuster?: number;
  strategySpecialist?: number;
  actionAficionado?: number;
  battleRoyale?: number;
  sportsChampion?: number;
  adventureAddict?: number;
  shooterSpecialist?: number;
  puzzlePro?: number;
  racingExpert?: number;
  stealthSpecialist?: number;
  horrorHero?: number;
  triviaMaster?: number;
  totalQuestions?: number;
  dailyExplorer?: number;
  speedrunner?: number;
  collectorPro?: number;
  dataDiver?: number;
  performanceTweaker?: number;
  conversationalist?: number;
}

interface Achievement {
  name: string;
  dateEarned: Date;
}

export interface IUser extends Document {
  userId: string;
  email: string;
  conversationCount: number;
  hasProAccess: boolean;
  achievements: Achievement[];
  progress: Progress;
}

const UserSchema = new Schema<IUser>({
  userId: { type: String, required: true },
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
    strategySpecialist: { type: Number, default: 0 },
    actionAficionado: { type: Number, default: 0 },
    battleRoyale: { type: Number, default: 0 },
    sportsChampion: { type: Number, default: 0 },
    adventureAddict: { type: Number, default: 0 },
    shooterSpecialist: { type: Number, default: 0 },
    puzzlePro: { type: Number, default: 0 },
    racingExpert: { type: Number, default: 0 },
    stealthSpecialist: { type: Number, default: 0 },
    horrorHero: { type: Number, default: 0 },
    triviaMaster: { type: Number, default: 0 },
    totalQuestions: { type: Number, default: 0 },
    dailyExplorer: { type: Number, default: 0 },
    speedrunner: { type: Number, default: 0 },
    collectorPro: { type: Number, default: 0 },
    dataDiver: { type: Number, default: 0 },
    performanceTweaker: { type: Number, default: 0 },
    conversationalist: { type: Number, default: 0 },
  },
}, { collection: 'users' });

const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;