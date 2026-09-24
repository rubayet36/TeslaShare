export interface DhakaZone {
  id: string;
  name: string;
  lat: number;
  lng: number;
  description: string;
  corridor: 'NORTH_SOUTH' | 'EAST_WEST' | 'AIRPORT_EXPRESS' | 'CENTRAL';
}

export const DHAKA_ZONES: DhakaZone[] = [
  {
    id: 'banani',
    name: 'Banani',
    lat: 23.7937,
    lng: 90.4066,
    description: 'Banani Road 11 Hub & Chairmanbari',
    corridor: 'CENTRAL',
  },
  {
    id: 'gulshan_1',
    name: 'Gulshan 1',
    lat: 23.7785,
    lng: 90.4182,
    description: 'Gulshan 1 Circle & Police Plaza',
    corridor: 'CENTRAL',
  },
  {
    id: 'gulshan_2',
    name: 'Gulshan 2',
    lat: 23.7916,
    lng: 90.4152,
    description: 'Gulshan 2 Circle & Diplomatic Zone',
    corridor: 'CENTRAL',
  },
  {
    id: 'mohakhali',
    name: 'Mohakhali',
    lat: 23.7776,
    lng: 90.4005,
    description: 'Mohakhali Wireless Gate & DOHS',
    corridor: 'CENTRAL',
  },
  {
    id: 'farmgate',
    name: 'Farmgate',
    lat: 23.7570,
    lng: 90.3888,
    description: 'Farmgate Ananda Cinema & Khamarbari Intersection',
    corridor: 'NORTH_SOUTH',
  },
  {
    id: 'dhanmondi',
    name: 'Dhanmondi',
    lat: 23.7461,
    lng: 90.3742,
    description: 'Dhanmondi 27 / Rapa Plaza Hub',
    corridor: 'NORTH_SOUTH',
  },
  {
    id: 'uttara',
    name: 'Uttara',
    lat: 23.8759,
    lng: 90.3795,
    description: 'Uttara Sector 3 & House Building Hub',
    corridor: 'AIRPORT_EXPRESS',
  },
  {
    id: 'mirpur_10',
    name: 'Mirpur 10',
    lat: 23.8069,
    lng: 90.3687,
    description: 'Mirpur 10 Roundabout & Metro Station',
    corridor: 'EAST_WEST',
  },
  {
    id: 'bashundhara',
    name: 'Bashundhara',
    lat: 23.8191,
    lng: 90.4326,
    description: 'Bashundhara R/A Main Gate & Jamuna Future Park',
    corridor: 'AIRPORT_EXPRESS',
  },
];
