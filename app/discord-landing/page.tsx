// "use client";

// import { useSearchParams } from "next/navigation";
// import { useEffect, useState, Suspense } from "react";

// export const dynamic = "force-dynamic";

// // Create a separate component for the main content
// function DiscordLandingContent() {
//   const searchParams = useSearchParams();
//   const botInviteUrl = searchParams?.get("botInvite") ?? null;
//   const userId = searchParams?.get("userId") ?? null;
//   const [applicationId, setApplicationId] = useState<string | null>(null);

//   useEffect(() => {
//     const fetchApplicationId = async () => {
//       try {
//         const response = await fetch("/api/discord/config");
//         const data = await response.json();
//         setApplicationId(data.applicationId);
//       } catch (error) {
//         console.error("Failed to fetch Discord config:", error);
//       }
//     };
//     fetchApplicationId();
//   }, []);

//   console.log("Discord Landing Page Parameters:", {
//     botInviteUrl: botInviteUrl ? "[REDACTED]" : "null",
//     userId: userId ? "[REDACTED]" : "null",
//   });

//   const handleAddToServer = () => {
//     if (botInviteUrl) {
//       console.log("Opening bot invite URL in new window");
//       window.open(botInviteUrl, "_blank");
//     } else {
//       console.error("Bot invite URL is missing");
//     }
//   };

//   const handleStartDM = async () => {
//     if (!applicationId) {
//       console.error("Discord application ID not available");
//       return;
//     }

//     try {
//       // Try to open Discord desktop app with correct deep link format
//       window.location.href = `discord:///users/${applicationId}`; // Note the triple slash

//       // Fallback to web version after a short delay
//       setTimeout(() => {
//         window.open(`https://discord.com/users/${applicationId}`, "_blank");
//       }, 1000);
//     } catch (error) {
//       console.error("Error opening Discord DM:", error);
//       // Fallback directly to web version if app URL fails
//       window.open(`https://discord.com/users/${applicationId}`, "_blank");
//     }
//   };

// return (
//   <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
//     <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
//       <h1 className="text-2xl font-bold mb-6 text-center">
//         Introducing Video Game Wingman!
//       </h1>
//       <div className="space-y-4">
//         <button
//           onClick={handleAddToServer}
//           className="w-full bg-indigo-600 text-white py-2 px-4 rounded hover:bg-indigo-700 transition"
//         >
//           Add Bot to Server
//         </button>
{
  /* <button
            onClick={handleStartDM}
            className="w-full bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 transition"
          >
            Start Direct Message
          </button> */
}
//         </div>
//       </div>
//     </div>
//   );
// }

// // Main component with Suspense wrapper
// export default function DiscordLanding() {
//   return (
//     <Suspense
//       fallback={
//         <div className="flex items-center justify-center min-h-screen">
//           <div className="text-lg">Loading...</div>
//         </div>
//       }
//     >
//       <DiscordLandingContent />
//     </Suspense>
//   );
// }
