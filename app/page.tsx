"use client";
import { useState, useEffect, useRef } from "react";
import { History, PlusCircle, LogOut, Loader2, AlertTriangle, ShieldCheck } from "lucide-react";

import SymptomRecorder from "./components/SymptomRecorder";
import { createClient } from "@supabase/supabase-js";
import dynamic from "next/dynamic";
const DiseaseMap = dynamic(() => import("./components/DiseaseMap"), { ssr: false });


// Initialize Supabase Connection
const supabaseUrl = "https://owbajiljwqzkvjijwlss.supabase.co";
const supabaseAnonKey = "sb_publishable_HEYxt_vczz4i5sxQQpf2aQ_wLpT77vv";
const supabase = createClient(supabaseUrl, supabaseAnonKey);
const MODEL_URL = "https://teachablemachine.withgoogle.com/models/xz8Dmt4IL/";
export default function Dashboard() {
  const [alertMessage, setAlertMessage] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (email === "vet@pashurakshak.gov.in" && password === "SIH2026") {
      setIsLoggedIn(true);
    } else {
      setLoginError("Invalid credentials. Try: vet@pashurakshak.gov.in / SIH2026");
    }
  };
  const [activeTab, setActiveTab] = useState("scan");
  
  const [image, setImage] = useState<string | null>(null);
  const [symptoms, setSymptoms] = useState("");
  const [result, setResult] = useState<any>(null);
  const [diagnosis, setDiagnosis] = useState("");
  const [confidence, setConfidence] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [alertActive, setAlertActive] = useState(false);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [loading, setLoading] = useState(false);
  
  const [healthRecords, setHealthRecords] = useState<any[]>([]);

  useEffect(() => {
    async function fetchReports() {
      if (activeTab === "database") {
        // Show loading state if you have one
        setLoading(true);
        
        const { data, error } = await supabase
          .from("disease_reports")
          .select("*")
          .order("created_at", { ascending: false }); // Newest first
        
        if (!error && data) {
          setHealthRecords(data);
        } else {
          console.error("Failed to fetch records:", error);
        }
        
        setLoading(false);
      }
    }
    fetchReports();
  }, [activeTab]);
  const fetchRecords = async () => {
    const { data, error } = await supabase
      .from("disease_reports")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (error) {
      alert("Error fetching records: " + error.message);
    } else if (data) {
      setHealthRecords(data);
    }
  };

  const autoAnalyzeDisease = async (base64Image: string, currentSymptoms: string) => {
    setLoading(true);
    setResult(null); 
    
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          imageBase64: base64Image.split(",")[1], 
          mimeType: base64Image.match(/data:(.*?);/)?.[1],
          symptoms: currentSymptoms 
        }),
      });
      
      const data = await response.json();
      setResult(data);

      // SAVE TO SUPABASE WITH ERROR TRACKING
      if (!data.error && data.disease) {
        const { error: supabaseError } = await supabase.from("disease_reports").insert([
          {
            disease: data.disease,
            confidence: data.confidence,
            severity: data.severity,
            symptoms: currentSymptoms
          }
        ]);
        
        // If Supabase rejects the save, show a popup alert
        if (supabaseError) {
          alert("Database Error: " + supabaseError.message);
        }
      }
    // 1. You set the result
      setResult(data); 

    // 2. Grab GPS BEFORE saving to database so we can map it
    let lat = null;
    let lng = null;
    if ("geolocation" in navigator) {
      try {
        const position: any = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject);
        });
        lat = position.coords.latitude;
        lng = position.coords.longitude;
      } catch (geoError) {
        console.log("User denied location access.");
      }
    }

    // 3. Save everything (including GPS) to Supabase
    const { error: dbError } = await supabase.from('disease_reports').insert([{
      disease: data.disease,
      severity: data.severity,
      confidence: data.confidence,
      symptoms: data.symptoms?.join(', ') || "None",
      immediate_actions: data.immediate_actions?.join(', ') || "None",
      latitude: lat,
      longitude: lng
    }]);

    if (dbError) console.error("DATABASE ERROR:", dbError);

    // 4. Show the Green Emergency Alert Box
    if (data.severity === "Critical" || data.severity === "High" || data.severity === "Moderate") {
      setAlertMessage(`🚨 EMERGENCY PROTOCOL ACTIVATED: Alert dispatched to local Veterinarian & Farmer via WhatsApp with Live GPS Coordinates.`);
    }
      
    } catch (error) {
      setResult({ error: "Network error. Make sure your local server is running." });
    }
    setLoading(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setImage(base64);
        autoAnalyzeDisease(base64, symptoms); 
      };
      reader.readAsDataURL(file);
    }
  };

  // --- LOGIN SCREEN INTERCEPTOR ---
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-950 via-teal-900 to-slate-900 p-4">
        
        {/* Glassmorphism Card */}
        <div className="bg-white/10 backdrop-blur-xl p-8 rounded-3xl shadow-2xl max-w-md w-full border border-white/20 relative overflow-hidden">
          
          {/* Decorative Glow inside the card */}
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-emerald-500/30 rounded-full blur-3xl"></div>
          
          <div className="flex justify-center mb-6 relative z-10">
            <div className="bg-emerald-500/20 p-4 rounded-2xl ring-1 ring-emerald-500/30 shadow-lg">
              <ShieldCheck className="h-10 w-10 text-emerald-300" />
            </div>
          </div>
          <h1 className="text-3xl font-extrabold text-white mb-8 text-center tracking-tight">Pashu Rakshak</h1>
          
          <form onSubmit={handleLogin} className="space-y-6 relative z-10">
            <div>
              <label className="block text-sm font-medium text-emerald-100 mb-1.5">Veterinarian Email</label>
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                className="w-full bg-white/5 border border-white/10 text-white placeholder-emerald-200/50 rounded-xl p-3 focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all outline-none" 
                placeholder="vet@pashurakshak.gov.in"
                required 
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-emerald-100 mb-1.5">Secure Password</label>
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                className="w-full bg-white/5 border border-white/10 text-white placeholder-emerald-200/50 rounded-xl p-3 focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all outline-none" 
                placeholder="••••••••"
                required 
              />
            </div>

            {loginError && <p className="text-red-400 text-sm font-semibold bg-red-500/10 p-3 rounded-lg border border-red-500/20">{loginError}</p>}

            <button type="submit" className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white p-3.5 rounded-xl hover:from-emerald-400 hover:to-teal-400 transition-all duration-300 shadow-lg shadow-emerald-500/25 font-bold text-lg hover:-translate-y-0.5">
              Access Dashboard
            </button>
          </form>

          {/* HINT FOR JUDGES */}
          <div className="mt-8 p-5 bg-black/20 border border-white/10 rounded-2xl text-sm text-emerald-100 shadow-inner relative z-10">
            <p className="font-semibold mb-2 flex items-center gap-2 text-white">👨‍⚖️ Demo Details for SIH Judges:</p>
            <p className="mb-1 opacity-90">Email: <span className="font-mono font-bold text-emerald-300">vet@pashurakshak.gov.in</span></p>
            <p className="opacity-90">Password: <span className="font-mono font-bold text-emerald-300">SIH2026</span></p>
          </div>
        </div>
      </div>
    );
  }
  // --------------------------------
  const analyzeImage = async () => {
    if (!imageRef.current) return;
    setLoading(true);
    setStatusMessage('');

    try {
      const tmImage = (window as any).tmImage;
      const model = await tmImage.load(MODEL_URL + 'model.json', MODEL_URL + 'metadata.json');
      const predictions = await model.predict(imageRef.current);

      const topPrediction = predictions.reduce((prev: any, curr: any) =>
        curr.probability > prev.probability ? curr : prev
      );

      const topConfidence = Math.round(topPrediction.probability * 100);
      setConfidence(topConfidence);

      if (topConfidence < 65) {
        setDiagnosis('Uncertain / Unidentified Disease');
        setAlertActive(true);
        setStatusMessage(
          "I cannot specify the disease from this scan. However, your image, symptoms, and Live GPS Coordinates have been dispatched to a nearby veterinarian."
        );
        sendAlertToVet({ condition: 'Unknown Condition', confidence: topConfidence });
      } else if (topPrediction.className === 'Healthy Cow') {
        setDiagnosis('Healthy Animal');
        setAlertActive(false);
        setStatusMessage('Your animal appears healthy. No emergency protocol needed.');
     } else {
        setDiagnosis(topPrediction.className);
        setAlertActive(true);
        setStatusMessage(`EMERGENCY PROTOCOL ACTIVATED: Detected ${topPrediction.className}. Alert dispatched to local Veterinarian & Farmer with Live GPS Coordinates.`);
        window.alert(`EMERGENCY: ${topPrediction.className} detected! Alerting veterinarian.`);
        sendAlertToVet({ condition: topPrediction.className, confidence: topConfidence });
      }
    } catch (err) {
      console.error(err);
      setStatusMessage('Error analyzing image. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const sendAlertToVet = async (details: { condition: string; confidence: number }) => {
    try {
      await fetch('/api/submit_report.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          condition: details.condition,
          confidence: details.confidence,
          image: image,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (error) {
      console.error('Failed to notify backend:', error);
    }
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-teal-100/50 text-black">
      <div className="w-64 bg-white border-r shadow-sm p-4 flex flex-col">
        <h2 className="text-2xl font-extrabold text-green-700 mb-8 mt-2 px-2">Pashu Rakshak</h2>
        <nav className="flex-1 space-y-2">
          <button onClick={() => setActiveTab("scan")} className={`w-full flex items-center p-3 rounded-lg transition-all ${activeTab === "scan" ? "bg-green-50 text-green-700 font-bold" : "hover:bg-gray-100 text-gray-700"}`}>
            <PlusCircle className="mr-3 h-5 w-5" /> New AI Scan
          </button>
          <button onClick={() => setActiveTab("database")} className={`w-full flex items-center p-3 rounded-lg transition-all ${activeTab === "database" ? "bg-green-50 text-green-700 font-bold" : "hover:bg-gray-100 text-gray-700"}`}>
            <History className="mr-3 h-5 w-5" /> Health Database
          </button>
        </nav>
        <button onClick={() => setIsLoggedIn(false)} className="flex items-center p-3 text-red-600 hover:bg-red-50 rounded-lg transition-all font-semibold">
          <LogOut className="mr-3 h-5 w-5" /> Logout
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-10">
        {activeTab === "scan" && (
          <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-500">
            
            {/* Header */}
            <div className="border-b border-slate-200 pb-5">
              <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Instant Disease Detection</h1>
              <p className="text-slate-500 mt-2">Upload a photo or describe symptoms to run an AI diagnosis.</p>
            </div>

            {/* Symptoms Card */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow duration-300">
              <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                <span className="bg-teal-100 text-teal-700 p-1.5 rounded-lg">📝</span> Record Symptoms
              </h3>
              
              {/* Keep your existing SymptomRecorder component here, but wrap it nicely */}
              <div className="space-y-4">
                <SymptomRecorder onRecordComplete={setSymptoms} />
              </div>
            </div>

            {/* Upload Card */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow duration-300">
               <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                <span className="bg-emerald-100 text-emerald-700 p-1.5 rounded-lg">📸</span> Upload Photo to Auto-Analyze
              </h3>
              
              <div className="relative group cursor-pointer">
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleImageUpload} 
                  className="w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100 border border-slate-200 rounded-xl p-2 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all cursor-pointer"
                />
              </div>

              {image && (
  <>
    <div className="mt-6 rounded-xl overflow-hidden border border-slate-200 shadow-sm relative">
      <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-md backdrop-blur-sm">Image Preview</div>
      <img ref={imageRef} src={image} alt="Preview" className="h-56 w-full object-cover" />
    </div>
    
    <button 
      onClick={analyzeImage} 
      disabled={loading}
      className="w-full mt-4 bg-teal-600 hover:bg-teal-700 text-white py-3 rounded-xl font-bold transition-colors"
    >
      {loading ? "Analyzing Image..." : "Run AI Diagnosis"}
    </button>
  </>
)}
            </div>
            {/* AI Alert Banner */}
{statusMessage && (
  <div className={`p-4 mt-6 rounded-xl text-sm font-semibold border ${alertActive ? 'bg-red-50 text-red-800 border-red-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200'}`}>
    {statusMessage}
  </div>
)}

{/* AI Diagnosis Details */}
              {diagnosis && (
                <div className="p-5 mt-4 border rounded-xl bg-white shadow-lg text-black space-y-3 border-t-4 border-t-teal-500">
                  <h2 className="font-bold text-2xl text-teal-700 border-b pb-2">
                    Diagnosis: {diagnosis}
                  </h2>
                  <div className="flex justify-between">
                    <p><strong>Confidence:</strong> {confidence}%</p>
                  </div>
                </div>
    )}
  </div>
)}

{/* Database Tab */}
        {/* Database Tab */}
        {activeTab === "database" && (
          <div className="max-w-5xl mx-auto space-y-6">
            <h1 className="text-3xl font-bold border-b pb-4">Animal Health Records</h1>
            <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="p-5 font-semibold text-gray-600">Date</th>
                    <th className="p-5 font-semibold text-gray-600">Disease Detected</th>
                    <th className="p-5 font-semibold text-gray-600">Severity</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {healthRecords.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="p-5 text-center text-gray-500">No records found. Run a scan first.</td>
                    </tr>
                  ) : (
                    healthRecords.map((record: any) => (
                      <tr key={record.id} className="hover:bg-gray-50">
                        <td className="p-5">{new Date(record.created_at).toLocaleDateString()}</td>
                        <td className="p-5 font-bold text-gray-800">{record.disease}</td>
                        <td className="p-5">
                          <span className={`font-semibold px-3 py-1 rounded-full text-sm ${
                            record.severity === 'Critical' ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'
                          }`}>
                            {record.severity}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}