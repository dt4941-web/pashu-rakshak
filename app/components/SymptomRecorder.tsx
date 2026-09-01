"use client";
import { useState, useEffect } from "react";
import { Mic, Square } from "lucide-react";

export default function SymptomRecorder({ onRecordComplete }: { onRecordComplete: (text: string) => void }) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [language, setLanguage] = useState("hi-IN"); // Hindi by default
  const [recognition, setRecognition] = useState<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      
      rec.onresult = (event: any) => {
        let currentTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);
      };
      rec.onend = () => setIsRecording(false);
      setRecognition(rec);
    }
  }, []);

  const toggleRecording = () => {
    if (isRecording) {
      recognition?.stop();
      setIsRecording(false);
      onRecordComplete(transcript);
    } else {
      if (recognition) recognition.lang = language;
      recognition?.start();
      setIsRecording(true);
    }
  };

  return (
    <div className="p-4 border rounded-lg shadow-sm bg-white text-black">
      <h3 className="font-bold mb-2">Record Symptoms</h3>
      <select 
        className="mb-4 p-2 border rounded w-full"
        value={language} 
        onChange={(e) => setLanguage(e.target.value)}
        disabled={isRecording}
      >
        <option value="hi-IN">Hindi (हिंदी)</option>
        <option value="mr-IN">Marathi (मराठी)</option>
        <option value="gu-IN">Gujarati (ગુજરાતી)</option>
        <option value="en-US">English</option>
      </select>

      <button 
        onClick={toggleRecording}
        className={`flex items-center justify-center p-3 w-full text-white rounded-lg transition-colors ${
          isRecording ? "bg-red-500 animate-pulse" : "bg-blue-600 hover:bg-blue-700"
        }`}
      >
        {isRecording ? <Square className="mr-2" /> : <Mic className="mr-2" />}
        {isRecording ? "Stop Recording" : "Tap to Speak"}
      </button>

      {transcript && <p className="mt-4 p-2 bg-gray-50 rounded border">{transcript}</p>}
    </div>
  );
}