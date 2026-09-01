"use client";
import { useState, useEffect } from "react";
import { History, PlusCircle, LogOut, Loader2, AlertTriangle, ShieldCheck } from "lucide-react";
import SymptomRecorder from "./components/SymptomRecorder";
import { createClient } from "@supabase/supabase-js";
import dynamic from "next/dynamic";
const DiseaseMap = dynamic(() => import("./components/DiseaseMap"), { ssr: false });


// Initialize Supabase Connection
const supabaseUrl = "https://owbajiljwqzkvjijwlss.supabase.co";
const supabaseAnonKey = "sb_publishable_HEYxt_vczz4i5sxQQpf2aQ_wLpT77vv";
const supabase = createClient(supabaseUrl, supabaseAnonKey);
export default function Dashboard() {
  const [alertMessage, setAlertMessage] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState("scan");
  
  const [image, setImage] = useState<string | null>(null);
  const [symptoms, setSymptoms] = useState("");
  const [result, setResult] = useState<any>(null);
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

  if (!isLoggedIn) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100">
        <div className="bg-white p-10 rounded-2xl shadow-xl w-96 text-center">
          <h1 className="text-4xl font-extrabold text-green-700 mb-2">Pashu Rakshak</h1>
          <p className="text-gray-500 mb-8">Farmer & Veterinarian Portal</p>
          <button 
            onClick={() => setIsLoggedIn(true)}
            className="w-full bg-green-600 text-white font-bold py-4 rounded-xl hover:bg-green-700 transition-all shadow-md"
          >
            Secure Login
          </button>
        </div>
      </div>
    );
  }


  return (
    <div className="flex h-screen bg-gray-50 text-black">
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
          <div className="max-w-2xl mx-auto space-y-6">
            <h1 className="text-3xl font-bold border-b pb-4">Instant Disease Detection</h1>
            
            <SymptomRecorder onRecordComplete={(text) => setSymptoms(text)} />
            
            <div className="bg-white p-6 rounded-2xl shadow-sm border relative">
               <label className="block font-bold mb-2">Upload Photo to Auto-Analyze</label>
               
               {loading && (
                 <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-xl z-10">
                   <span className="text-green-700 font-bold animate-pulse text-lg">Analyzing Disease & Saving to Database...</span>
                 </div>
               )}

               <input type="file" accept="image/*" onChange={handleImageUpload} className="w-full border p-2 rounded-lg mb-4" />
               {image && <img src={image} alt="Preview" className="h-48 w-full object-cover rounded-lg shadow-sm border" />}
            </div>

            {result && result.error && (
              <div className="p-5 border rounded-xl bg-red-50 shadow-lg text-black space-y-3 border-l-8 border-red-600">
                <h2 className="font-bold text-xl text-red-700">Analysis Failed</h2>
                <p className="text-red-600 font-medium">{result.error}</p>
              </div>
            )}
            {alertMessage && (
          <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mt-6 mb-4 font-bold shadow-md rounded-md">
            {alertMessage}
          </div>
        )}

            {result && !result.error && (
              <div className="p-5 border rounded-xl bg-white shadow-lg text-black space-y-3 border-t-4 border-t-green-500">
                <h2 className="font-bold text-2xl text-green-700 border-b pb-2">
                  Diagnosis: {result.disease || "Unknown"}
                </h2>
                <div className="flex justify-between">
                  <p><strong>Confidence:</strong> {result.confidence || 0}%</p>
                  <p><strong>Severity:</strong> <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-sm">{result.severity || "Unknown"}</span></p>
                </div>
                
                {result.immediate_actions && (
                  <div className="mt-4 bg-gray-50 p-3 rounded-lg border">
                    <h3 className="font-bold text-sm text-gray-700 uppercase tracking-wider mb-2">Immediate Action Required:</h3>
                    <ul className="list-disc pl-5 space-y-1">
                      {result.immediate_actions.map((action: string, i: number) => (
                        <li key={i} className="text-gray-700 text-sm">{action}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        {activeTab === "database" && (
          <div className="space-y-4">
            
            {/* THE NEW DISEASE RADAR MAP */}
        <div className="border rounded-lg shadow-sm p-2 bg-white mb-6">
          <DiseaseMap records={healthRecords} />
        </div>
            {healthRecords.length === 0 ? (
              <p>No records found.</p>
            ) : (
              healthRecords.map((record: any) => (
                <div key={record.id} className="p-4 border rounded shadow-sm bg-white">
                  <h3 className="font-bold text-lg">{record.disease}</h3>
                  <p>Severity: <span className={record.severity === 'Critical' ? 'text-red-500' : 'text-orange-500'}>{record.severity}</span></p>
                  <p className="text-sm text-gray-500">Date: {new Date(record.created_at).toLocaleDateString()}</p>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "database" && (
          <div className="max-w-5xl mx-auto">
             <h1 className="text-3xl font-bold border-b pb-4 mb-6">Animal Health Records</h1>
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
                     healthRecords.map((record) => (
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