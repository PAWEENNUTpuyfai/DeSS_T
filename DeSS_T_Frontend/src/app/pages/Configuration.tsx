import MapViewer from "../components/MapViewer";

export default function Configuration() {
  return (
    <main style={{ padding: 20 }}>
        <h2>Bus Stop Configuration</h2>

            <MapViewer
              minLat={18.78}
              maxLat={18.82}
              minLon={98.93}
              maxLon={98.97}
            />
    </main>
  );
}
