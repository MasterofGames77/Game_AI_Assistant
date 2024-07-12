"use client"; // client-side component

import { useState } from "react";
import axios from "axios";

// Main component function for the Home page
export default function Home() {
  // State variables to manage question, response, and loading state
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);

  // Function to handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // Prevent default form submission behavior
    console.log("Form submitted with question:", question);
    setLoading(true); // Set loading state to true

    try {
      // Make a POST request to the API endpoint with the question
      const res = await axios.post("/api/assistant", { question });
      console.log("Response from server:", res.data);
      setResponse(res.data.answer); // Set the response state with the server's answer
    } catch (error) {
      console.error("Error submitting form:", error); // Log any errors
    } finally {
      setLoading(false); // Set loading state to false
    }
  };

  // Function to format the response from the server
  const formatResponse = (response: string) => {
    // Split the response into sentences
    const sentences = response.split(". ").map((sentence) => sentence.trim());
    let stepCounter = 1;
    // Map each sentence to a formatted paragraph
    return sentences.map((sentence, index) => {
      // If the sentence starts with "Step", format it with a step number
      if (sentence.match(/^Step\s*\d*:/i)) {
        return (
          <p key={index} className="mt-2">
            <strong>{stepCounter++}.</strong>{" "}
            {sentence.replace(/Step\s*\d*:/i, "").trim()}.
          </p>
        );
      } else {
        // Otherwise, format it as a regular paragraph with indentation
        return (
          <p key={index} className="ml-4">
            {sentence}.
          </p>
        );
      }
    });
  };

  // Return the JSX to render the component
  return (
    <div className="min-h-screen flex flex-col items-center justify-center py-2">
      <h1 className="text-4xl font-bold mb-6">
        Video Game Analytics Assistant
      </h1>
      <form onSubmit={handleSubmit} className="w-full max-w-md">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Enter your gameplay data or question for analysis"
          className="w-full p-2 border border-gray-300 rounded mb-4"
        />
        <button
          type="submit"
          className="w-full p-2 bg-blue-500 text-white rounded"
        >
          Submit
        </button>
      </form>
      {loading && <div className="spinner mt-4"></div>}
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
