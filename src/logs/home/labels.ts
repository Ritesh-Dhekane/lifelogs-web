// Labels and icons for the Home log.

import {
  Armchair,
  BadgeCheck,
  Bike,
  Car,
  CookingPot,
  FileText,
  Gem,
  GraduationCap,
  HeartPulse,
  House,
  IdCard,
  Laptop,
  Leaf,
  Package,
  PawPrint,
  Refrigerator,
  ScrollText,
  Shield,
  Shirt,
  Wrench,
  type LucideIcon,
} from 'lucide-react'

import type { CareGroup, ThingKind, VehicleLogKind, VehicleType } from '../../data/db'

export const THING_CATEGORIES: Record<
  ThingKind,
  { value: string; label: string; icon: LucideIcon }[]
> = {
  item: [
    { value: 'electronics', label: 'Electronics', icon: Laptop },
    { value: 'appliance', label: 'Appliance', icon: Refrigerator },
    { value: 'furniture', label: 'Furniture', icon: Armchair },
    { value: 'kitchen', label: 'Kitchen', icon: CookingPot },
    { value: 'tools', label: 'Tools', icon: Wrench },
    { value: 'clothing', label: 'Clothing', icon: Shirt },
    { value: 'valuables', label: 'Valuables', icon: Gem },
    { value: 'other', label: 'Other', icon: Package },
  ],
  document: [
    { value: 'id', label: 'ID & passport', icon: IdCard },
    { value: 'insurance', label: 'Insurance', icon: Shield },
    { value: 'licence', label: 'Licence & permit', icon: BadgeCheck },
    { value: 'vehicle', label: 'Vehicle papers', icon: Car },
    { value: 'agreement', label: 'Agreement & lease', icon: ScrollText },
    { value: 'health', label: 'Health', icon: HeartPulse },
    { value: 'education', label: 'Education', icon: GraduationCap },
    { value: 'other', label: 'Other', icon: FileText },
  ],
}

export function thingCategory(kind: ThingKind, value: string) {
  const list = THING_CATEGORIES[kind]
  return list.find((c) => c.value === value) ?? list[list.length - 1]!
}

export const VEHICLE_TYPES: { value: VehicleType; label: string; icon: LucideIcon }[] = [
  { value: 'car', label: 'Car', icon: Car },
  { value: 'bike', label: 'Motorbike', icon: Bike },
  { value: 'scooter', label: 'Scooter', icon: Bike },
  { value: 'other', label: 'Other', icon: Car },
]

export const VEHICLE_LOG_LABEL: Record<VehicleLogKind, string> = {
  fuel: 'Fuel',
  service: 'Service',
  odometer: 'Odometer',
}

export const CARE_GROUPS: { value: CareGroup; label: string; icon: LucideIcon }[] = [
  { value: 'plant', label: 'Plants', icon: Leaf },
  { value: 'pet', label: 'Pets', icon: PawPrint },
  { value: 'home', label: 'Home', icon: House },
]

export const REMIND_OPTIONS = [7, 14, 30, 60, 90, 180]
