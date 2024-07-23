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
      "Ace Attorney",
      "Age of Empires",
      "Alex Kidd",
      "Among Us",
      "Apex Legends",
      "Ape Escape",
      "Armored Core",
      "Art Academy",
      "Baldur's Gate",
      "Banjo-Kazooie",
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
      "Bloodstained",
      "Bomberman",
      "BoxBoy!",
      "Brain Age",
      "Bravely",
      "Breath of Fire",
      "Bubsy",
      "Candy Crush",
      "Castlevania",
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
      "Custom Robo",
      "Dance Dance Revolution",
      "Danganronpa",
      "Dark Souls",
      "Darkstalkers",
      "Dead or Alive",
      "Dead Rising",
      "Dead Space",
      "Dead Island",
      "Devil May Cry",
      "Diablo",
      "Doom",
      "Dota",
      "Dragon Ball",
      "Dragon Quest",
      "Dying Light",
      "Dynasty Warriors",
      "Earthbound",
      "Earthworm Jim",
      "Ecco the Dolphin",
      "EverQuest",
      "Everybody's Golf",
      "F-Zero",
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
      "Fire Emblem",
      "FlatOut",
      "Football Manager",
      "Forza",
      "Fortnite",
      "Garry's Mod",
      "Gears of War",
      "Gex",
      "Ghosts 'n Goblins",
      "God of War",
      "Golden Axe",
      "Golden Sun",
      "Grand Theft Auto",
      "Gran Turismo",
      "Gradius",
      "Guitar Hero",
      "Guilty Gear",
      "Gunvolt",
      "Halo",
      "Hatsune Miku: Project DIVA",
      "Hitman",
      "Horizon",
      "Homeworld",
      "Hyperdimension Neptunia",
      "Infamous",
      "Injustice",
      "Jak and Daxter",
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
      "Minecraft",
      "Mother",
      "Mortal Kombat",
      "Myst",
      "Mystery Dungeon",
      "NASCAR",
      "NBA 2K",
      "NBA Jam",
      "NBA Live",
      "Need for Speed",
      "Ni No Kuni",
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
      "Panzer Dragoon",
      "Paper Mario",
      "Persona",
      "PGA Tour",
      "Pikmin",
      "Pokemon",
      "Portal",
      "Prince of Persia",
      "Professor Layton",
      "Psychonauts",
      "Punch-Out!!",
      "Puyo Puyo",
      "Quake",
      "Railroad Tycoon",
      "Ratchet & Clank",
      "Rayman",
      "Red Dead",
      "Resistance",
      "Resident Evil",
      "Rhythm Heaven",
      "Roblox",
      "Rock Band",
      "Roller Coaster Tycoon",
      "RPG Maker",
      "Rune Factory",
      "Runescape",
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
      "SNK vs. Capcom",
      "SOCOM",
      "Sonic the Hedgehog",
      "Soulcalibur",
      "Splatoon",
      "Stardew Valley",
      "Star Fox",
      "Star Ocean",
      "Star Wars",
      "State of Decay",
      "Street Fighter",
      "Streets of Rage",
      "Strider",
      "Super Mario",
      "Super Mega Baseball",
      "Super Monkey Ball",
      "Super Smash Bros",
      "System Shock",
      "Tak",
      "Tales",
      "Team Fortress",
      "Tetris",
      "Thief",
      "The Elder Scrolls",
      "The Legend of Zelda",
      "The Last of Us",
      "The Sims",
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
      "Turok",
      "Ultima",
      "Uncharted",
      "Unreal",
      "Valkyria Chronicles",
      "Valkyrie Profile",
      "Viewtiful Joe",
      "Virtua Fighter",
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
      "Xenoblade Chronicles",
      "Xenogears",
      "Xenosaga",
      "Yakuza",
      "Yo-kai Watch",
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
