import React from "react";
import TomTomMap from "../../components/TomTomMap";

export default function MapPage() {
  return (
    <div className="bg-white rounded-lg shadow p-4 h-full">
      <h2 className="text-2xl font-bold mb-4">Live Map</h2>

      <div className="h-[600px] w-full rounded-lg overflow-hidden">
        <TomTomMap apiKey={import.meta.env.VITE_TOMTOM_API_KEY} />
      </div>
    </div>
  );
}
