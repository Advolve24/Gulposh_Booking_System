// src/data/amenities.js
import {
  Wifi,
  PlugZap,
  Snowflake,
  Flame,
  Fan,
  BedDouble,
  Shirt,
  Users,
  WashingMachine,
  Settings,
  Bath,
  ShowerHead,
  Droplets,
  CookingPot,
  Refrigerator,
  Utensils,
  Coffee,
  Baby,
  Gamepad2,
  BookOpenText,
  Tv,
  Music2,
  Trees,
  Tent,
  PartyPopper,
  ParkingCircle,
  Car,
  PhoneCall,
  ShieldCheck,
  Camera,
  FireExtinguisher,
  Leaf,
  Briefcase,
  CigaretteOff,
  ChevronDown,
  ChevronUp
} from "lucide-react";

export const amenityCategories = [
  {
    id: "basics",
    label: "Basics",
    icon: PlugZap,
    items: [
      { id: "wifi", label: "Free Wi-Fi", icon: Wifi },
      { id: "power_backup", label: "Power backup / inverter", icon: PlugZap },
      { id: "ac", label: "Air conditioning", icon: Snowflake },
      { id: "heater", label: "Room heater", icon: Flame },
      { id: "fan", label: "Ceiling fan", icon: Fan },
    ],
  },

  {
    id: "bedroom",
    label: "Bedroom & Laundry",
    icon: BedDouble,
    items: [
      { id: "comfy_mattress", label: "Comfortable mattress", icon: BedDouble },
      { id: "fresh_linen", label: "Fresh bedsheets & pillows", icon: Shirt },
      { id: "wardrobe", label: "Wardrobe / closet", icon: Users },
      { id: "washing_machine", label: "Washing machine", icon: WashingMachine },
      { id: "iron_board", label: "Iron & ironing board", icon: Settings },
    ],
  },

  {
    id: "bathroom",
    label: "Bathroom",
    icon: Bath,
    items: [
      { id: "attached_bath", label: "Attached bathroom", icon: Bath },
      { id: "hot_water", label: "Hot water (geyser)", icon: ShowerHead },
      { id: "toiletries", label: "Basic toiletries", icon: Droplets },
      { id: "towels", label: "Fresh towels", icon: Droplets },
    ],
  },

  {
    id: "kitchen",
    label: "Kitchen & Dining",
    icon: CookingPot,
    items: [
      { id: "kitchen_access", label: "Kitchen access", icon: CookingPot },
      { id: "refrigerator", label: "Refrigerator", icon: Refrigerator },
      { id: "utensils", label: "Utensils & cookware", icon: Utensils },
      { id: "dining_table", label: "Dining table", icon: Coffee },
      { id: "tea_coffee", label: "Tea / coffee setup", icon: Coffee },
    ],
  },

  {
    id: "family",
    label: "Family & Kids",
    icon: Baby,
    items: [
      { id: "extra_mattress", label: "Extra mattress", icon: BedDouble },
      { id: "baby_amenities", label: "Baby cot / high chair", icon: Baby },
      { id: "indoor_games", label: "Indoor games", icon: Gamepad2 },
      { id: "books", label: "Books & magazines", icon: BookOpenText },
    ],
  },

  {
    id: "entertainment",
    label: "Entertainment",
    icon: Tv,
    items: [
      { id: "smart_tv", label: "Smart TV", icon: Tv },
      { id: "ott_apps", label: "OTT apps", icon: Tv },
      { id: "music_system", label: "Music system / speaker", icon: Music2 },
    ],
  },

  {
    id: "outdoor",
    label: "Outdoor & Nature",
    icon: Trees,
    items: [
      { id: "balcony", label: "Balcony / sit-out", icon: Tent },
      { id: "garden", label: "Garden / lawn", icon: Trees },
      { id: "bonfire", label: "Bonfire (on request)", icon: PartyPopper },
      { id: "view", label: "Scenic view", icon: Trees },
    ],
  },

  {
    id: "parking",
    label: "Parking & Transport",
    icon: Car,
    items: [
      { id: "free_parking", label: "Free onsite parking", icon: ParkingCircle },
      { id: "covered_parking", label: "Covered parking", icon: Car },
      { id: "pickup_drop", label: "Pickup / drop", icon: PhoneCall },
    ],
  },

  {
    id: "safety",
    label: "Safety & Security",
    icon: ShieldCheck,
    items: [
      { id: "cctv", label: "CCTV in common areas", icon: Camera },
      { id: "security", label: "24x7 security", icon: ShieldCheck },
      { id: "first_aid", label: "First aid kit", icon: ShieldCheck },
      { id: "fire_ext", label: "Fire extinguisher", icon: FireExtinguisher },
    ],
  },

  {
    id: "eco_pets",
    label: "Pets & Eco",
    icon: Leaf,
    items: [
      { id: "pet_friendly", label: "Pet friendly", icon: Users },
      { id: "no_plastic", label: "Low plastic / eco-friendly", icon: Leaf },
    ],
  },

  {
    id: "work",
    label: "Work & Business",
    icon: Briefcase,
    items: [
      { id: "highspeed_wifi", label: "High-speed Wi-Fi", icon: Wifi },
      { id: "work_desk", label: "Work desk & chair", icon: Briefcase },
      { id: "backup_for_work", label: "Power backup for work", icon: PlugZap },
    ],
  },

  {
    id: "rules",
    label: "House Rules",
    icon: CigaretteOff,
    items: [
      { id: "no_smoking", label: "No smoking", icon: CigaretteOff },
      { id: "party_allowed", label: "Parties allowed (with conditions)", icon: PartyPopper },
      { id: "noise_limits", label: "Noise limits", icon: Music2 },
    ],
  },
];
