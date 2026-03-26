export interface MunicipalityCoord {
  lat: number;
  lng: number;
  region: string;
}

export const MUNICIPALITY_COORDS: Record<string, MunicipalityCoord> = {
  // Costa Cálida (Murcia)
  "Los Alcázares": { lat: 37.7431, lng: -0.8544, region: "Costa Cálida" },
  "Torre-Pacheco": { lat: 37.7432, lng: -0.9531, region: "Costa Cálida" },
  "San Javier": { lat: 37.8074, lng: -0.8374, region: "Costa Cálida" },
  "Santiago de la Ribera": { lat: 37.7975, lng: -0.8122, region: "Costa Cálida" },
  "La Manga del Mar Menor": { lat: 37.6420, lng: -0.7152, region: "Costa Cálida" },
  "San Pedro del Pinatar": { lat: 37.8357, lng: -0.7896, region: "Costa Cálida" },
  "Lo Pagán": { lat: 37.8292, lng: -0.7635, region: "Costa Cálida" },
  "Cartagena": { lat: 37.6257, lng: -0.9966, region: "Costa Cálida" },
  "La Unión": { lat: 37.6204, lng: -0.8744, region: "Costa Cálida" },
  "Mazarrón": { lat: 37.5989, lng: -1.3144, region: "Costa Cálida" },
  "Puerto de Mazarrón": { lat: 37.5608, lng: -1.2609, region: "Costa Cálida" },
  "Águilas": { lat: 37.4065, lng: -1.5829, region: "Costa Cálida" },
  "Murcia": { lat: 37.9834, lng: -1.1280, region: "Costa Cálida" },
  "Lorca": { lat: 37.6772, lng: -1.7011, region: "Costa Cálida" },
  "Mar de Cristal": { lat: 37.6538, lng: -0.7422, region: "Costa Cálida" },
  "Cabo de Palos": { lat: 37.6341, lng: -0.6921, region: "Costa Cálida" },
  "Roldán": { lat: 37.7565, lng: -0.9277, region: "Costa Cálida" },
  "Balsicas": { lat: 37.7879, lng: -0.9196, region: "Costa Cálida" },
  "El Algar": { lat: 37.6604, lng: -0.8494, region: "Costa Cálida" },
  "Los Urrutias": { lat: 37.6893, lng: -0.8322, region: "Costa Cálida" },
  "Los Nietos": { lat: 37.6582, lng: -0.8108, region: "Costa Cálida" },
  
  // Costa Blanca Zuid (Alicante)
  "Torrevieja": { lat: 37.9787, lng: -0.6821, region: "Costa Blanca Zuid" },
  "Orihuela": { lat: 38.0849, lng: -0.9445, region: "Costa Blanca Zuid" },
  "Orihuela Costa": { lat: 37.9308, lng: -0.7436, region: "Costa Blanca Zuid" },
  "Pilar de la Horadada": { lat: 37.8651, lng: -0.7913, region: "Costa Blanca Zuid" },
  "Torre de la Horadada": { lat: 37.8656, lng: -0.7625, region: "Costa Blanca Zuid" },
  "Guardamar del Segura": { lat: 38.0881, lng: -0.6548, region: "Costa Blanca Zuid" },
  "Santa Pola": { lat: 38.1911, lng: -0.5567, region: "Costa Blanca Zuid" },
  "Alicante": { lat: 38.3452, lng: -0.4810, region: "Costa Blanca Zuid" },
  "Elche": { lat: 38.2622, lng: -0.7015, region: "Costa Blanca Zuid" },
  "Rojales": { lat: 38.0883, lng: -0.7241, region: "Costa Blanca Zuid" },
  "Ciudad Quesada": { lat: 38.0435, lng: -0.7291, region: "Costa Blanca Zuid" },
  "Algorfa": { lat: 38.0725, lng: -0.7713, region: "Costa Blanca Zuid" },
  "Benijófar": { lat: 38.0792, lng: -0.7349, region: "Costa Blanca Zuid" },
  "Daya Nueva": { lat: 38.1057, lng: -0.7776, region: "Costa Blanca Zuid" },
  "Daya Vieja": { lat: 38.1156, lng: -0.7584, region: "Costa Blanca Zuid" },
  "San Miguel de Salinas": { lat: 37.9821, lng: -0.7887, region: "Costa Blanca Zuid" },
  "Los Montesinos": { lat: 38.0106, lng: -0.7439, region: "Costa Blanca Zuid" },
  "San Fulgencio": { lat: 38.1115, lng: -0.6508, region: "Costa Blanca Zuid" },
  "Catral": { lat: 38.1600, lng: -0.8014, region: "Costa Blanca Zuid" },
  "Dolores": { lat: 38.1403, lng: -0.7667, region: "Costa Blanca Zuid" },
  "Almoradí": { lat: 38.1089, lng: -0.7906, region: "Costa Blanca Zuid" },
  "Bigastro": { lat: 38.0631, lng: -0.8931, region: "Costa Blanca Zuid" },
  "La Mata": { lat: 37.9976, lng: -0.6650, region: "Costa Blanca Zuid" },
  "Punta Prima": { lat: 37.9481, lng: -0.7215, region: "Costa Blanca Zuid" },
  "Campoamor": { lat: 37.8941, lng: -0.7535, region: "Costa Blanca Zuid" },
  "Mil Palmeras": { lat: 37.8702, lng: -0.7638, region: "Costa Blanca Zuid" },
  "Villamartín": { lat: 37.9401, lng: -0.7601, region: "Costa Blanca Zuid" },
  "Playa Flamenca": { lat: 37.9249, lng: -0.7391, region: "Costa Blanca Zuid" },
  "La Zenia": { lat: 37.9325, lng: -0.7336, region: "Costa Blanca Zuid" },
  "Cabo Roig": { lat: 37.9119, lng: -0.7283, region: "Costa Blanca Zuid" },
};

export const REGIONS = ["Costa Cálida", "Costa Blanca Zuid"] as const;
export type Region = typeof REGIONS[number];

export function getMunicipalitiesByRegion(region: Region): string[] {
  return Object.entries(MUNICIPALITY_COORDS)
    .filter(([_, coord]) => coord.region === region)
    .map(([name]) => name)
    .sort();
}
