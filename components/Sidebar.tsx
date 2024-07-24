import { useState, useEffect } from "react";
import axios from "axios";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Conversation, SideBarProps } from "../types";

const Sidebar = ({ userId, onSelectConversation }: SideBarProps) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const res = await axios.get(`/api/getConversation?userId=${userId}`);
        setConversations(res.data);
      } catch (error) {
        console.error("Error fetching conversations:", error);
      }
    };

    fetchConversations();
  }, [userId]);

  const handleDelete = async (id: string) => {
    try {
      await axios.post(`/api/deleteInteraction`, { id });
      setConversations(conversations.filter((convo) => convo._id !== id));
    } catch (error) {
      console.error("Error deleting conversation:", error);
    }
  };

  const shortenQuestion = (question: string): string => {
    // Split the question into words
    const words = question.split(" ");

    // Find the index of the game title
    const gameTitles = [
      "A Hat in Time",
      "Ace Attorney",
      "Age of Empires",
      "Alex Kidd",
      "Altered Beast",
      "Among Us",
      "Angry Birds",
      "Animal Crossing",
      "Apex Legends",
      "Ape Escape",
      "Armored Core",
      "Art Academy",
      "Assassin's Creed",
      "Axiom Verge",
      "Baldur's Gate",
      "Banjo-Kazooie",
      "Bastion",
      "Batman: Arkham",
      "Battlefield",
      "Battletoads",
      "Bayonetta",
      "Bejeweled",
      "Big Brain Academy",
      "BioShock",
      "Blaster Master",
      "BlazBlue",
      "Bionic Commando",
      "Bloodborne",
      "Bloodstained",
      "Bomberman",
      "BoxBoy!",
      "Braid",
      "Brain Age",
      "Bravely",
      "Breath of Fire",
      "Bubsy",
      "Burnout",
      "Bus Simulator",
      "Candy Crush",
      "Castlevania",
      "Castle Crashers",
      "Cave Story",
      "Celeste",
      "Centipede",
      "Chibi-Robo!",
      "Chrono",
      "Civilization",
      "Command & Conquer",
      "Company of Heroes",
      "Contra",
      "Cooking Mama",
      "Conker",
      "Crash Bandicoot",
      "Crazy Taxi",
      "Croc",
      "Crypt of the NecroDancer",
      "Cuphead",
      "Custom Robo",
      "Dance Dance Revolution",
      "Danganronpa",
      "Dark Souls",
      "Darkstalkers",
      "Dead or Alive",
      "Dead Rising",
      "Dead Space",
      "Dead Island",
      "Death Stranding",
      "Demon's Souls",
      "Devil May Cry",
      "Diablo",
      "Disco Elysium",
      "Dishonored",
      "Doki Doki Literature Club!",
      "Doom",
      "Dota",
      "Dragon Ball",
      "Dragon Quest",
      "Dreams",
      "Dust: An Elysian Tale",
      "Dune",
      "Dying Light",
      "Dynasty Warriors",
      "Eagle Island",
      "Earthbound",
      "Earthworm Jim",
      "Ecco the Dolphin",
      "Elden Ring",
      "EverQuest",
      "Everybody's Golf",
      "Excite",
      "F-Zero",
      "F1",
      "Fable",
      "Fallout",
      "Fall Guys",
      "Famicom Detective Club",
      "Farming Simulator",
      "Fatal Frame",
      "Fatal Fury",
      "FIFA",
      "Fighting Vipers",
      "Final Fantasy",
      "Final Fight",
      "Fire Emblem",
      "Five Night's at Freddy's",
      "FlatOut",
      "Football Manager",
      "Forza",
      "Fortnite",
      "Friday Night Funkin'",
      "Galaga",
      "Garry's Mod",
      "Gears of War",
      "Genshin Impact",
      "GeoGuessr",
      "Gex",
      "Ghosts 'n Goblins",
      "God of War",
      "Golden Axe",
      "Golden Sun",
      "Golf with Your Friends",
      "Grand Theft Auto",
      "Gran Turismo",
      "Gradius",
      "Guacamelee",
      "Guitar Hero",
      "Guilty Gear",
      "Gunvolt",
      "Hades",
      "Half-Life",
      "Halo",
      "Hatsune Miku: Project DIVA",
      "Hearthstone",
      "Hitman",
      "Hollow Knight",
      "Homeworld",
      "Honkai: Star Rail",
      "Horizon",
      "Hotline Miami",
      "Hyperdimension Neptunia",
      "Infamous",
      "Injustice",
      "Jak and Daxter",
      "Jetpack Joyride",
      "Jet Set Radio",
      "Journey",
      "Just Cause",
      "Just Dance",
      "Katamari",
      "Kid Icarus",
      "Killer Instinct",
      "Kingdom Hearts",
      "Kirby",
      "Klonoa",
      "The King of Fighters",
      "Left 4 Dead",
      "Lego",
      "Lemmings",
      "Legacy of Kain",
      "League of Legends",
      "Lethal Company",
      "LittleBigPlanet",
      "Luigi",
      "Max Payne",
      "MLB: The Show",
      "Madden NFL",
      "Mafia",
      "Mana",
      "Mass Effect",
      "Marvel vs. Capcom",
      "Marvel",
      "Mario Kart",
      "Mario Party",
      "Mario Sports",
      "Mario & Luigi",
      "Mega Man",
      "Metal Gear",
      "Metal Slug",
      "Metroid",
      "Microsoft Flight Simulator",
      "Mighty",
      "Minecraft",
      "Monster Hunter",
      "Mother",
      "Mortal Kombat",
      "Myst",
      "Mystery Dungeon",
      "NASCAR",
      "NBA 2K",
      "NBA Jam",
      "NBA Live",
      "Naruto",
      "Need for Speed",
      "Ni No Kuni",
      "Nickelodeon",
      "NieR",
      "Nights",
      "Ninja Gaiden",
      "NHL",
      "No More Heroes",
      "Ōkami",
      "Oddworld",
      "Onimusha",
      "One Piece",
      "Outlast",
      "Overcooked",
      "Overwatch",
      "Pac-Man",
      "Palworld",
      "Panzer Dragoon",
      "Paper Mario",
      "Papers, Please",
      "Party Animals",
      "Persona",
      "PGA Tour",
      "Phantasy Star",
      "Phasmophobia",
      "Pikachu",
      "Pikmin",
      "Pokemon",
      "Portal",
      "Prince of Persia",
      "Prison Architect",
      "Professor Layton",
      "Psychonauts",
      "PUBG: Battlegrounds",
      "Punch-Out!!",
      "Puyo Puyo",
      "Quake",
      "Rabidds",
      "Railroad Tycoon",
      "Ratchet & Clank",
      "Rayman",
      "Red Dead",
      "Resistance",
      "Resident Evil",
      "Rhythm Heaven",
      "Ridge Racer",
      "Rival Schools",
      "Roblox",
      "Rock Band",
      "Rocket League",
      "Roller Coaster Tycoon",
      "RPG Maker",
      "Rune Factory",
      "Runescape",
      "Sackboy",
      "SaGa",
      "Samba de Amigo",
      "Saints Row",
      "Scribblenauts",
      "Senran Kagura",
      "Shadow of the Colossus",
      "Shantae",
      "Shenmue",
      "Shin Megami Tensei",
      "Shining",
      "Shinobi",
      "Shovel Knight",
      "Silent Hill",
      "SimCity",
      "Skullgirls",
      "SMITE",
      "SNK vs. Capcom",
      "SOCOM",
      "Sonic the Hedgehog",
      "Soulcalibur",
      "Space Channel 5",
      "Spider-Man",
      "Splatoon",
      "Spongebob Squarepants",
      "Stardew Valley",
      "StarCraft",
      "Star Fox",
      "Star Ocean",
      "Star Wars",
      "State of Decay",
      "Street Fighter",
      "Streets of Rage",
      "Strider",
      "Stumble Guys",
      "Subway Surfers",
      "Super Mario",
      "Super Meat Boy",
      "Super Mega Baseball",
      "Super Monkey Ball",
      "Super Smash Bros",
      "Syndicate",
      "System Shock",
      "Tak",
      "Tales",
      "Team Fortress",
      "Tempest",
      "Temple Run",
      "Terraria",
      "Tetris",
      "Thief",
      "The Binding of Issac",
      "The Elder Scrolls",
      "The Legend of Zelda",
      "The Last of Us",
      "The Sims",
      "The Stanley Parable",
      "The TakeOver",
      "The Walking Dead",
      "The Witcher",
      "Tom Clancy's",
      "Tomodachi Collection",
      "Tomb Raider",
      "Tony Hawk's",
      "Total War",
      "Touch! Generations",
      "Transformers",
      "Twisted Metal",
      "Turnip Boy",
      "Turok",
      "Ultima",
      "Uncharted",
      "Undertale",
      "Unreal",
      "Untitled Goose Game",
      "Valkyria Chronicles",
      "Valkyrie Profile",
      "Valorant",
      "Vectorman",
      "Vexx",
      "Viewtiful Joe",
      "Virtua Fighter",
      "WWE",
      "Warcraft",
      "Wario",
      "WarioWare",
      "Watch Dogs",
      "Wii",
      "Wild Arms",
      "Wing Commander",
      "Wipeout",
      "Wizadry",
      "Wizards & Warriors",
      "Wolfenstein",
      "World of Warcraft",
      "X-COM",
      "X-Men",
      "Xenoblade Chronicles",
      "Xenogears",
      "Xenosaga",
      "Yakuza",
      "Yo-kai Watch",
      "Yooka-Laylee",
      "Yoshi",
      "You Don't Know Jack",
      "Yu-Gi-Oh!",
      "Zone of the Enders",
      "Zoo Tycoon",
    ]; // Add more game titles as needed
    const gameTitle = gameTitles.find((title) => question.includes(title));

    // Extract context words from the question (first 2-3 significant words)
    const contextWords = words.slice(0, 8).filter((word) => word.length > 4); // Adjust the slice range and filter condition as needed

    // Combine the game title with context words
    let shortened = `${gameTitle} ${contextWords.join(" ")}`;

    // Ensure the length is reasonable
    return shortened.length > 50
      ? `${shortened.substring(0, 47)}...`
      : shortened;
  };

  return (
    <div className="w-64 bg-gray-800 text-white p-4">
      <h2 className="text-2xl font-bold mb-4">Conversations</h2>
      {conversations.map((convo) => (
        <div key={convo._id} className="mb-4">
          <div className="flex justify-between items-center">
            <div
              className="cursor-pointer"
              onClick={() => onSelectConversation(convo)}
            >
              {shortenQuestion(convo.question)}
            </div>
            <DropdownMenu.Root>
              <DropdownMenu.Trigger className="text-white">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-6 h-6"
                >
                  <path d="M12 7a2 2 0 110-4 2 2 0 010 4zM12 13a2 2 0 110-4 2 2 0 010 4zM12 19a2 2 0 110-4 2 2 0 010 4z" />
                </svg>
              </DropdownMenu.Trigger>
              <DropdownMenu.Content className="bg-gray-700 text-white p-2 rounded-md">
                <DropdownMenu.Item onSelect={() => handleDelete(convo._id)}>
                  Delete
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Root>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Sidebar;
