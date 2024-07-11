"use client";

import { useState } from "react";
import axios from "axios";

export default function Home() {
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submitted with question:", question);
    setLoading(true);
    try {
      const res = await axios.post("/api/assistant", { question });
      console.log("Response from server:", res.data);
      setResponse(res.data.answer);
    } catch (error) {
      console.error("Error submitting form:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatResponse = (response: string) => {
    const sentences = response.split(". ").map((sentence) => sentence.trim());
    let stepCounter = 1;
    return sentences.map((sentence, index) => {
      if (sentence.match(/^Step\s*\d*:/i)) {
        return (
          <p key={index} className="mt-2">
            <strong>{stepCounter++}.</strong>{" "}
            {sentence.replace(/Step\s*\d*:/i, "").trim()}.
          </p>
        );
      } else {
        return (
          <p key={index} className="ml-4">
            {sentence}.
          </p>
        );
      }
    });
  };

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
