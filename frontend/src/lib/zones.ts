export interface MapZone {
  id: string;
  name: string;
  lat: number;
  lng: number;
  description: string;
  isHub?: boolean;
}

export const DHAKA_MAP_ZONES: MapZone[] = [
  {
    id: 'banani',
    name: 'Banani',
    lat: 23.7937,
    lng: 90.4066,
    description: 'Banani Road 11 Hub (Jashim & Bullet Base)',
    isHub: true,
  },
  {
    id: 'gulshan_1',
    name: 'Gulshan 1',
    lat: 23.7785,
    lng: 90.4182,
    description: 'Gulshan 1 Circle (Rafiq Drop-off)',
  },
  {
    id: 'gulshan_2',
    name: 'Gulshan 2',
    lat: 23.7916,
    lng: 90.4152,
    description: 'Gulshan 2 Circle & Diplomatic Zone',
  },
  {
    id: 'mohakhali',
    name: 'Mohakhali',
    lat: 23.7776,
    lng: 90.4005,
    description: 'Mohakhali Wireless Gate (Nusrat Drop-off)',
  },
  {
    id: 'farmgate',
    name: 'Farmgate',
    lat: 23.7570,
    lng: 90.3888,
    description: 'Farmgate Ananda Cinema Hub',
  },
  {
    id: 'dhanmondi',
    name: 'Dhanmondi',
    lat: 23.7461,
    lng: 90.3742,
    description: 'Dhanmondi 27 / Rapa Plaza',
  },
  {
    id: 'uttara',
    name: 'Uttara',
    lat: 23.8759,
    lng: 90.3795,
    description: 'Uttara House Building Hub',
  },
  {
    id: 'mirpur_10',
    name: 'Mirpur 10',
    lat: 23.8069,
    lng: 90.3687,
    description: 'Mirpur 10 Roundabout & Metro',
  },
  {
    id: 'bashundhara',
    name: 'Bashundhara',
    lat: 23.8191,
    lng: 90.4326,
    description: 'Bashundhara Main Gate / Jamuna Future Park',
  },
];
