"use client";
import { useState, useEffect, useRef } from "react";
import { PlusCircle, History, LogOut, MapPin, Loader2, AlertTriangle, ShieldCheck } from "lucide-react";
import SymptomRecorder from "./components/SymptomRecorder";
import { createClient } from "@supabase/supabase-js";
import dynamic from "next/dynamic";
const DiseaseMap = dynamic(() => import("./components/DiseaseMap"), { ssr: false });
import { motion } from "framer-motion";

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
  const [selectedAnimal, setSelectedAnimal] = useState("")
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
      <div className="min-h-screen flex flex-col md:flex-row bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-950 animate-gradient">
        
        {/* LEFT SIDE: Livestock Care Video & Awareness */}
        <div className="hidden md:flex md:w-1/2 flex-col justify-center items-center p-12 bg-black/20 border-r border-white/10 backdrop-blur-sm">
          <div className="max-w-md text-center">
            
            {/* Looping Veterinary / Livestock Care Video */}
            <div className="w-72 h-48 mx-auto mb-6 rounded-3xl overflow-hidden border border-white/10 shadow-2xl relative">
              <video
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover"
                poster="https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?auto=format&fit=crop&w=600&q=80"
              >
                <source
                  src="https://assets.mixkit.co/videos/preview/mixkit-cows-in-a-field-pasture-42698-large.mp4"
                  type="video/mp4"
                />
              </video>
              <div className="absolute inset-0 bg-emerald-950/20 pointer-events-none" />
            </div>

            <h1 className="text-3xl font-extrabold text-white mb-4">
              Protecting Livestock, Empowering Farmers
            </h1>
            <p className="text-emerald-100/80 text-sm leading-relaxed">
              Stay aware of critical livestock diseases like Lumpy Skin Disease and FMD. Rapid AI-driven detection ensures healthier herds and secures farmer livelihoods.
            </p>
          </div>
        </div>

        {/* RIGHT SIDE: Login Card */}
        <div className="w-full md:w-1/2 flex items-center justify-center p-6">
          <div className="bg-white/10 backdrop-blur-xl p-8 rounded-3xl shadow-2xl max-w-md w-full border border-white/20 relative overflow-hidden">
            
            <h2 className="text-3xl font-extrabold text-white mb-8 text-center tracking-tight">Pashu Rakshak</h2>
            
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
                  required
                />
              </div>

              {loginError && <p className="text-red-400 text-xs text-center">{loginError}</p>}

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-bold py-3.5 rounded-xl shadow-lg hover:from-teal-600 hover:to-emerald-600 transition-all duration-300"
              >
                Access Dashboard
              </button>
            </form>

            {/* Demo Details Hint for Judges */}
            <div className="mt-6 pt-4 border-t border-white/10 text-xs text-emerald-200/70 text-center">
              <p className="font-semibold text-emerald-100 mb-1">Demo Details for SIH Judges:</p>
              <p>Email: vet@pashurakshak.gov.in</p>
              <p>Password: SIH2026</p>
            </div>

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
      // Determine severity for your database table
      let recordSeverity = 'Critical';
      if (details.condition === 'Healthy Animal') recordSeverity = 'None';
      if (details.condition === 'Unknown Condition') recordSeverity = 'Moderate';

      // Insert directly into your Supabase table
    const { error } = await supabase
      .from('disease_reports') 
      .insert([
        {
          disease: details.condition,
          severity: recordSeverity,
          confidence: details.confidence
        }
      ]);

      if (error) {
        console.error('Supabase insert error:', error.message);
      } else {
        console.log('Successfully saved alert to Supabase!');
      }
    } catch (error) {
      console.error('Failed to connect to Supabase:', error);
    }
  };

  // --- MAIN DASHBOARD (Logged In) ---
  return (
    <div className="min-h-screen flex bg-slate-950 text-slate-100">
      
      {/* 1. Left Sidebar */}
      <div className="w-64 bg-slate-900/80 border-r border-white/10 p-6 flex flex-col justify-between backdrop-blur-xl">
        <div>
          <h1 className="text-2xl font-extrabold text-emerald-400 mb-8 tracking-tight">
            Pashu Rakshak
          </h1>
          
          <nav className="space-y-3">
            <button
              onClick={() => setActiveTab("scan")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
                activeTab === "scan"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <PlusCircle className="w-5 h-5" />
              New AI Scan
            </button>

            <button
              onClick={() => setActiveTab("database")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
                activeTab === "database"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <History className="w-5 h-5" />
              Health Database
            </button>
          </nav>
        </div>

        {/* Logout Button */}
        <button
          onClick={() => setIsLoggedIn(false)}
          className="flex items-center gap-2 text-slate-400 hover:text-red-400 transition-colors p-2 text-sm font-semibold"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>

      {/* 2. Main Content Area */}
      <div className="flex-1 p-8 overflow-y-auto bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-950 animate-gradient">
        {activeTab === "scan" && (
          <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-500">
            
            
            {/* Header */}
            <div className="border-b border-white/10 pb-5">
              <h1 className="text-3xl font-extrabold text-white tracking-tight">Instant Disease Detection</h1>
              <p className="text-emerald-100/80 mt-2">Upload a photo or describe symptoms to run an AI diagnosis.</p>
            </div>

            {/* ---> PASTE THE NEW ANIMATED CATEGORY SELECTOR HERE (Line 387) <--- */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative p-6 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10 text-white shadow-xl overflow-hidden mt-6"
            >
              {/* Background Video Animation for the category card */}
              <div className="absolute inset-0 opacity-20 pointer-events-none mix-blend-screen">
                <video autoPlay loop muted playsInline className="w-full h-full object-cover">
                  <source src="https://assets.mixkit.co/videos/preview/mixkit-cows-in-a-field-pasture-42698-large.mp4" type="video/mp4" />
                </video>
              </div>
              
              <div className="relative z-10">
                <h3 className="font-bold text-lg mb-4 text-emerald-300">1. Select Animal Category</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {["🐄 Cow", "🐃 Buffalo", "🐕 Dog", "🐈 Cat"].map((animal) => (
                    <button 
                      key={animal}
                      type="button"
                      onClick={() => setSelectedAnimal(animal)}
                      className={`p-3 rounded-xl font-semibold transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg border ${
                        selectedAnimal === animal
                          ? "bg-emerald-500 border-emerald-400 text-white shadow-emerald-500/40"
                          : "bg-emerald-500/10 hover:bg-emerald-500/30 border-emerald-500/30 text-emerald-100"
                      }`}
                    >
                      {animal}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* 1. Record Symptoms Card */}
            <div className="w-full mt-6">
                <SymptomRecorder onRecordComplete={setSymptoms} />
            </div>

            

      {/* 2. Upload Photo Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="p-6 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 text-white shadow-xl transition-all duration-300 hover:-translate-y-1 hover:border-emerald-500/50 mt-6"
      >
        <h3 className="font-bold text-lg mb-4 text-emerald-300 flex items-center gap-2">
          <span>📸</span> Upload Photo to Auto-Analyze
        </h3>

        <div className="relative group cursor-pointer">
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="w-full text-sm text-slate-300 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-emerald-500/20 file:text-emerald-300 hover:file:bg-emerald-500/30 cursor-pointer"
          />
        </div>

        {image && (
          <>
            <div className="mt-6 rounded-xl overflow-hidden border border-white/20 shadow-sm relative">
              <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-md backdrop-blur-sm">Image Preview</div>
              <img ref={imageRef} src={image} alt="Preview" className="h-56 w-full object-cover" />
            </div>
            <button
              onClick={analyzeImage}
              disabled={loading}
              className="w-full mt-4 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white py-3 rounded-xl font-bold transition-all shadow-lg"
            >
              {loading ? "Analyzing Image..." : "Run AI Diagnosis"}
            </button>
          </>
        )}
      </motion.div>
    

        <div className="relative group cursor-pointer">
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
          />
        </div>
            {/* AI Alert Banner */}
{statusMessage && (
  <div className={`p-4 mt-6 rounded-xl text-sm font-semibold border ${alertActive ? 'bg-red-50 text-red-800 border-red-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200'}`}>
    {statusMessage}
  </div>
)}

{/* AI Diagnosis Details */}
      {diagnosis && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mt-6 p-6 rounded-2xl bg-white/10 backdrop-blur-md border border-teal-500/30 text-white shadow-xl space-y-4"
        >
          <h2 className="font-bold text-xl text-teal-300 border-b border-white/10 pb-3 flex items-center justify-between">
            <span>Diagnosis Result</span>
            <span className="text-sm font-semibold px-3 py-1 bg-teal-500/20 text-teal-300 rounded-full border border-teal-500/30">
              {diagnosis}
            </span>
          </h2>

          <div className="flex items-center justify-between text-slate-200">
            <p className="text-sm font-medium">Confidence Score:</p>
            <p className="text-lg font-bold text-emerald-400">{confidence}%</p>
          </div>

          {/* Progress bar visual for confidence */}
          <div className="w-full bg-slate-800/80 h-2.5 rounded-full overflow-hidden border border-white/10">
            <div
              className="bg-gradient-to-r from-teal-400 to-emerald-400 h-full rounded-full transition-all duration-700"
              style={{ width: `${confidence}%` }}
            />
          </div>
        </motion.div>
      )}
  </div>
)}

{/* Database Tab */}
        {/* Database Tab */}
        {activeTab === "database" && (
          <div className="max-w-5xl mx-auto space-y-6">
            <h1 className="text-3xl font-bold border-b pb-4">Animal Health Records</h1>
            {/* LIVE DISEASE SPREAD RADAR (FAKE UI) */}
            <div className="bg-white rounded-2xl shadow-sm border p-6 mb-6">
              <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center">
                <MapPin className="mr-2 h-5 w-5 text-red-500" />
                Live Outbreak Radar
              </h3>
              
              <div className="relative w-full h-72 bg-slate-100 rounded-xl overflow-hidden border border-slate-200">
                {/* Embedded Map Background */}
                <iframe
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  scrolling="no"
                  marginHeight={0}
                  marginWidth={0}
                  src="https://maps.google.com/maps?q=Rajasthan&t=&z=6&ie=UTF8&iwloc=&output=embed"
                  className="absolute inset-0 grayscale opacity-70"
                ></iframe>

                {/* Simulated GPS Outbreak Dots (Pulsing Animations) */}
                <div className="absolute top-[40%] left-[45%] flex items-center justify-center" title="Critical Outbreak">
                  <span className="absolute inline-flex h-5 w-5 animate-ping rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-red-600 border-2 border-white shadow-md"></span>
                </div>
                
                <div className="absolute top-[30%] left-[60%] flex items-center justify-center" title="Critical Outbreak">
                  <span className="absolute inline-flex h-5 w-5 animate-ping rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-red-600 border-2 border-white shadow-md"></span>
                </div>

                <div className="absolute top-[60%] left-[35%] flex items-center justify-center" title="Moderate Risk">
                  <span className="absolute inline-flex h-5 w-5 animate-ping rounded-full bg-orange-400 opacity-75"></span>
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-orange-500 border-2 border-white shadow-md"></span>
                </div>
              </div>

              {/* Map Legend */}
              <div className="flex gap-6 mt-4 text-sm font-semibold text-slate-600 justify-center">
                <span className="flex items-center">
                  <span className="h-3 w-3 rounded-full bg-red-600 mr-2 shadow-sm"></span> Critical Alert Zone
                </span>
                <span className="flex items-center">
                  <span className="h-3 w-3 rounded-full bg-orange-500 mr-2 shadow-sm"></span> Moderate Risk Zone
                </span>
              </div>
            </div>
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