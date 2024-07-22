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
      "Xenoblade Chronicles",
      "The Legend of Zelda",
      "Super Mario",
      "Call of Duty",
      "Fortnite",
      "Devil May Cry",
      "Mega Man",
      "Crash Bandicoot",
      "Bomberman",
      "Kingdom Hearts",
      "Street Fighter",
      "F-Zero",
      "Forza",
      "Batman: Arkham",
      "Resident Evil",
      "Marvel",
      "Sonic",
      "Pac-Man",
      "Grand Theft Auto",
      "The Elder Scrolls",
      "Apex Legends",
      "Super Smash Bros",
      "Pikmin",
      "Pokemon",
      "Kid Icarus",
      "Metroid",
      "Bayonetta",
      "Final Fantasy",
      "Dragon Quest",
      "Madden",
      "FIFA",
      "Metal Gear",
      "Castlevania",
      "Horizon",
      "Donkey Kong",
      "Ace Attorney",
      "BioShock",
      "Alex Kidd",
      "Brain Age",
      "Baldur's Gate",
      "Battlefield",
      "Ape Escape",
      "Art Academy",
      "Kirby",
      "Earthbound",
      "Mother",
      "Breath of Fire",
      "Bravely",
      "Custom Robo",
      "Contra",
      "Conker",
      "Banjo-Kazooie",
      "Command & Conquer",
      "Age of Empires",
      "Sims",
      "Dance Dance Revolution",
      "Dark Souls",
      "Diablo",
      "Dead Rising",
      "Ever Quest",
      "Dead or Alive",
      "Fallout",
      "Fatal Fury",
      "Fire Emblem",
      "Just Dance",
      "The King of Fighters",
      "LittleBigPlanet",
      "The Last of Us",
      "Metal Slug",
      "Mortal Kombat",
      "NieR",
      "Onimusha",
      "Dynasty Warriors",
      "Psychonauts",
      "Punch-Out!!",
      "Portal",
      "Shovel Knight",
      "Shantae",
      "Quake",
      "Doom",
      "Ratchet & Clank",
      "Jak and Daxter",
      "Red Dead",
      "Rune Factory",
      "League of Legends",
      "World of Warcraft",
      "Streets of Rage",
      "Star Fox",
      "Super Monkey Ball",
      "Tekken",
      "Team Fortress",
      "Among Us",
      "Fall Guys",
      "Ultima",
      "Uncharted",
      "Virtua Fighter",
      "WarioWare",
      "Yu-Gi-Oh!",
      "Wii",
      "Xenosaga",
      "Xenogears",
      "Runescape",
      "Rune Factory",
      "Rock Band",
      "Guitar Hero",
      "Puyo Puyo",
      "Tetris",
      "Overcooked",
      "Panzer Dragoon",
      "Nights",
      "Mana",
      "Chrono",
      "Halo",
    ]; // Add more game titles as needed
    const gameTitle = gameTitles.find((title) => question.includes(title));

    // Extract context words from the question (first 2-3 significant words)
    const contextWords = words.slice(0, 10).filter((word) => word.length > 2); // Adjust the slice range and filter condition as needed

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
