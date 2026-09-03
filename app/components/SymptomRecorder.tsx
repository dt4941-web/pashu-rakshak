"use client";
import { useState, useEffect } from "react";
import { Mic, Square } from "lucide-react";
import { motion } from "framer-motion"; // <-- Add this line here
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
    <motion.div 
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.5 }}
  className="p-6 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 text-white shadow-xl transition-all duration-300 hover:-translate-y-1 hover:border-emerald-500/50"
>
  <h3 className="font-bold text-lg mb-4 text-emerald-300">Record Symptoms</h3>
  
  <select
    className="mb-4 p-3 bg-slate-900/80 border border-white/20 rounded-xl w-full text-white outline-none focus:ring-2 focus:ring-emerald-400"
    value={language}
    onChange={(e) => setLanguage(e.target.value)}
    disabled={isRecording}
  >
    <option value="hi-IN" className="bg-slate-900">Hindi (हिंदी)</option>
    <option value="mr-IN" className="bg-slate-900">Marathi (मराठी)</option>
    <option value="gu-IN" className="bg-slate-900">Gujarati (ગુજરાતી)</option>
    <option value="en-US" className="bg-slate-900">English</option>
  </select>
  {/* Keep existing button & transcript */}
      <button 
        onClick={toggleRecording}
        className={`flex items-center justify-center p-3 w-full text-white rounded-lg transition-colors ${
          isRecording ? "bg-red-500 animate-pulse" : "bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 shadow-md"
        }`}
      >
        {isRecording ? <Square className="mr-2" /> : <Mic className="mr-2" />}
        {isRecording ? "Stop Recording" : "Tap to Speak"}
      </button>

      {transcript && <p className="mt-4 p-3 bg-black/40 text-emerald-200 rounded-xl border border-white/10 text-sm shadow-inner">{transcript}</p>}
    </motion.div>
  );
}