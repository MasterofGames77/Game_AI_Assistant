// "use client";

// import { useState } from "react";
// import { GameData } from "../utils/wikiScraper"; // Import the type

// interface TestResults {
//   singleGameTest: GameData | null;
//   error?: {
//     message: string;
//     details: string;
//   };
// }

// export default function TestPage() {
//   const [testResults, setTestResults] = useState<TestResults | null>(null);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);

//   const runTest = async () => {
//     setLoading(true);
//     setError(null);
//     try {
//       const response = await fetch("/api/testScraper");
//       if (!response.ok) {
//         throw new Error(`HTTP error! status: ${response.status}`);
//       }
//       const data = await response.json();
//       setTestResults(data);
//     } catch (error) {
//       setError(error instanceof Error ? error.message : "An error occurred");
//       console.error("Test failed:", error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="p-4">
//       <h1 className="text-2xl mb-4">Wiki Scraper Test Page</h1>
//       <p className="mb-4 text-gray-600">
//         Testing scraper for: The Legend of Zelda: Breath of the Wild
//       </p>

//       <button
//         onClick={runTest}
//         className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
//         disabled={loading}
//       >
//         {loading ? "Testing..." : "Run Test"}
//       </button>

//       {error && (
//         <div className="mt-4 p-4 bg-red-100 text-red-700 rounded">{error}</div>
//       )}

//       {testResults && (
//         <div className="mt-4">
//           <h2 className="text-xl mb-2">Test Results:</h2>
//           {testResults.error ? (
//             <div className="p-4 bg-red-100 text-red-700 rounded">
//               <p>Error: {testResults.error.message}</p>
//               <p>Details: {testResults.error.details}</p>
//             </div>
//           ) : (
//             <div className="p-4 bg-gray-100 rounded">
//               <h3 className="font-bold">Game Data:</h3>
//               <div className="mt-2 space-y-2">
//                 <p>Title: {testResults.singleGameTest?.title}</p>
//                 <p>Release Date: {testResults.singleGameTest?.releaseDate}</p>
//                 <p>Developer: {testResults.singleGameTest?.developer}</p>
//                 <p>Publisher: {testResults.singleGameTest?.publisher}</p>
//                 <p>
//                   Platforms: {testResults.singleGameTest?.platforms?.join(", ")}
//                 </p>
//                 {testResults.singleGameTest?.plotSummary && (
//                   <div>
//                     <p className="font-bold">Plot Summary:</p>
//                     <p>{testResults.singleGameTest.plotSummary}</p>
//                   </div>
//                 )}
//               </div>
//               <details className="mt-4">
//                 <summary className="cursor-pointer">Raw JSON Data</summary>
//                 <pre className="mt-2 p-2 bg-gray-200 rounded text-sm">
//                   {JSON.stringify(testResults.singleGameTest, null, 2)}
//                 </pre>
//               </details>
//             </div>
//           )}
//         </div>
//       )}
//     </div>
//   );
// }
