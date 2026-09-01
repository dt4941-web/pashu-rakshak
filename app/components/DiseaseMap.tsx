"use client";
import { useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

// 1. Generate realistic fake outbreak data clustered in the region
const fakeOutbreaks = [
  { id: "fake1", disease: "Lumpy Skin Disease (LSD)", severity: "Critical", latitude: 26.9124, longitude: 75.7873, category: "Livestock" },
  { id: "fake2", disease: "Foot and Mouth Disease", severity: "High", latitude: 26.8200, longitude: 75.6500, category: "Livestock" },
  { id: "fake3", disease: "Rabies", severity: "Critical", latitude: 27.0500, longitude: 75.9000, category: "Pets" },
  { id: "fake4", disease: "Lumpy Skin Disease (LSD)", severity: "Moderate", latitude: 26.7500, longitude: 75.8500, category: "Livestock" },
  { id: "fake5", disease: "Avian Influenza", severity: "High", latitude: 26.9500, longitude: 75.7000, category: "Livestock" },
];

export default function DiseaseMap({ records }: { records: any[] }) {
  // State for the active filter button
  const [filter, setFilter] = useState("All");

  // 2. Combine real records from your Supabase database with the fake data
  const allData = [
    ...fakeOutbreaks,
    ...records.filter(r => r.latitude && r.longitude).map(r => ({
      id: r.id,
      disease: r.disease,
      severity: r.severity,
      latitude: r.latitude,
      longitude: r.longitude,
      category: "Livestock", // We assume app scans are livestock by default
      isRealScan: true
    }))
  ];

  // 3. Apply the selected filter
  const filteredData = allData.filter(item => {
    if (filter === "All") return true;
    if (filter === "Livestock") return item.category === "Livestock";
    if (filter === "Pets") return item.category === "Pets";
    if (filter === "LSD") return item.disease.includes("LSD") || item.disease.includes("Lumpy");
    if (filter === "Rabies") return item.disease.includes("Rabies");
    return true;
  });

  // 4. Set map center to focus on the regional cluster
  const mapCenter: [number, number] = [26.9124, 75.7873];

  return (
    <div className="w-full">
      
      {/* UI: Title and Filter Buttons */}
      <div className="mb-4">
        <h3 className="text-xl font-bold text-teal-900">Regional Heatmap</h3>
        <p className="text-sm text-teal-600 mb-3">Live outbreak clusters in your district</p>
        
        <div className="flex flex-wrap gap-2">
          {["All", "Livestock", "Pets", "LSD", "Rabies"].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1 rounded-full text-sm font-medium border transition-colors ${
                filter === f 
                  ? "bg-teal-600 text-white border-teal-600" 
                  : "bg-white text-teal-700 border-teal-300 hover:bg-teal-50"
              }`}
            >
              {f === "All" ? "All Animals" : f === "Livestock" ? "Livestock Only" : f === "Pets" ? "Pets Only" : f}
            </button>
          ))}
        </div>
      </div>

      {/* UI: The Interactive Map */}
      <div style={{ height: "400px", width: "100%", zIndex: 0, borderRadius: "12px", overflow: "hidden", border: "1px solid #e2e8f0" }}>
        <MapContainer center={mapCenter} zoom={10} style={{ height: "100%", width: "100%" }}>
          {/* Using a lighter map tile to match the UI in your mockup image */}
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          
          {filteredData.map((record: any) => (
            <CircleMarker 
              key={record.id} 
              center={[record.latitude, record.longitude]} 
              radius={record.severity === 'Critical' ? 14 : 9} // Bigger dots for critical cases
              fillColor="#ef4444" // Tailwind red-500
              color="#b91c1c" // Tailwind red-700 border
              weight={1}
              fillOpacity={0.7}
            >
              <Popup>
                <strong>{record.disease}</strong> <br />
                Severity: <span className={record.severity === 'Critical' ? 'text-red-600' : 'text-orange-500'}>{record.severity}</span> <br />
                {record.isRealScan && <span className="text-green-600 font-bold text-xs mt-1 block">✓ Live Verified Scan</span>}
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>

    </div>
  );
}