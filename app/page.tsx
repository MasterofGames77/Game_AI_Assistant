"use client"; // client-side component

import { useState } from "react";
import axios from "axios";

// Main component function for the Home page
export default function Home() {
  // State variables to manage question, response, loading, and error state
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [userId, setUserId] = useState("user123"); // Hardcoded for demonstration, replace with actual user ID logic

  // Function to handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // Prevent default form submission behavior
    console.log("Form submitted with question:", question);
    setLoading(true); // Set loading state to true
    setError(""); // Reset error state

    try {
      // Make a POST request to the API endpoint with the question and userId
      const res = await axios.post("/api/assistant", { userId, question });
      console.log("Response from server:", res.data);
      setResponse(res.data.answer); // Set the response state with the server's answer
    } catch (error) {
      console.error("Error submitting form:", error); // Log any errors
      setError("There was an error processing your request. Please try again."); // Set error state
    } finally {
      setLoading(false); // Set loading state to false
    }
  };

  // Function to clear the response, question, and error
  const handleClear = () => {
    setQuestion("");
    setResponse("");
    setError("");
  };

  // Function to format the response from the server
  const formatResponse = (response: string) => {
    const sentences = response.split("\n").map((sentence) => sentence.trim());
    let stepCounter = 1;
    return sentences.map((sentence, index) => {
      if (sentence.match(/^\d+\.\s/)) {
        return (
          <p key={index} className="mt-2">
            <strong>{stepCounter++}. </strong>
            {sentence.replace(/^\d+\.\s/, "").trim()}
          </p>
        );
      } else {
        return (
          <p key={index} className="mt-2">
            {sentence}
          </p>
        );
      }
    });
  };

  // Return the JSX to render the component
  return (
    <div className="min-h-screen flex flex-col items-center justify-center py-2">
      <h1 className="text-4xl font-bold mb-6">Video Game Wingman</h1>
      <form onSubmit={handleSubmit} className="w-full max-w-md">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Enter your gameplay data or question for analysis"
          className="w-full p-2 border border-gray-300 rounded mb-4"
        />
        <div className="flex space-x-4">
          <button
            type="submit"
            className="w-full p-2 bg-blue-500 text-white rounded"
          >
            Submit
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="w-full p-2 bg-red-500 text-white rounded"
          >
            Clear
          </button>
        </div>
      </form>
      {loading && <div className="spinner mt-4"></div>}
      {error && <div className="mt-4 text-red-500">{error}</div>}
      {response && (
        <div className="mt-8 w-full max-w-3xl">
          <h2 className="text-2xl font-bold">Response</h2>
          <div className="bg-gray-100 p-4 rounded response-box">
            {formatResponse(response)}
          </div>
        </div>
      )}
    </div>
  );
}
